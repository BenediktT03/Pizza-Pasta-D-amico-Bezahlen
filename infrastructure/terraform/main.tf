# EATECH V3.0 - Main Terraform Configuration
# Multi-cloud infrastructure with Swiss data residency
# Production-ready with high availability and security

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Backend configuration for state management
  backend "gcs" {
    bucket = "eatech-terraform-state"
    prefix = "production/infrastructure"
  }
}

# Provider Configurations

# Google Cloud Provider - Primary (Swiss Data Residency)
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone

  default_labels = {
    project     = "eatech"
    environment = "production"
    managed_by  = "terraform"
    team        = "platform"
    cost_center = "eatech-ops"
  }
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

# AWS Provider - Backup and Additional Services
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "eatech"
      Environment = "production"
      ManagedBy   = "terraform"
      Team        = "platform"
      CostCenter  = "eatech-ops"
    }
  }
}

# Cloudflare Provider - CDN and DNS
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Data Sources
data "google_client_config" "default" {}

data "google_container_engine_versions" "gke_version" {
  location       = var.gcp_region
  version_prefix = "1.28."
}

data "cloudflare_zones" "eatech" {
  filter {
    name = var.domain_name
  }
}

# Random Resources for Security
resource "random_password" "master_key" {
  length  = 32
  special = true
}

resource "random_password" "encryption_key" {
  length  = 64
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# Local Variables
locals {
  common_labels = {
    project     = "eatech"
    environment = "production"
    managed_by  = "terraform"
    version     = "3.0.0"
  }

  swiss_regions = [
    "europe-west6",  # Zurich (Primary)
    "europe-west3",  # Frankfurt (Secondary)
  ]

  domain_zones = {
    main   = var.domain_name
    app    = "app.${var.domain_name}"
    admin  = "admin.${var.domain_name}"
    master = "master.${var.domain_name}"
    api    = "api.${var.domain_name}"
    cdn    = "cdn.${var.domain_name}"
    ws     = "ws.${var.domain_name}"
  }
}

# Google Cloud Project Configuration
resource "google_project_service" "enabled_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudsql.googleapis.com",
    "redis.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "clouderrorreporting.googleapis.com",
    "cloudprofiler.googleapis.com",
    "secretmanager.googleapis.com",
    "certificatemanager.googleapis.com",
    "dns.googleapis.com",
    "storage.googleapis.com",
    "firestore.googleapis.com",
    "firebase.googleapis.com",
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudkms.googleapis.com",
    "iap.googleapis.com",
    "cloudscheduler.googleapis.com",
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "dataflow.googleapis.com",
    "aiplatform.googleapis.com",
  ])

  project = var.gcp_project_id
  service = each.value

  disable_dependent_services = true
}

# Google Kubernetes Engine (GKE) Cluster
resource "google_container_cluster" "eatech_cluster" {
  name     = "eatech-production"
  location = var.gcp_region

  # Swiss data residency
  resource_labels = merge(local.common_labels, {
    data_residency = "switzerland"
    compliance     = "gdpr-dsg"
  })

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.private.name

  # Enable private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"

    master_global_access_config {
      enabled = true
    }
  }

  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "k8s-pod-range"
    services_secondary_range_name = "k8s-service-range"
  }

  # Network policy
  network_policy {
    enabled = true
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }

  # Master auth
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }

    horizontal_pod_autoscaling {
      disabled = false
    }

    network_policy_config {
      disabled = false
    }

    cloudrun_config {
      disabled = false
    }

    gcp_filestore_csi_driver_config {
      enabled = true
    }

    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  # Cluster autoscaling
  cluster_autoscaling {
    enabled = true

    resource_limits {
      resource_type = "cpu"
      minimum       = 4
      maximum       = 100
    }

    resource_limits {
      resource_type = "memory"
      minimum       = 16
      maximum       = 400
    }

    auto_provisioning_defaults {
      min_cpu_platform = "Intel Skylake"

      management {
        auto_upgrade = true
        auto_repair  = true
      }

      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]
    }
  }

  # Maintenance policy
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T02:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  # Monitoring and logging
  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ]

    managed_prometheus {
      enabled = true
    }
  }

  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ]
  }

  # Binary authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Security posture
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_compute_network.vpc,
    google_compute_subnetwork.private,
  ]
}

# GKE Node Pools
resource "google_container_node_pool" "general" {
  name       = "general"
  cluster    = google_container_cluster.eatech_cluster.name
  location   = var.gcp_region
  node_count = 2

  # Autoscaling
  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  # Management
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Node configuration
  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"

    # Labels
    labels = merge(local.common_labels, {
      node_pool = "general"
    })

    # Service account
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Disk
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    # Metadata
    metadata = {
      disable-legacy-endpoints = "true"
    }

    # Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Shielded instance
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Network tags
    tags = ["gke-node", "eatech-production"]
  }

  # Upgrade settings
  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_service_account.gke_nodes,
    google_project_iam_member.gke_nodes,
  ]
}

# Admin Node Pool (for admin workloads)
resource "google_container_node_pool" "admin" {
  name       = "admin"
  cluster    = google_container_cluster.eatech_cluster.name
  location   = var.gcp_region
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    preemptible  = false
    machine_type = "e2-highmem-2"

    labels = merge(local.common_labels, {
      node_pool   = "admin"
      node_type   = "admin"
      criticality = "high"
    })

    # Taints for dedicated admin workloads
    taint {
      key    = "node-type"
      value  = "admin"
      effect = "NO_SCHEDULE"
    }

    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    disk_size_gb = 50
    disk_type    = "pd-ssd"

    metadata = {
      disable-legacy-endpoints = "true"
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    tags = ["gke-node", "gke-admin", "eatech-production"]
  }

  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_service_account.gke_nodes,
    google_project_iam_member.gke_nodes,
  ]
}

# Master Control Node Pool (maximum security)
resource "google_container_node_pool" "master" {
  name       = "master"
  cluster    = google_container_cluster.eatech_cluster.name
  location   = var.gcp_region
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 1  # Single node for master control
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    preemptible  = false
    machine_type = "e2-highmem-4"

    labels = merge(local.common_labels, {
      node_pool      = "master"
      node_type      = "master-control"
      security_level = "maximum"
      criticality    = "critical"
    })

    # Dedicated for master control
    taint {
      key    = "master-control"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    taint {
      key    = "security-zone"
      value  = "high"
      effect = "NO_SCHEDULE"
    }

    service_account = google_service_account.gke_master.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    disk_size_gb = 100
    disk_type    = "pd-ssd"

    metadata = {
      disable-legacy-endpoints = "true"
      security-cleared        = "true"
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    tags = ["gke-node", "gke-master", "eatech-production", "security-high"]
  }

  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_service_account.gke_master,
    google_project_iam_member.gke_master,
  ]
}

# Service Accounts
resource "google_service_account" "gke_nodes" {
  account_id   = "gke-nodes"
  display_name = "GKE Nodes Service Account"
  description  = "Service account for GKE nodes"
}

resource "google_service_account" "gke_master" {
  account_id   = "gke-master"
  display_name = "GKE Master Control Service Account"
  description  = "Service account for GKE master control nodes with enhanced permissions"
}

# IAM Bindings for Service Accounts
resource "google_project_iam_member" "gke_nodes" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/storage.objectViewer",
    "roles/artifactregistry.reader",
  ])

  project = var.gcp_project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_master" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/storage.objectViewer",
    "roles/artifactregistry.reader",
    "roles/secretmanager.secretAccessor",
    "roles/cloudkms.cryptoKeyEncrypterDecrypter",
  ])

  project = var.gcp_project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_master.email}"
}

# Firebase Project
resource "google_firebase_project" "eatech" {
  provider = google-beta
  project  = var.gcp_project_id

  depends_on = [
    google_project_service.enabled_apis
  ]
}

# Firestore Database
resource "google_firestore_database" "eatech" {
  provider = google-beta
  project  = var.gcp_project_id
  name     = "(default)"

  location_id = "eur3"  # Multi-region Europe (includes Zurich)
  type        = "FIRESTORE_NATIVE"

  # Point-in-time recovery
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"

  # Delete protection
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  depends_on = [
    google_firebase_project.eatech
  ]
}

# Outputs
output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.eatech_cluster.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.eatech_cluster.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.eatech_cluster.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.eatech.name
}

output "project_id" {
  description = "GCP project ID"
  value       = var.gcp_project_id
}

output "region" {
  description = "GCP region"
  value       = var.gcp_region
}
