# EATECH V3.0 - Terraform Variables
variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region for resources"
  type        = string
  default     = "europe-west6"
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be prod, staging, or dev."
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for eatech.ch"
  type        = string
}

# Network Configuration
variable "subnet_cidr" {
  description = "CIDR range for main subnet"
  type        = string
  default     = "10.0.0.0/20"
}

variable "pods_cidr" {
  description = "CIDR range for GKE pods"
  type        = string
  default     = "10.4.0.0/14"
}

variable "services_cidr" {
  description = "CIDR range for GKE services"
  type        = string
  default     = "10.8.0.0/20"
}

# GKE Configuration
variable "gke_node_pools" {
  description = "GKE node pool configurations"
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
  default = [
    {
      name               = "default-pool"
      machine_type       = "n2-standard-4"
      min_count          = 3
      max_count          = 10
      initial_node_count = 3
      disk_size_gb       = 100
      disk_type          = "pd-ssd"
      preemptible        = false
      labels = {
        workload = "general"
      }
      taints = []
    },
    {
      name               = "spot-pool"
      machine_type       = "n2-standard-2"
      min_count          = 0
      max_count          = 5
      initial_node_count = 1
      disk_size_gb       = 50
      disk_type          = "pd-standard"
      preemptible        = true
      labels = {
        workload = "batch"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  ]
}

# Database Configuration
variable "cloudsql_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-n1-standard-2"
}

variable "cloudsql_disk_size" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 100
}

variable "cloudsql_disk_type" {
  description = "Cloud SQL disk type"
  type        = string
  default     = "PD_SSD"
}

variable "cloudsql_availability_type" {
  description = "Cloud SQL availability type"
  type        = string
  default     = "REGIONAL"
}

variable "cloudsql_backup_start_time" {
  description = "Start time for Cloud SQL backups (HH:MM format)"
  type        = string
  default     = "03:00"
}

# Redis Configuration
variable "redis_tier" {
  description = "Redis instance tier"
  type        = string
  default     = "STANDARD_HA"
}

variable "redis_memory_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 5
}

# Monitoring Configuration
variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
}

variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Security Configuration
variable "allowed_ip_ranges" {
  description = "List of allowed IP ranges for admin access"
  type        = list(string)
  default     = []
}

variable "ssl_policy" {
  description = "SSL policy for load balancers"
  type        = string
  default     = "MODERN"
}

# Application Configuration
variable "app_domains" {
  description = "List of application domains"
  type        = list(string)
  default = [
    "eatech.ch",
    "www.eatech.ch",
    "api.eatech.ch",
    "admin.eatech.ch",
    "master.eatech.ch",
    "kitchen.eatech.ch"
  ]
}

variable "app_secrets" {
  description = "Application secrets to store in Secret Manager"
  type        = map(string)
  sensitive   = true
  default     = {}
}

# Cloudflare Configuration
variable "cloudflare_firewall_rules" {
  description = "Cloudflare firewall rules"
  type = list(object({
    description = string
    expression  = string
    action      = string
    priority    = number
  }))
  default = [
    {
      description = "Block countries under sanctions"
      expression  = "(ip.geoip.country in {\"CU\" \"IR\" \"KP\" \"SY\"})"
      action      = "block"
      priority    = 1
    },
    {
      description = "Challenge suspicious requests"
      expression  = "(cf.threat_score gt 30)"
      action      = "challenge"
      priority    = 2
    },
    {
      description = "Allow known bots"
      expression  = "(cf.bot_management.verified_bot)"
      action      = "allow"
      priority    = 3
    }
  ]
}

# Cost Optimization
variable "enable_preemptible_nodes" {
  description = "Enable preemptible nodes for cost savings"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "Cron schedule for backups"
  type        = string
  default     = "0 3 * * *"
}

# Feature Flags
variable "enable_voice_ordering" {
  description = "Enable voice ordering feature"
  type        = bool
  default     = true
}

variable "enable_ai_recommendations" {
  description = "Enable AI recommendations"
  type        = bool
  default     = true
}

variable "enable_multi_tenant" {
  description = "Enable multi-tenant features"
  type        = bool
  default     = true
}

# Tags
variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Locals for computed values
locals {
  full_environment_name = {
    prod    = "production"
    staging = "staging"
    dev     = "development"
  }
  
  domain_prefix = var.environment == "prod" ? "" : "${var.environment}."
  
  common_tags = merge(
    {
      Environment = local.full_environment_name[var.environment]
      Project     = "eatech"
      ManagedBy   = "terraform"
      CostCenter  = "engineering"
    },
    var.tags
  )
}
