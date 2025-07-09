# EATECH V3.0 - Terraform Outputs
output "project_id" {
  description = "GCP Project ID"
  value       = var.gcp_project_id
}

output "region" {
  description = "GCP region"
  value       = var.gcp_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# Network Outputs
output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.eatech_vpc.name
}

output "vpc_network_id" {
  description = "VPC network ID"
  value       = google_compute_network.eatech_vpc.id
}

output "subnet_name" {
  description = "Subnet name"
  value       = google_compute_subnetwork.eatech_subnet.name
}

output "subnet_cidr" {
  description = "Subnet CIDR range"
  value       = google_compute_subnetwork.eatech_subnet.ip_cidr_range
}

# GKE Outputs
output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = module.gke.cluster_name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = module.gke.endpoint
  sensitive   = true
}

output "gke_cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = module.gke.ca_certificate
  sensitive   = true
}

output "gke_service_account_email" {
  description = "GKE service account email"
  value       = module.gke.service_account_email
}

output "gke_ingress_ip" {
  description = "GKE ingress static IP address"
  value       = module.gke.ingress_ip
}

# Database Outputs
output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.postgresql.instance_name
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name for proxy"
  value       = module.postgresql.connection_name
}

output "cloudsql_public_ip" {
  description = "Cloud SQL public IP address"
  value       = module.postgresql.public_ip_address
  sensitive   = true
}

output "cloudsql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = module.postgresql.private_ip_address
  sensitive   = true
}

# Redis Outputs
output "redis_instance_name" {
  description = "Redis instance name"
  value       = google_redis_instance.eatech_cache.name
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.eatech_cache.host
}

output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.eatech_cache.port
}

output "redis_auth_string" {
  description = "Redis auth string"
  value       = google_redis_instance.eatech_cache.auth_string
  sensitive   = true
}

# Container Registry Outputs
output "artifact_registry_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.eatech_docker.id
}

output "artifact_registry_url" {
  description = "Artifact Registry URL for Docker images"
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.eatech_docker.repository_id}"
}

# Firebase Outputs
output "firebase_project_id" {
  description = "Firebase project ID"
  value       = module.firebase.project_id
}

output "firebase_web_app_id" {
  description = "Firebase web app ID"
  value       = module.firebase.web_app_id
}

output "firebase_auth_domain" {
  description = "Firebase auth domain"
  value       = module.firebase.auth_domain
}

output "firebase_storage_bucket" {
  description = "Firebase storage bucket"
  value       = module.firebase.storage_bucket
}

output "firebase_functions_url" {
  description = "Firebase Functions base URL"
  value       = module.firebase.functions_url
}

# Cloudflare Outputs
output "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  value       = var.cloudflare_zone_id
}

output "cloudflare_dns_records" {
  description = "Created Cloudflare DNS records"
  value       = module.cloudflare.dns_records
}

output "cloudflare_ssl_status" {
  description = "Cloudflare SSL status"
  value       = module.cloudflare.ssl_status
}

# Monitoring Outputs
output "monitoring_workspace_id" {
  description = "Google Cloud monitoring workspace ID"
  value       = module.gke.monitoring_workspace_id
}

output "logging_bucket_name" {
  description = "Cloud Logging bucket name"
  value       = module.gke.logging_bucket_name
}

output "alert_notification_channels" {
  description = "Alert notification channel IDs"
  value = {
    email = google_monitoring_notification_channel.email.id
  }
}

# Secret Manager Outputs
output "secret_ids" {
  description = "Secret Manager secret IDs"
  value       = { for k, v in google_secret_manager_secret.app_secrets : k => v.id }
}

# URLs and Endpoints
output "application_urls" {
  description = "Application URLs"
  value = {
    web     = "https://${var.environment == "prod" ? "" : "${var.environment}."}eatech.ch"
    api     = "https://${var.environment == "prod" ? "" : "${var.environment}."}api.eatech.ch"
    admin   = "https://${var.environment == "prod" ? "" : "${var.environment}."}admin.eatech.ch"
    master  = "https://${var.environment == "prod" ? "" : "${var.environment}."}master.eatech.ch"
    kitchen = "https://${var.environment == "prod" ? "" : "${var.environment}."}kitchen.eatech.ch"
  }
}

# Helper Commands Output
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "gcloud container clusters get-credentials ${module.gke.cluster_name} --region ${var.gcp_region} --project ${var.gcp_project_id}"
}

output "docker_registry_command" {
  description = "Command to configure Docker for Artifact Registry"
  value       = "gcloud auth configure-docker ${var.gcp_region}-docker.pkg.dev"
}

output "cloud_sql_proxy_command" {
  description = "Command to connect to Cloud SQL via proxy"
  value       = "cloud_sql_proxy -instances=${module.postgresql.connection_name}=tcp:5432"
}

# Summary Output
output "deployment_summary" {
  description = "Deployment summary"
  value = {
    environment = var.environment
    region      = var.gcp_region
    cluster     = module.gke.cluster_name
    database    = module.postgresql.instance_name
    redis       = google_redis_instance.eatech_cache.name
    urls        = {
      web     = "https://${var.environment == "prod" ? "" : "${var.environment}."}eatech.ch"
      admin   = "https://${var.environment == "prod" ? "" : "${var.environment}."}admin.eatech.ch"
    }
    monitoring = {
      logs    = "https://console.cloud.google.com/logs/query?project=${var.gcp_project_id}"
      metrics = "https://console.cloud.google.com/monitoring?project=${var.gcp_project_id}"
    }
  }
}

# Cost Estimation Output
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    note = "These are rough estimates only"
    gke = {
      cluster_management = "$72.00"
      node_pools         = "Varies based on usage and autoscaling"
    }
    database = {
      cloud_sql = "~$150-300 depending on tier and storage"
    }
    redis = {
      memory_store = "~$200 for 5GB HA instance"
    }
    networking = {
      load_balancer = "~$20 + bandwidth costs"
      nat_gateway   = "~$45 + data processing"
    }
    total_estimate = "~$500-800/month + variable costs"
  }
}
