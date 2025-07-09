# EATECH V3.0 - GKE Terraform Module
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "zones" {
  description = "GCP zones for the cluster"
  type        = list(string)
}

variable "network" {
  description = "VPC network name"
  type        = string
}

variable "subnetwork" {
  description = "VPC subnetwork name"
  type        = string
}

variable "node_pools" {
  description = "Node pool configurations"
  type = list(object({
    name               = string
    machine_type       = string
    min_count          = number
    max_count          = number
    initial_node_count = number
    disk_size_gb       = number
    disk_type          = string
    preemptible        = bool
    labels             = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
}

variable "cluster_labels" {
  description = "Labels to apply to the cluster"
  type        = map(string)
  default     = {}
}

# Service Account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.cluster_name}-nodes"
  display_name = "${var.cluster_name} GKE Nodes"
  project      = var.project_id
}

# IAM roles for the service account
locals {
  node_service_account_roles = [
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/autoscaling.metricsWriter",
    "roles/artifactregistry.reader",
    "roles/storage.objectViewer"
  ]
}

resource "google_project_iam_member" "gke_node_roles" {
  for_each = toset(local.node_service_account_roles)
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  provider = google-beta
  
  name     = var.cluster_name
  location = var.region
  
  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Network configuration
  network    = var.network
  subnetwork = var.subnetwork
  
  # IP allocation policy for VPC-native cluster
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }
  
  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  
  # Security configurations
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
    
    master_global_access_config {
      enabled = true
    }
  }
  
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }
  
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }
  
  # Cluster features
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
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
    gcp_filestore_csi_driver_config {
      enabled = true
    }
    gcs_fuse_csi_driver_config {
      enabled = true
    }
  }
  
  # Enable network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }
  
  # Enable Binary Authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }
  
  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
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
      service_account = google_service_account.gke_nodes.email
      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]
      
      disk_size = 100
      disk_type = "pd-standard"
      
      shielded_instance_config {
        enable_secure_boot          = true
        enable_integrity_monitoring = true
      }
      
      management {
        auto_repair  = true
        auto_upgrade = true
      }
    }
  }
  
  # Release channel
  release_channel {
    channel = "REGULAR"
  }
  
  # Logging and monitoring
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]
  }
  
  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]
    
    managed_prometheus {
      enabled = true
    }
  }
  
  # Cost management
  cost_management_config {
    enabled = true
  }
  
  # Security
  security_posture_config {
    mode               = "ENTERPRISE"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }
  
  # Labels
  resource_labels = var.cluster_labels
  
  lifecycle {
    ignore_changes = [
      initial_node_count,
      node_config,
    ]
  }
}

# Node Pools
resource "google_container_node_pool" "pools" {
  for_each = { for pool in var.node_pools : pool.name => pool }
  
  provider = google-beta
  
  name       = each.value.name
  location   = var.region
  cluster    = google_container_cluster.primary.name
  
  initial_node_count = each.value.initial_node_count
  
  # Autoscaling configuration
  autoscaling {
    min_node_count  = each.value.min_count
    max_node_count  = each.value.max_count
    location_policy = "BALANCED"
  }
  
  # Management configuration
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  
  # Node configuration
  node_config {
    preemptible     = each.value.preemptible
    machine_type    = each.value.machine_type
    disk_size_gb    = each.value.disk_size_gb
    disk_type       = each.value.disk_type
    
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    # Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
    
    # Security
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    
    # Metadata
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    # Labels
    labels = merge(
      each.value.labels,
      {
        node_pool = each.value.name
        cluster   = var.cluster_name
      }
    )
    
    # Taints
    dynamic "taint" {
      for_each = each.value.taints
      content {
        key    = taint.value.key
        value  = taint.value.value
        effect = taint.value.effect
      }
    }
    
    # GKE Sandbox (gVisor) for additional security
    dynamic "sandbox_config" {
      for_each = each.value.name == "sandbox-pool" ? [1] : []
      content {
        sandbox_type = "gvisor"
      }
    }
  }
  
  # Upgrade settings
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
    strategy        = "SURGE"
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Static IP for Ingress
resource "google_compute_global_address" "ingress_ip" {
  name         = "${var.cluster_name}-ingress-ip"
  address_type = "EXTERNAL"
  project      = var.project_id
}

# Cloud Armor Security Policy
resource "google_compute_security_policy" "policy" {
  name    = "${var.cluster_name}-security-policy"
  project = var.project_id

  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default rule"
  }

  # Block specific countries (example)
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "origin.region_code == 'XX' || origin.region_code == 'YY'"
      }
    }
    description = "Block specific countries"
  }

  # Rate limiting
  rule {
    action   = "rate_based_ban"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
    description = "Rate limiting"
  }
}

# Configure kubectl provider
provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
}

data "google_client_config" "default" {}

# Create namespaces
resource "kubernetes_namespace" "environments" {
  for_each = toset(["production", "staging", "development"])
  
  metadata {
    name = "eatech-${each.key}"
    
    labels = {
      environment = each.key
      managed_by  = "terraform"
    }
  }
  
  depends_on = [google_container_cluster.primary]
}

# Storage Classes
resource "kubernetes_storage_class" "fast" {
  metadata {
    name = "fast"
  }
  
  storage_provisioner    = "kubernetes.io/gce-pd"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true
  volume_binding_mode    = "WaitForFirstConsumer"
  
  parameters = {
    type             = "pd-ssd"
    replication-type = "regional-pd"
  }
  
  depends_on = [google_container_cluster.primary]
}

# Outputs
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}

output "service_account_email" {
  value = google_service_account.gke_nodes.email
}

output "ingress_ip" {
  value = google_compute_global_address.ingress_ip.address
}

output "security_policy_link" {
  value = google_compute_security_policy.policy.self_link
}

output "monitoring_workspace_id" {
  value = "${var.project_id}-monitoring"
}

output "logging_bucket_name" {
  value = "${var.project_id}-gke-logs"
}
