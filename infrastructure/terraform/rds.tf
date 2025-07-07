# EATECH V3.0 - Database Configuration
# PostgreSQL and Redis with Swiss data residency
# High availability, backup, and security configurations

# ========== POSTGRESQL CONFIGURATION ==========

# PostgreSQL instance
resource "google_sql_database_instance" "postgres" {
  name             = "${var.project_name}-postgres"
  database_version = var.postgres_config.version
  region          = var.gcp_region

  deletion_protection = true

  settings {
    tier                        = var.postgres_config.tier
    availability_type          = "REGIONAL"  # High availability
    disk_size                  = var.postgres_config.disk_size_gb
    disk_type                  = var.postgres_config.disk_type
    disk_autoresize           = true
    disk_autoresize_limit     = 500

    # User labels for organization
    user_labels = merge(var.resource_labels, {
      database_type = "postgresql"
      purpose      = "production"
      data_class   = "confidential"
    })

    # Backup configuration
    backup_configuration {
      enabled                        = var.postgres_config.backup_enabled
      start_time                    = var.postgres_config.backup_start_time
      location                      = var.gcp_region
      point_in_time_recovery_enabled = var.backup_config.point_in_time_recovery
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = var.postgres_config.maintenance_window.day
      hour         = var.postgres_config.maintenance_window.hour
      update_track = var.postgres_config.maintenance_window.update_track
    }

    # Database flags for optimization and security
    dynamic "database_flags" {
      for_each = var.postgres_config.database_flags
      content {
        name  = database_flags.key
        value = database_flags.value
      }
    }

    # IP configuration for private access
    ip_configuration {
      ipv4_enabled    = false  # Disable public IP
      private_network = google_compute_network.vpc.id

      require_ssl = true

      # Authorized networks (for emergency access)
      dynamic "authorized_networks" {
        for_each = var.allowed_ip_ranges
        content {
          name  = "emergency-access-${authorized_networks.key}"
          value = authorized_networks.value
        }
      }
    }

    # Insights configuration for monitoring
    insights_config {
      query_insights_enabled  = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = true
    }

    # Password validation
    password_validation_policy {
      min_length                  = 12
      complexity                 = "COMPLEXITY_DEFAULT"
      reuse_interval            = 5
      disallow_username_substring = true
      enable_password_policy     = true
    }

    # Connector enforcement for IAM authentication
    connector_enforcement = "REQUIRED"

    # Data cache configuration
    data_cache_config {
      data_cache_enabled = true
    }
  }

  # Encryption at rest
  encryption_key_name = google_kms_crypto_key.database.id

  project = var.gcp_project_id

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_kms_crypto_key.database
  ]
}

# PostgreSQL databases
resource "google_sql_database" "main" {
  name     = "eatech_main"
  instance = google_sql_database_instance.postgres.name
  charset  = "UTF8"
  collation = "en_US.UTF8"

  project = var.gcp_project_id
}

resource "google_sql_database" "analytics" {
  name     = "eatech_analytics"
  instance = google_sql_database_instance.postgres.name
  charset  = "UTF8"
  collation = "en_US.UTF8"

  project = var.gcp_project_id
}

# PostgreSQL users
resource "google_sql_user" "app_user" {
  name     = "eatech_app"
  instance = google_sql_database_instance.postgres.name
  type     = "BUILT_IN"

  password = random_password.postgres_app_password.result

  project = var.gcp_project_id
}

resource "google_sql_user" "analytics_user" {
  name     = "eatech_analytics"
  instance = google_sql_database_instance.postgres.name
  type     = "BUILT_IN"

  password = random_password.postgres_analytics_password.result

  project = var.gcp_project_id
}

resource "google_sql_user" "readonly_user" {
  name     = "eatech_readonly"
  instance = google_sql_database_instance.postgres.name
  type     = "BUILT_IN"

  password = random_password.postgres_readonly_password.result

  project = var.gcp_project_id
}

# PostgreSQL passwords
resource "random_password" "postgres_app_password" {
  length  = 32
  special = true
}

resource "random_password" "postgres_analytics_password" {
  length  = 32
  special = true
}

resource "random_password" "postgres_readonly_password" {
  length  = 32
  special = true
}

# ========== REDIS CONFIGURATION ==========

# Redis instance for caching and sessions
resource "google_redis_instance" "cache" {
  name           = "${var.project_name}-redis"
  tier           = var.redis_config.tier
  memory_size_gb = var.redis_config.memory_size_gb
  region         = var.gcp_region

  location_id             = var.gcp_zone
  alternative_location_id = "${var.gcp_region}-b"  # For HA

  redis_version     = var.redis_config.version
  display_name     = "EATECH Production Redis"
  reserved_ip_range = "10.36.0.0/29"

  # Connect to VPC
  authorized_network = google_compute_network.vpc.id
  connect_mode      = "PRIVATE_SERVICE_ACCESS"

  # Security
  auth_enabled         = var.redis_config.auth_enabled
  transit_encryption_mode = var.redis_config.transit_encryption ? "SERVER_CLIENT" : "DISABLED"

  # Labels
  labels = merge(var.resource_labels, {
    database_type = "redis"
    purpose      = "cache-sessions"
    data_class   = "sensitive"
  })

  # Redis configuration
  redis_configs = {
    maxmemory-policy    = "allkeys-lru"
    timeout            = "300"
    tcp-keepalive      = "60"
    save               = "900 1 300 10 60 10000"
    notify-keyspace-events = "Ex"
  }

  # Maintenance policy
  maintenance_policy {
    weekly_maintenance_window {
      day = var.redis_config.maintenance_window.day
      start_time {
        hours   = var.redis_config.maintenance_window.start_time.hours
        minutes = var.redis_config.maintenance_window.start_time.minutes
      }
    }
  }

  # Customer managed encryption key
  customer_managed_key = google_kms_crypto_key.redis.id

  project = var.gcp_project_id

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_kms_crypto_key.redis
  ]
}

# Redis authentication string
resource "random_password" "redis_auth" {
  length  = 64
  special = false
}

# ========== BACKUP CONFIGURATION ==========

# Backup bucket for database exports
resource "google_storage_bucket" "database_backups" {
  name     = "${var.project_name}-database-backups-${random_id.bucket_suffix.hex}"
  location = var.gcp_region

  storage_class = "STANDARD"

  # Versioning for backup history
  versioning {
    enabled = true
  }

  # Lifecycle management
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Encryption
  encryption {
    default_kms_key_name = google_kms_crypto_key.backup.id
  }

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  # Labels
  labels = merge(var.resource_labels, {
    purpose = "database-backups"
    data_class = "confidential"
  })

  project = var.gcp_project_id
}

# Cross-region backup bucket
resource "google_storage_bucket" "database_backups_cross_region" {
  count = var.backup_config.cross_region_backup ? 1 : 0

  name     = "${var.project_name}-db-backups-cross-${random_id.bucket_suffix.hex}"
  location = var.gcp_secondary_region

  storage_class = "STANDARD"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 180  # Keep cross-region backups longer
    }
    action {
      type = "Delete"
    }
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.backup.id
  }

  uniform_bucket_level_access = true

  labels = merge(var.resource_labels, {
    purpose = "cross-region-backups"
    data_class = "confidential"
  })

  project = var.gcp_project_id
}

# ========== ENCRYPTION KEYS ==========

# KMS key ring
resource "google_kms_key_ring" "eatech" {
  name     = "${var.project_name}-keyring"
  location = var.gcp_region

  project = var.gcp_project_id
}

# Database encryption key
resource "google_kms_crypto_key" "database" {
  name     = "database-encryption-key"
  key_ring = google_kms_key_ring.eatech.id

  purpose          = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s"  # 90 days

  labels = var.resource_labels

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  project = var.gcp_project_id
}

# Redis encryption key
resource "google_kms_crypto_key" "redis" {
  name     = "redis-encryption-key"
  key_ring = google_kms_key_ring.eatech.id

  purpose          = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s"  # 90 days

  labels = var.resource_labels

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  project = var.gcp_project_id
}

# Backup encryption key
resource "google_kms_crypto_key" "backup" {
  name     = "backup-encryption-key"
  key_ring = google_kms_key_ring.eatech.id

  purpose          = "ENCRYPT_DECRYPT"
  rotation_period = "31536000s"  # 365 days

  labels = var.resource_labels

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  project = var.gcp_project_id
}

# ========== SECRET MANAGER ==========

# Database credentials in Secret Manager
resource "google_secret_manager_secret" "postgres_app_password" {
  secret_id = "postgres-app-password"

  labels = var.resource_labels

  replication {
    user_managed {
      replicas {
        location = var.gcp_region
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.database.id
        }
      }
      replicas {
        location = var.gcp_secondary_region
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.database.id
        }
      }
    }
  }

  project = var.gcp_project_id
}

resource "google_secret_manager_secret_version" "postgres_app_password" {
  secret      = google_secret_manager_secret.postgres_app_password.id
  secret_data = random_password.postgres_app_password.result
}

resource "google_secret_manager_secret" "redis_auth" {
  secret_id = "redis-auth-string"

  labels = var.resource_labels

  replication {
    user_managed {
      replicas {
        location = var.gcp_region
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.redis.id
        }
      }
    }
  }

  project = var.gcp_project_id
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = random_password.redis_auth.result
}

# ========== DATABASE MONITORING ==========

# PostgreSQL monitoring
resource "google_monitoring_alert_policy" "postgres_cpu" {
  display_name = "PostgreSQL High CPU Usage"
  combiner     = "OR"

  conditions {
    display_name = "PostgreSQL CPU usage above 80%"

    condition_threshold {
      filter         = "resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${var.gcp_project_id}:${google_sql_database_instance.postgres.name}\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
      duration       = "300s"
      comparison     = "COMPARISON_GREATER_THAN"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  project = var.gcp_project_id
}

resource "google_monitoring_alert_policy" "postgres_connections" {
  display_name = "PostgreSQL High Connection Count"
  combiner     = "OR"

  conditions {
    display_name = "PostgreSQL connection count above 80%"

    condition_threshold {
      filter         = "resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${var.gcp_project_id}:${google_sql_database_instance.postgres.name}\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
      duration       = "180s"
      comparison     = "COMPARISON_GREATER_THAN"
      threshold_value = 80

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  project = var.gcp_project_id
}

# Redis monitoring
resource "google_monitoring_alert_policy" "redis_memory" {
  display_name = "Redis High Memory Usage"
  combiner     = "OR"

  conditions {
    display_name = "Redis memory usage above 90%"

    condition_threshold {
      filter         = "resource.type=\"redis_instance\" AND resource.label.instance_id=\"${google_redis_instance.cache.id}\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
      duration       = "300s"
      comparison     = "COMPARISON_GREATER_THAN"
      threshold_value = 0.9

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  project = var.gcp_project_id
}

# ========== SERVICE ACCOUNTS ==========

# Service account for database access
resource "google_service_account" "database" {
  account_id   = "database-access"
  display_name = "Database Access Service Account"
  description  = "Service account for application database access"

  project = var.gcp_project_id
}

# Service account for PostgreSQL
resource "google_service_account" "postgres" {
  account_id   = "postgres-admin"
  display_name = "PostgreSQL Admin Service Account"
  description  = "Service account for PostgreSQL administration"

  project = var.gcp_project_id
}

# IAM bindings for database service accounts
resource "google_project_iam_member" "database_secret_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.database.email}"
}

resource "google_project_iam_member" "postgres_client" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.postgres.email}"
}

resource "google_kms_crypto_key_iam_member" "database_key_user" {
  crypto_key_id = google_kms_crypto_key.database.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.database.email}"
}

# ========== RANDOM RESOURCES ==========

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# ========== OUTPUTS ==========

output "postgres_instance_name" {
  description = "PostgreSQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "postgres_connection_name" {
  description = "PostgreSQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
  sensitive   = true
}

output "postgres_private_ip" {
  description = "PostgreSQL private IP address"
  value       = google_sql_database_instance.postgres.private_ip_address
  sensitive   = true
}

output "redis_instance_name" {
  description = "Redis instance name"
  value       = google_redis_instance.cache.name
}

output "redis_host" {
  description = "Redis host address"
  value       = google_redis_instance.cache.host
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = google_redis_instance.cache.port
}

output "database_backup_bucket" {
  description = "Database backup bucket name"
  value       = google_storage_bucket.database_backups.name
}

output "kms_keyring_name" {
  description = "KMS key ring name"
  value       = google_kms_key_ring.eatech.name
}

output "database_encryption_key" {
  description = "Database encryption key name"
  value       = google_kms_crypto_key.database.name
}

output "database_service_account_email" {
  description = "Database service account email"
  value       = google_service_account.database.email
  sensitive   = true
}
