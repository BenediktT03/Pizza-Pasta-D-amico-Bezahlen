# EATECH V3.0 - VPC Network Configuration
# Secure networking with Swiss data residency
# Multi-tier architecture with private clusters

# ========== VPC NETWORK ==========

resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
  mtu                    = 1460

  description = "EATECH production VPC network with Swiss data residency"

  project = var.gcp_project_id

  depends_on = [
    google_project_service.enabled_apis
  ]
}

# ========== PUBLIC SUBNET ==========
# For load balancers and NAT gateways

resource "google_compute_subnetwork" "public" {
  name          = "${var.project_name}-public-subnet"
  ip_cidr_range = var.public_subnet_cidrs[0]
  region        = var.gcp_region
  network       = google_compute_network.vpc.name

  description = "Public subnet for load balancers and external access"

  # Secondary IP ranges for services
  secondary_ip_range {
    range_name    = "public-services-range"
    ip_cidr_range = "10.1.0.0/16"
  }

  # Enable private Google access
  private_ip_google_access = true

  # Enable flow logs for security monitoring
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }

  project = var.gcp_project_id
}

# ========== PRIVATE SUBNET ==========
# For application workloads and Kubernetes nodes

resource "google_compute_subnetwork" "private" {
  name          = "${var.project_name}-private-subnet"
  ip_cidr_range = var.private_subnet_cidrs[0]
  region        = var.gcp_region
  network       = google_compute_network.vpc.name

  description = "Private subnet for application workloads and Kubernetes nodes"

  # Secondary IP ranges for Kubernetes
  secondary_ip_range {
    range_name    = "k8s-pod-range"
    ip_cidr_range = "10.10.0.0/14"  # Large range for pods
  }

  secondary_ip_range {
    range_name    = "k8s-service-range"
    ip_cidr_range = "10.20.0.0/16"  # Range for services
  }

  # Enable private Google access for API calls
  private_ip_google_access = true

  # Enhanced flow logs for private subnet
  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 1.0  # Full sampling for security
    metadata            = "INCLUDE_ALL_METADATA"
    metadata_fields     = [
      "src_instance",
      "dst_instance",
      "src_vpc",
      "dst_vpc",
      "src_gke_details",
      "dst_gke_details"
    ]
  }

  project = var.gcp_project_id
}

# ========== DATABASE SUBNET ==========
# For managed databases and data services

resource "google_compute_subnetwork" "database" {
  name          = "${var.project_name}-database-subnet"
  ip_cidr_range = var.database_subnet_cidrs[0]
  region        = var.gcp_region
  network       = google_compute_network.vpc.name

  description = "Database subnet for managed databases and data services"

  # Enable private Google access
  private_ip_google_access = true

  # Database-specific flow logs
  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 1.0
    metadata            = "INCLUDE_ALL_METADATA"
  }

  project = var.gcp_project_id
}

# ========== GLOBAL IP ADDRESS ==========
# For load balancer

resource "google_compute_global_address" "default" {
  name         = "${var.project_name}-global-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"

  description = "Global IP address for EATECH load balancer"

  project = var.gcp_project_id
}

# Reserve additional IPs for different services
resource "google_compute_global_address" "admin" {
  name         = "${var.project_name}-admin-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"

  description = "Global IP address for EATECH admin interface"

  project = var.gcp_project_id
}

resource "google_compute_global_address" "master" {
  name         = "${var.project_name}-master-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"

  description = "Global IP address for EATECH master control"

  project = var.gcp_project_id
}

# ========== PRIVATE SERVICE ACCESS ==========
# For managed services like Cloud SQL

resource "google_compute_global_address" "private_service_access" {
  name          = "${var.project_name}-private-service-access"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.vpc.id

  description = "Private service access for managed databases"

  project = var.gcp_project_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_access.name]

  depends_on = [google_compute_global_address.private_service_access]
}

# ========== CLOUD ROUTER ==========
# For NAT gateway

resource "google_compute_router" "router" {
  name    = "${var.project_name}-router"
  region  = var.gcp_region
  network = google_compute_network.vpc.id

  description = "Cloud Router for NAT gateway"

  bgp {
    asn = 64514
  }

  project = var.gcp_project_id
}

# ========== NAT GATEWAY ==========
# For outbound internet access from private subnets

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_name}-nat"
  router                            = google_compute_router.router.name
  region                            = var.gcp_region
  nat_ip_allocate_option            = "MANUAL_ONLY"
  nat_ips                           = [google_compute_address.nat.self_link]
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Enable logging for NAT
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }

  # Minimum ports per VM
  min_ports_per_vm = 64

  # UDP idle timeout
  udp_idle_timeout_sec = 30

  # ICMP idle timeout
  icmp_idle_timeout_sec = 30

  # TCP established timeout
  tcp_established_idle_timeout_sec = 1200

  # TCP transitory timeout
  tcp_transitory_idle_timeout_sec = 30

  project = var.gcp_project_id
}

# Static IP for NAT gateway
resource "google_compute_address" "nat" {
  name         = "${var.project_name}-nat-ip"
  address_type = "EXTERNAL"
  region       = var.gcp_region

  description = "Static IP for NAT gateway"

  project = var.gcp_project_id
}

# ========== PRIVATE DNS ZONE ==========
# For internal service discovery

resource "google_dns_managed_zone" "private" {
  name     = "${var.project_name}-private-zone"
  dns_name = "${var.project_name}.internal."

  description = "Private DNS zone for internal service discovery"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }

  # Enable DNSSEC
  dnssec_config {
    state         = "on"
    non_existence = "nsec3"
  }

  project = var.gcp_project_id
}

# DNS records for internal services
resource "google_dns_record_set" "kubernetes_api" {
  name = "kubernetes.${google_dns_managed_zone.private.dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.private.name

  rrdatas = ["10.0.0.1"]  # Will be updated with actual K8s API server IP

  project = var.gcp_project_id
}

resource "google_dns_record_set" "postgres" {
  name = "postgres.${google_dns_managed_zone.private.dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.private.name

  rrdatas = [google_sql_database_instance.postgres.private_ip_address]

  project = var.gcp_project_id
}

resource "google_dns_record_set" "redis" {
  name = "redis.${google_dns_managed_zone.private.dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.private.name

  rrdatas = [google_redis_instance.cache.host]

  project = var.gcp_project_id
}

# ========== NETWORK PEERING ==========
# For multi-region setup

resource "google_compute_network_peering" "secondary_region" {
  count = var.gcp_secondary_region != var.gcp_region ? 1 : 0

  name         = "${var.project_name}-peering-secondary"
  network      = google_compute_network.vpc.self_link
  peer_network = google_compute_network.vpc_secondary[0].self_link

  auto_create_routes = true

  depends_on = [
    google_compute_network.vpc,
    google_compute_network.vpc_secondary
  ]
}

# Secondary region VPC (optional)
resource "google_compute_network" "vpc_secondary" {
  count = var.gcp_secondary_region != var.gcp_region ? 1 : 0

  name                    = "${var.project_name}-vpc-secondary"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
  mtu                    = 1460

  description = "Secondary region VPC for disaster recovery"

  project = var.gcp_project_id
}

# ========== VPC SECURITY ==========

# Enable VPC Flow Logs at network level
resource "google_compute_network" "vpc_flow_logs" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"

  description = "VPC with comprehensive flow logging enabled"

  # This is handled by the subnetwork log_config above

  project = var.gcp_project_id
}

# ========== NETWORK TAGS ==========
# For organizing and securing network resources

locals {
  network_tags = {
    public_tier    = ["eatech-public", "load-balancer", "external-access"]
    private_tier   = ["eatech-private", "kubernetes", "application"]
    database_tier  = ["eatech-database", "managed-service", "private-only"]
    admin_tier     = ["eatech-admin", "high-security", "restricted"]
    master_tier    = ["eatech-master", "maximum-security", "isolated"]
  }
}

# ========== RESERVED IP RANGES ==========
# For future expansion and specific services

resource "google_compute_global_address" "reserved_ranges" {
  for_each = {
    monitoring = "10.30.0.0/16"
    logging    = "10.31.0.0/16"
    security   = "10.32.0.0/16"
    backup     = "10.33.0.0/16"
  }

  name          = "${var.project_name}-reserved-${each.key}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id

  description = "Reserved IP range for ${each.key} services"

  project = var.gcp_project_id
}

# ========== NETWORK MONITORING ==========

# Enable VPC Flow Logs export to BigQuery
resource "google_bigquery_dataset" "vpc_flow_logs" {
  dataset_id                  = "vpc_flow_logs"
  friendly_name              = "VPC Flow Logs"
  description                = "Dataset for VPC flow logs analysis"
  location                   = "EU"  # European location for data residency
  default_table_expiration_ms = 7776000000  # 90 days

  labels = var.resource_labels

  access {
    role          = "OWNER"
    user_by_email = "platform-team@eatech.ch"
  }

  access {
    role          = "READER"
    user_by_email = "security-team@eatech.ch"
  }

  project = var.gcp_project_id
}

# Log sink for VPC flow logs
resource "google_logging_project_sink" "vpc_flow_logs" {
  name        = "vpc-flow-logs-sink"
  destination = "bigquery.googleapis.com/projects/${var.gcp_project_id}/datasets/${google_bigquery_dataset.vpc_flow_logs.dataset_id}"

  filter = <<-EOT
    resource.type="gce_subnetwork"
    logName="projects/${var.gcp_project_id}/logs/compute.googleapis.com%2Fvpc_flows"
  EOT

  unique_writer_identity = true

  bigquery_options {
    use_partitioned_tables = true
  }

  project = var.gcp_project_id
}

# Grant BigQuery Data Editor role to the log sink
resource "google_project_iam_member" "log_sink_bigquery" {
  project = var.gcp_project_id
  role    = "roles/bigquery.dataEditor"
  member  = google_logging_project_sink.vpc_flow_logs.writer_identity
}

# ========== NETWORK SECURITY MONITORING ==========

# Packet Mirroring for security analysis (optional)
resource "google_compute_packet_mirroring" "security_mirror" {
  count = var.security_config.enable_network_policy ? 1 : 0

  name        = "${var.project_name}-security-mirror"
  description = "Packet mirroring for security analysis"
  region      = var.gcp_region
  network {
    url = google_compute_network.vpc.id
  }

  collector_ilb {
    url = google_compute_forwarding_rule.packet_mirror_collector[0].id
  }

  mirrored_resources {
    subnetworks {
      url = google_compute_subnetwork.private.id
    }

    tags = ["security-mirror"]
  }

  filter {
    ip_protocols = ["TCP", "UDP", "ICMP"]
    direction    = "BOTH"
  }

  project = var.gcp_project_id
}

# Internal load balancer for packet mirroring collector
resource "google_compute_forwarding_rule" "packet_mirror_collector" {
  count = var.security_config.enable_network_policy ? 1 : 0

  name                  = "${var.project_name}-mirror-collector"
  region                = var.gcp_region
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.packet_mirror[0].id
  all_ports            = true
  network              = google_compute_network.vpc.id
  subnetwork           = google_compute_subnetwork.private.id

  project = var.gcp_project_id
}

resource "google_compute_region_backend_service" "packet_mirror" {
  count = var.security_config.enable_network_policy ? 1 : 0

  name                  = "${var.project_name}-mirror-backend"
  region                = var.gcp_region
  load_balancing_scheme = "INTERNAL"

  health_checks = [google_compute_region_health_check.packet_mirror[0].id]

  project = var.gcp_project_id
}

resource "google_compute_region_health_check" "packet_mirror" {
  count = var.security_config.enable_network_policy ? 1 : 0

  name   = "${var.project_name}-mirror-health"
  region = var.gcp_region

  tcp_health_check {
    port = "22"
  }

  project = var.gcp_project_id
}

# ========== OUTPUTS ==========

output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc.name
}

output "vpc_network_id" {
  description = "VPC network ID"
  value       = google_compute_network.vpc.id
}

output "public_subnet_name" {
  description = "Public subnet name"
  value       = google_compute_subnetwork.public.name
}

output "private_subnet_name" {
  description = "Private subnet name"
  value       = google_compute_subnetwork.private.name
}

output "database_subnet_name" {
  description = "Database subnet name"
  value       = google_compute_subnetwork.database.name
}

output "global_ip_address" {
  description = "Global IP address for load balancer"
  value       = google_compute_global_address.default.address
}

output "nat_ip_address" {
  description = "NAT gateway IP address"
  value       = google_compute_address.nat.address
}

output "private_dns_zone" {
  description = "Private DNS zone name"
  value       = google_dns_managed_zone.private.dns_name
}
