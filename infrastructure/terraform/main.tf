# EATECH V3.0 - Terraform Main Configuration
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "gcs" {
    bucket = "eatech-terraform-state"
    prefix = "prod/state"
  }
}

# Provider Configuration
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Data Sources
data "google_client_config" "default" {}

# Local Variables
locals {
  common_labels = {
    environment  = var.environment
    project      = "eatech"
    managed_by   = "terraform"
    cost_center  = "engineering"
    created_date = formatdate("YYYY-MM-DD", timestamp())
  }
  
  firebase_regions = {
    firestore = "europe-west6"
    functions = "europe-west6"
    storage   = "europe-west6"
  }
  
  gke_zones = [
    "${var.gcp_region}-a",
    "${var.gcp_region}-b",
    "${var.gcp_region}-c"
  ]
}

# Enable Required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "cloudrun.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "clouderrorreporting.googleapis.com",
    "secretmanager.googleapis.com",
    "iamcredentials.googleapis.com",
    "dns.googleapis.com",
    "certificatemanager.googleapis.com"
  ])
  
  service            = each.key
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "eatech_vpc" {
  name                            = "eatech-${var.environment}-vpc"
  auto_create_subnetworks         = false
  routing_mode                    = "REGIONAL"
  delete_default_routes_on_create = true
  
  depends_on = [google_project_service.required_apis]
}

# Subnets
resource "google_compute_subnetwork" "eatech_subnet" {
  name                     = "eatech-${var.environment}-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.gcp_region
  network                  = google_compute_network.eatech_vpc.id
  private_ip_google_access = true
  
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = var.pods_cidr
  }
  
  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = var.services_cidr
  }
  
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud NAT
resource "google_compute_router" "eatech_router" {
  name    = "eatech-${var.environment}-router"
  region  = var.gcp_region
  network = google_compute_network.eatech_vpc.id
}

resource "google_compute_router_nat" "eatech_nat" {
  name                               = "eatech-${var.environment}-nat"
  router                             = google_compute_router.eatech_router.name
  region                             = var.gcp_region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "eatech-${var.environment}-allow-internal"
  network = google_compute_network.eatech_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "icmp"
  }
  
  source_ranges = [
    var.subnet_cidr,
    var.pods_cidr,
    var.services_cidr
  ]
}

# GKE Cluster
module "gke" {
  source = "./modules/gke"
  
  project_id     = var.gcp_project_id
  cluster_name   = "eatech-${var.environment}"
  region         = var.gcp_region
  zones          = local.gke_zones
  network        = google_compute_network.eatech_vpc.name
  subnetwork     = google_compute_subnetwork.eatech_subnet.name
  
  node_pools = var.gke_node_pools
  
  cluster_labels = merge(local.common_labels, {
    component = "kubernetes"
  })
}

# Artifact Registry
resource "google_artifact_registry_repository" "eatech_docker" {
  location      = var.gcp_region
  repository_id = "eatech-${var.environment}"
  description   = "Docker repository for EATECH ${var.environment} environment"
  format        = "DOCKER"
  
  labels = local.common_labels
}

# Cloud SQL (PostgreSQL)
module "postgresql" {
  source = "./modules/cloudsql"
  
  project_id       = var.gcp_project_id
  name             = "eatech-${var.environment}-postgres"
  database_version = "POSTGRES_15"
  region           = var.gcp_region
  tier             = var.cloudsql_tier
  
  deletion_protection = var.environment == "prod" ? true : false
  
  database_flags = [
    {
      name  = "max_connections"
      value = "200"
    },
    {
      name  = "log_checkpoints"
      value = "on"
    }
  ]
  
  insights_config = {
    query_insights_enabled  = true
    query_string_length     = 1024
    record_application_tags = true
    record_client_address   = true
  }
  
  backup_configuration = {
    enabled                        = true
    start_time                     = "03:00"
    location                       = var.gcp_region
    point_in_time_recovery_enabled = true
    transaction_log_retention_days = 7
    retained_backups               = 30
    retention_unit                 = "COUNT"
  }
  
  labels = local.common_labels
}

# Memorystore (Redis)
resource "google_redis_instance" "eatech_cache" {
  name               = "eatech-${var.environment}-redis"
  tier               = var.redis_tier
  memory_size_gb     = var.redis_memory_gb
  region             = var.gcp_region
  redis_version      = "REDIS_7_0"
  display_name       = "EATECH ${var.environment} Redis Cache"
  
  authorized_network = google_compute_network.eatech_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    notify-keyspace-events = "Ex"
  }
  
  labels = local.common_labels
}

# Firebase Project
module "firebase" {
  source = "./modules/firebase"
  
  project_id   = var.gcp_project_id
  environment  = var.environment
  regions      = local.firebase_regions
  
  firestore_settings = {
    delete_protection_state = var.environment == "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
    location_id             = local.firebase_regions.firestore
  }
  
  auth_settings = {
    enable_email_password   = true
    enable_phone_auth       = true
    enable_google_auth      = true
    enable_anonymous_auth   = true
    allowed_domains         = ["eatech.ch", "*.eatech.ch"]
  }
  
  storage_buckets = [
    {
      name          = "${var.gcp_project_id}.appspot.com"
      location      = local.firebase_regions.storage
      storage_class = "STANDARD"
      lifecycle_rules = [
        {
          action = {
            type = "Delete"
          }
          condition = {
            age = 90
            matches_prefix = ["temp/"]
          }
        }
      ]
    }
  ]
}

# Cloudflare Configuration
module "cloudflare" {
  source = "./modules/cloudflare"
  
  zone_id     = var.cloudflare_zone_id
  environment = var.environment
  
  dns_records = [
    {
      name    = var.environment == "prod" ? "@" : var.environment
      type    = "A"
      value   = module.gke.ingress_ip
      proxied = true
    },
    {
      name    = var.environment == "prod" ? "www" : "www.${var.environment}"
      type    = "CNAME"
      value   = var.environment == "prod" ? "eatech.ch" : "${var.environment}.eatech.ch"
      proxied = true
    },
    {
      name    = var.environment == "prod" ? "api" : "api.${var.environment}"
      type    = "A"
      value   = module.gke.ingress_ip
      proxied = true
    },
    {
      name    = var.environment == "prod" ? "admin" : "admin.${var.environment}"
      type    = "A"
      value   = module.gke.ingress_ip
      proxied = true
    }
  ]
  
  page_rules = [
    {
      target = "${var.environment == "prod" ? "" : "${var.environment}."}eatech.ch/api/*"
      actions = {
        cache_level = "bypass"
        ssl         = "flexible"
      }
    }
  ]
  
  firewall_rules = var.cloudflare_firewall_rules
}

# Monitoring & Logging
resource "google_monitoring_notification_channel" "email" {
  display_name = "EATECH ${var.environment} Email Alerts"
  type         = "email"
  
  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "EATECH ${var.environment} - High Error Rate"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate above 5%"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"logging.googleapis.com/user/error_rate\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

# Secrets Management
resource "google_secret_manager_secret" "app_secrets" {
  for_each = var.app_secrets
  
  secret_id = each.key
  
  replication {
    automatic = true
  }
  
  labels = local.common_labels
}

resource "google_secret_manager_secret_version" "app_secrets" {
  for_each = var.app_secrets
  
  secret      = google_secret_manager_secret.app_secrets[each.key].id
  secret_data = each.value
}

# IAM Bindings
resource "google_project_iam_member" "gke_service_account_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader"
  ])
  
  project = var.gcp_project_id
  role    = each.key
  member  = "serviceAccount:${module.gke.service_account_email}"
}

# Outputs
output "gke_cluster_endpoint" {
  value       = module.gke.endpoint
  description = "GKE cluster endpoint"
  sensitive   = true
}

output "database_connection_name" {
  value       = module.postgresql.connection_name
  description = "Cloud SQL connection name"
}

output "redis_host" {
  value       = google_redis_instance.eatech_cache.host
  description = "Redis instance host"
}

output "artifact_registry_url" {
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/eatech-${var.environment}"
  description = "Artifact Registry URL"
}
