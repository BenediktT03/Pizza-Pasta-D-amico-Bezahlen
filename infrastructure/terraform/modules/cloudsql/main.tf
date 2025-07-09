# EATECH V3.0 - Cloud SQL Terraform Module
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
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "name" {
  description = "Cloud SQL instance name"
  type        = string
}

variable "database_version" {
  description = "Database version"
  type        = string
  default     = "POSTGRES_15"
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "tier" {
  description = "Machine tier"
  type        = string
  default     = "db-n1-standard-2"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 100
}

variable "disk_type" {
  description = "Disk type"
  type        = string
  default     = "PD_SSD"
}

variable "availability_type" {
  description = "Availability type (ZONAL or REGIONAL)"
  type        = string
  default     = "REGIONAL"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "database_flags" {
  description = "Database flags"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "insights_config" {
  description = "Query insights configuration"
  type = object({
    query_insights_enabled  = bool
    query_string_length     = number
    record_application_tags = bool
    record_client_address   = bool
  })
  default = {
    query_insights_enabled  = true
    query_string_length     = 1024
    record_application_tags = true
    record_client_address   = true
  }
}

variable "backup_configuration" {
  description = "Backup configuration"
  type = object({
    enabled                        = bool
    start_time                     = string
    location                       = string
    point_in_time_recovery_enabled = bool
    transaction_log_retention_days = number
    retained_backups               = number
    retention_unit                 = string
  })
  default = {
    enabled                        = true
    start_time                     = "03:00"
    location                       = null
    point_in_time_recovery_enabled = true
    transaction_log_retention_days = 7
    retained_backups               = 30
    retention_unit                 = "COUNT"
  }
}

variable "labels" {
  description = "Labels to apply to the instance"
  type        = map(string)
  default     = {}
}

# Random password for root user
resource "random_password" "root" {
  length  = 32
  special = true
}

# Cloud SQL Instance
resource "google_sql_database_instance" "main" {
  provider = google-beta
  
  name                = var.name
  database_version    = var.database_version
  region              = var.region
  deletion_protection = var.deletion_protection
  
  settings {
    tier              = var.tier
    disk_size         = var.disk_size
    disk_type         = var.disk_type
    availability_type = var.availability_type
    
    activation_policy = "ALWAYS"
    
    # Backup configuration
    backup_configuration {
      enabled                        = var.backup_configuration.enabled
      start_time                     = var.backup_configuration.start_time
      location                       = var.backup_configuration.location
      point_in_time_recovery_enabled = var.backup_configuration.point_in_time_recovery_enabled
      transaction_log_retention_days = var.backup_configuration.transaction_log_retention_days
      
      backup_retention_settings {
        retained_backups = var.backup_configuration.retained_backups
        retention_unit   = var.backup_configuration.retention_unit
      }
    }
    
    # IP configuration
    ip_configuration {
      ipv4_enabled                                  = true
      private_network                               = null # Set this if using private IP
      enable_private_path_for_google_cloud_services = true
      require_ssl                                   = true
      
      authorized_networks {
        name  = "allow-all"
        value = "0.0.0.0/0"
      }
    }
    
    # Database flags
    dynamic "database_flags" {
      for_each = var.database_flags
      content {
        name  = database_flags.value.name
        value = database_flags.value.value
      }
    }
    
    # Query insights
    insights_config {
      query_insights_enabled  = var.insights_config.query_insights_enabled
      query_string_length     = var.insights_config.query_string_length
      record_application_tags = var.insights_config.record_application_tags
      record_client_address   = var.insights_config.record_client_address
    }
    
    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 3 AM
      update_track = "stable"
    }
    
    # Performance and monitoring
    user_labels = var.labels
    
    # Data cache (for better performance)
    data_cache_config {
      data_cache_enabled = true
    }
    
    # Deny maintenance period
    deny_maintenance_period {
      start_date = "2024-12-23"
      end_date   = "2025-01-02"
      time       = "00:00:00"
    }
  }
  
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [settings[0].disk_size]
  }
}

# Root user password
resource "google_sql_user" "root" {
  name     = "postgres"
  instance = google_sql_database_instance.main.name
  password = random_password.root.result
}

# Create databases
locals {
  databases = ["eatech", "eatech_analytics", "eatech_reports"]
}

resource "google_sql_database" "databases" {
  for_each = toset(local.databases)
  
  name     = each.key
  instance = google_sql_database_instance.main.name
  
  lifecycle {
    prevent_destroy = true
  }
}

# Application user
resource "random_password" "app_user" {
  length  = 24
  special = true
}

resource "google_sql_user" "app_user" {
  name     = "eatech_app"
  instance = google_sql_database_instance.main.name
  password = random_password.app_user.result
}

# Read-only user for analytics
resource "random_password" "readonly_user" {
  length  = 24
  special = true
}

resource "google_sql_user" "readonly_user" {
  name     = "eatech_readonly"
  instance = google_sql_database_instance.main.name
  password = random_password.readonly_user.result
}

# SSL Certificates
resource "google_sql_ssl_cert" "client_cert" {
  common_name = "eatech-client"
  instance    = google_sql_database_instance.main.name
}

# Outputs
output "instance_name" {
  value = google_sql_database_instance.main.name
}

output "connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "public_ip_address" {
  value = google_sql_database_instance.main.public_ip_address
}

output "private_ip_address" {
  value = google_sql_database_instance.main.private_ip_address
}

output "root_password" {
  value     = random_password.root.result
  sensitive = true
}

output "app_user_password" {
  value     = random_password.app_user.result
  sensitive = true
}

output "readonly_user_password" {
  value     = random_password.readonly_user.result
  sensitive = true
}

output "databases" {
  value = [for db in google_sql_database.databases : db.name]
}

output "ssl_cert" {
  value = {
    cert        = google_sql_ssl_cert.client_cert.cert
    private_key = google_sql_ssl_cert.client_cert.private_key
    server_ca   = google_sql_ssl_cert.client_cert.server_ca_cert
  }
  sensitive = true
}

output "connection_string" {
  value     = "postgresql://eatech_app:${random_password.app_user.result}@${google_sql_database_instance.main.public_ip_address}:5432/eatech?sslmode=require"
  sensitive = true
}

output "proxy_connection_string" {
  value     = "postgresql://eatech_app:${random_password.app_user.result}@127.0.0.1:5432/eatech?sslmode=disable"
  sensitive = true
}
