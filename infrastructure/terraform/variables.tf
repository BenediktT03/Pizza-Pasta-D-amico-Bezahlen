# EATECH V3.0 - Terraform Variables
# Comprehensive variable definitions for multi-cloud infrastructure
# Swiss data residency and production-ready configuration

# ========== PROJECT INFORMATION ==========

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "eatech"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project_name))
    error_message = "Project name must start with a letter, contain only lowercase letters, numbers, and hyphens, and end with a letter or number."
  }
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "version" {
  description = "Application version"
  type        = string
  default     = "3.0.0"
}

# ========== GOOGLE CLOUD PLATFORM ==========

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = "eatech-prod"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.gcp_project_id))
    error_message = "GCP project ID must start with a letter, contain only lowercase letters, numbers, and hyphens, and end with a letter or number."
  }
}

variable "gcp_region" {
  description = "GCP region for Swiss data residency"
  type        = string
  default     = "europe-west6"  # Zurich

  validation {
    condition     = contains(["europe-west6", "europe-west3", "europe-west1"], var.gcp_region)
    error_message = "GCP region must be in Europe for data residency compliance."
  }
}

variable "gcp_zone" {
  description = "GCP zone within the region"
  type        = string
  default     = "europe-west6-a"
}

variable "gcp_secondary_region" {
  description = "Secondary GCP region for backup and disaster recovery"
  type        = string
  default     = "europe-west3"  # Frankfurt
}

variable "gcp_billing_account" {
  description = "GCP billing account ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "gcp_org_id" {
  description = "GCP organization ID"
  type        = string
  default     = ""
}

# ========== AMAZON WEB SERVICES ==========

variable "aws_region" {
  description = "AWS region for additional services"
  type        = string
  default     = "eu-central-1"  # Frankfurt

  validation {
    condition     = can(regex("^eu-", var.aws_region))
    error_message = "AWS region must be in Europe for data residency compliance."
  }
}

variable "aws_secondary_region" {
  description = "Secondary AWS region for multi-region setup"
  type        = string
  default     = "eu-west-1"  # Ireland
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  default     = ""
  sensitive   = true
}

# ========== CLOUDFLARE ==========

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for eatech.ch"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = ""
  sensitive   = true
}

# ========== DOMAIN AND DNS ==========

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "eatech.ch"

  validation {
    condition     = can(regex("^[a-z0-9-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid domain format."
  }
}

variable "subdomains" {
  description = "List of subdomains to create"
  type        = map(object({
    name        = string
    target      = string
    record_type = string
    ttl         = number
  }))
  default = {
    app = {
      name        = "app"
      target      = "app-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 300
    }
    admin = {
      name        = "admin"
      target      = "admin-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 300
    }
    master = {
      name        = "master"
      target      = "master-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 300
    }
    api = {
      name        = "api"
      target      = "api-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 300
    }
    cdn = {
      name        = "cdn"
      target      = "cdn-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 3600
    }
    ws = {
      name        = "ws"
      target      = "ws-lb.eatech.ch"
      record_type = "CNAME"
      ttl         = 300
    }
  }
}

# ========== NETWORKING ==========

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.100.0/24", "10.0.200.0/24"]
}

variable "allowed_ip_ranges" {
  description = "IP ranges allowed to access admin and master interfaces"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

# ========== KUBERNETES ==========

variable "k8s_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_pool_configs" {
  description = "Configuration for GKE node pools"
  type = map(object({
    machine_type   = string
    min_nodes      = number
    max_nodes      = number
    disk_size_gb   = number
    disk_type      = string
    preemptible    = bool
    node_locations = list(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    labels = map(string)
  }))
  default = {
    general = {
      machine_type   = "e2-standard-4"
      min_nodes      = 2
      max_nodes      = 10
      disk_size_gb   = 100
      disk_type      = "pd-ssd"
      preemptible    = false
      node_locations = ["europe-west6-a", "europe-west6-b"]
      taints         = []
      labels = {
        node_pool = "general"
      }
    }
    admin = {
      machine_type   = "e2-highmem-2"
      min_nodes      = 1
      max_nodes      = 3
      disk_size_gb   = 50
      disk_type      = "pd-ssd"
      preemptible    = false
      node_locations = ["europe-west6-a"]
      taints = [{
        key    = "node-type"
        value  = "admin"
        effect = "NO_SCHEDULE"
      }]
      labels = {
        node_pool = "admin"
        node_type = "admin"
      }
    }
    master = {
      machine_type   = "e2-highmem-4"
      min_nodes      = 1
      max_nodes      = 1
      disk_size_gb   = 100
      disk_type      = "pd-ssd"
      preemptible    = false
      node_locations = ["europe-west6-a"]
      taints = [
        {
          key    = "master-control"
          value  = "true"
          effect = "NO_SCHEDULE"
        },
        {
          key    = "security-zone"
          value  = "high"
          effect = "NO_SCHEDULE"
        }
      ]
      labels = {
        node_pool      = "master"
        node_type      = "master-control"
        security_level = "maximum"
      }
    }
  }
}

# ========== DATABASE ==========

variable "postgres_config" {
  description = "PostgreSQL configuration"
  type = object({
    version              = string
    tier                 = string
    disk_size_gb         = number
    disk_type            = string
    backup_enabled       = bool
    backup_start_time    = string
    maintenance_window   = object({
      day          = number
      hour         = number
      update_track = string
    })
    database_flags = map(string)
  })
  default = {
    version           = "POSTGRES_15"
    tier              = "db-custom-4-16384"  # 4 vCPU, 16GB RAM
    disk_size_gb      = 100
    disk_type         = "PD_SSD"
    backup_enabled    = true
    backup_start_time = "02:00"
    maintenance_window = {
      day          = 7  # Sunday
      hour         = 3  # 3 AM
      update_track = "stable"
    }
    database_flags = {
      "log_checkpoints"                 = "on"
      "log_connections"                 = "on"
      "log_disconnections"              = "on"
      "log_lock_waits"                  = "on"
      "log_min_duration_statement"      = "1000"
      "log_temp_files"                  = "0"
      "shared_preload_libraries"        = "pg_stat_statements"
    }
  }
}

variable "redis_config" {
  description = "Redis configuration"
  type = object({
    version          = string
    tier             = string
    memory_size_gb   = number
    replica_count    = number
    auth_enabled     = bool
    transit_encryption = bool
    maintenance_window = object({
      day          = string
      start_time   = object({
        hours   = number
        minutes = number
      })
    })
  })
  default = {
    version        = "REDIS_7_0"
    tier           = "STANDARD_HA"
    memory_size_gb = 4
    replica_count  = 1
    auth_enabled   = true
    transit_encryption = true
    maintenance_window = {
      day = "SUNDAY"
      start_time = {
        hours   = 3
        minutes = 0
      }
    }
  }
}

# ========== MONITORING ==========

variable "monitoring_config" {
  description = "Monitoring and observability configuration"
  type = object({
    enable_prometheus     = bool
    enable_grafana       = bool
    enable_loki          = bool
    enable_jaeger        = bool
    retention_days       = number
    alert_manager_config = object({
      slack_webhook_url  = string
      pagerduty_key     = string
      email_recipients  = list(string)
    })
  })
  default = {
    enable_prometheus = true
    enable_grafana   = true
    enable_loki      = true
    enable_jaeger    = true
    retention_days   = 90
    alert_manager_config = {
      slack_webhook_url = ""
      pagerduty_key    = ""
      email_recipients = ["alerts@eatech.ch"]
    }
  }
  sensitive = true
}

# ========== SECURITY ==========

variable "security_config" {
  description = "Security configuration"
  type = object({
    enable_binary_authorization = bool
    enable_pod_security_policy  = bool
    enable_network_policy       = bool
    enable_workload_identity    = bool
    master_authorized_networks  = list(object({
      cidr_block   = string
      display_name = string
    }))
  })
  default = {
    enable_binary_authorization = true
    enable_pod_security_policy  = true
    enable_network_policy       = true
    enable_workload_identity    = true
    master_authorized_networks = [
      {
        cidr_block   = "0.0.0.0/0"
        display_name = "All IPs (restrict in production)"
      }
    ]
  }
}

variable "ssl_config" {
  description = "SSL/TLS configuration"
  type = object({
    enable_ssl                = bool
    ssl_policy               = string
    minimum_tls_version      = string
    certificate_domains      = list(string)
    enable_http_redirect     = bool
  })
  default = {
    enable_ssl           = true
    ssl_policy          = "TLS_1_2"
    minimum_tls_version = "1.2"
    certificate_domains = [
      "eatech.ch",
      "*.eatech.ch"
    ]
    enable_http_redirect = true
  }
}

# ========== BACKUP AND DISASTER RECOVERY ==========

variable "backup_config" {
  description = "Backup and disaster recovery configuration"
  type = object({
    enable_automated_backups = bool
    backup_retention_days    = number
    cross_region_backup      = bool
    point_in_time_recovery   = bool
    backup_schedule          = string
    backup_location          = string
  })
  default = {
    enable_automated_backups = true
    backup_retention_days    = 30
    cross_region_backup      = true
    point_in_time_recovery   = true
    backup_schedule         = "0 2 * * *"  # Daily at 2 AM
    backup_location         = "eu"
  }
}

# ========== PERFORMANCE ==========

variable "performance_config" {
  description = "Performance optimization configuration"
  type = object({
    enable_cdn                = bool
    cdn_cache_ttl            = number
    enable_compression       = bool
    enable_http2             = bool
    enable_http3             = bool
    connection_timeout       = number
    request_timeout          = number
  })
  default = {
    enable_cdn         = true
    cdn_cache_ttl     = 3600
    enable_compression = true
    enable_http2       = true
    enable_http3       = true
    connection_timeout = 30
    request_timeout    = 60
  }
}

# ========== COST OPTIMIZATION ==========

variable "cost_config" {
  description = "Cost optimization configuration"
  type = object({
    enable_preemptible_nodes   = bool
    enable_cluster_autoscaling = bool
    enable_vertical_pod_autoscaling = bool
    resource_quotas = object({
      cpu_limit    = string
      memory_limit = string
      storage_limit = string
    })
  })
  default = {
    enable_preemptible_nodes = false  # Disabled for production
    enable_cluster_autoscaling = true
    enable_vertical_pod_autoscaling = true
    resource_quotas = {
      cpu_limit    = "100"
      memory_limit = "400Gi"
      storage_limit = "1Ti"
    }
  }
}

# ========== COMPLIANCE ==========

variable "compliance_config" {
  description = "Compliance and regulatory configuration"
  type = object({
    enable_audit_logging     = bool
    enable_access_logging    = bool
    data_residency_regions   = list(string)
    enable_encryption_at_rest = bool
    enable_encryption_in_transit = bool
    audit_log_retention_days = number
    gdpr_compliance          = bool
    dsg_compliance           = bool
  })
  default = {
    enable_audit_logging     = true
    enable_access_logging    = true
    data_residency_regions   = ["europe-west6", "europe-west3"]
    enable_encryption_at_rest = true
    enable_encryption_in_transit = true
    audit_log_retention_days = 2555  # 7 years for Swiss DSG
    gdpr_compliance          = true
    dsg_compliance           = true
  }
}

# ========== FEATURE FLAGS ==========

variable "feature_flags" {
  description = "Feature flags for enabling/disabling functionality"
  type = object({
    enable_ai_features      = bool
    enable_voice_commerce   = bool
    enable_emergency_mode   = bool
    enable_blockchain       = bool
    enable_edge_computing   = bool
    enable_analytics        = bool
    enable_ab_testing       = bool
    enable_real_time_sync   = bool
  })
  default = {
    enable_ai_features    = true
    enable_voice_commerce = true
    enable_emergency_mode = true
    enable_blockchain     = false
    enable_edge_computing = false
    enable_analytics      = true
    enable_ab_testing     = true
    enable_real_time_sync = true
  }
}

# ========== EXTERNAL SERVICES ==========

variable "external_services" {
  description = "External service configurations"
  type = object({
    stripe = object({
      enable = bool
      region = string
    })
    twilio = object({
      enable = bool
      region = string
    })
    sendgrid = object({
      enable = bool
      region = string
    })
    openai = object({
      enable = bool
      model  = string
    })
  })
  default = {
    stripe = {
      enable = true
      region = "eu"
    }
    twilio = {
      enable = true
      region = "dublin"
    }
    sendgrid = {
      enable = true
      region = "eu"
    }
    openai = {
      enable = true
      model  = "gpt-4-turbo"
    }
  }
}

# ========== TAGS AND LABELS ==========

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "eatech"
    Environment = "production"
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = "eatech-ops"
    Version     = "3.0.0"
    Compliance  = "gdpr-dsg"
    DataClass   = "confidential"
  }
}

variable "resource_labels" {
  description = "Resource labels for organization and billing"
  type        = map(string)
  default = {
    project     = "eatech"
    environment = "production"
    managed_by  = "terraform"
    team        = "platform"
    cost_center = "eatech-ops"
    version     = "3.0.0"
  }
}

# ========== SECRETS AND SENSITIVE DATA ==========

variable "secret_config" {
  description = "Secret management configuration"
  type = object({
    enable_secret_manager = bool
    secret_rotation_days  = number
    secret_locations      = list(string)
    kms_key_rotation_days = number
  })
  default = {
    enable_secret_manager = true
    secret_rotation_days  = 90
    secret_locations      = ["europe-west6", "europe-west3"]
    kms_key_rotation_days = 365
  }
}

# ========== MAINTENANCE ==========

variable "maintenance_config" {
  description = "Maintenance and update configuration"
  type = object({
    maintenance_window = object({
      day        = string
      start_time = string
      end_time   = string
    })
    auto_upgrade          = bool
    auto_repair           = bool
    surge_settings = object({
      max_surge       = number
      max_unavailable = number
    })
  })
  default = {
    maintenance_window = {
      day        = "SUNDAY"
      start_time = "02:00"
      end_time   = "06:00"
    }
    auto_upgrade = true
    auto_repair  = true
    surge_settings = {
      max_surge       = 1
      max_unavailable = 0
    }
  }
}
