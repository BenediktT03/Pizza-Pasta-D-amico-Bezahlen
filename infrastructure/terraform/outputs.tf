# EATECH V3.0 - Terraform Outputs
# Infrastructure resource outputs for integration and monitoring
# Swiss data residency with comprehensive resource information

# ========== PROJECT INFORMATION ==========

output "project_info" {
  description = "Project information"
  value = {
    project_id   = var.gcp_project_id
    project_name = var.project_name
    environment  = var.environment
    version      = var.version
    region       = var.gcp_region
    zone         = var.gcp_zone
  }
}

# ========== GOOGLE KUBERNETES ENGINE ==========

output "gke_cluster_info" {
  description = "GKE cluster information"
  value = {
    name               = google_container_cluster.eatech_cluster.name
    location           = google_container_cluster.eatech_cluster.location
    endpoint           = google_container_cluster.eatech_cluster.endpoint
    master_version     = google_container_cluster.eatech_cluster.master_version
    node_version       = google_container_cluster.eatech_cluster.node_version
    services_ipv4_cidr = google_container_cluster.eatech_cluster.services_ipv4_cidr
    cluster_ipv4_cidr  = google_container_cluster.eatech_cluster.cluster_ipv4_cidr
    status             = google_container_cluster.eatech_cluster.status
  }
  sensitive = true
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.eatech_cluster.endpoint
  sensitive   = true
}

output "gke_cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.eatech_cluster.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "gke_cluster_client_certificate" {
  description = "GKE cluster client certificate"
  value       = google_container_cluster.eatech_cluster.master_auth[0].client_certificate
  sensitive   = true
}

output "gke_cluster_client_key" {
  description = "GKE cluster client key"
  value       = google_container_cluster.eatech_cluster.master_auth[0].client_key
  sensitive   = true
}

output "gke_node_pools" {
  description = "GKE node pool information"
  value = {
    general = {
      name         = google_container_node_pool.general.name
      location     = google_container_node_pool.general.location
      node_count   = google_container_node_pool.general.node_count
      machine_type = google_container_node_pool.general.node_config[0].machine_type
    }
    admin = {
      name         = google_container_node_pool.admin.name
      location     = google_container_node_pool.admin.location
      node_count   = google_container_node_pool.admin.node_count
      machine_type = google_container_node_pool.admin.node_config[0].machine_type
    }
    master = {
      name         = google_container_node_pool.master.name
      location     = google_container_node_pool.master.location
      node_count   = google_container_node_pool.master.node_count
      machine_type = google_container_node_pool.master.node_config[0].machine_type
    }
  }
}

# ========== NETWORKING ==========

output "vpc_info" {
  description = "VPC network information"
  value = {
    name                    = google_compute_network.vpc.name
    self_link              = google_compute_network.vpc.self_link
    gateway_ipv4           = google_compute_network.vpc.gateway_ipv4
    routing_mode           = google_compute_network.vpc.routing_mode
    auto_create_subnetworks = google_compute_network.vpc.auto_create_subnetworks
  }
}

output "subnets_info" {
  description = "Subnet information"
  value = {
    public = {
      name             = google_compute_subnetwork.public.name
      ip_cidr_range    = google_compute_subnetwork.public.ip_cidr_range
      gateway_address  = google_compute_subnetwork.public.gateway_address
      self_link        = google_compute_subnetwork.public.self_link
    }
    private = {
      name             = google_compute_subnetwork.private.name
      ip_cidr_range    = google_compute_subnetwork.private.ip_cidr_range
      gateway_address  = google_compute_subnetwork.private.gateway_address
      self_link        = google_compute_subnetwork.private.self_link
    }
    database = {
      name             = google_compute_subnetwork.database.name
      ip_cidr_range    = google_compute_subnetwork.database.ip_cidr_range
      gateway_address  = google_compute_subnetwork.database.gateway_address
      self_link        = google_compute_subnetwork.database.self_link
    }
  }
}

output "firewall_rules" {
  description = "Firewall rules information"
  value = {
    allow_internal = google_compute_firewall.allow_internal.name
    allow_ssh      = google_compute_firewall.allow_ssh.name
    allow_http     = google_compute_firewall.allow_http.name
    allow_https    = google_compute_firewall.allow_https.name
    deny_all       = google_compute_firewall.deny_all.name
  }
}

output "nat_gateway_info" {
  description = "NAT gateway information"
  value = {
    name   = google_compute_router_nat.nat.name
    router = google_compute_router_nat.nat.router
    region = google_compute_router_nat.nat.region
  }
}

# ========== LOAD BALANCERS ==========

output "load_balancers" {
  description = "Load balancer information"
  value = {
    global_lb = {
      name        = google_compute_global_forwarding_rule.https.name
      ip_address  = google_compute_global_address.default.address
      port_range  = google_compute_global_forwarding_rule.https.port_range
      target      = google_compute_global_forwarding_rule.https.target
    }
    ssl_certificate = {
      name         = google_compute_managed_ssl_certificate.default.name
      domains      = google_compute_managed_ssl_certificate.default.managed[0].domains
      status       = google_compute_managed_ssl_certificate.default.managed[0].status
    }
  }
}

output "backend_services" {
  description = "Backend service information"
  value = {
    web_backend = {
      name        = google_compute_backend_service.web.name
      self_link   = google_compute_backend_service.web.self_link
      protocol    = google_compute_backend_service.web.protocol
      port_name   = google_compute_backend_service.web.port_name
    }
    api_backend = {
      name        = google_compute_backend_service.api.name
      self_link   = google_compute_backend_service.api.self_link
      protocol    = google_compute_backend_service.api.protocol
      port_name   = google_compute_backend_service.api.port_name
    }
  }
}

# ========== DATABASES ==========

output "postgres_info" {
  description = "PostgreSQL database information"
  value = {
    instance_name       = google_sql_database_instance.postgres.name
    connection_name     = google_sql_database_instance.postgres.connection_name
    self_link          = google_sql_database_instance.postgres.self_link
    service_account_email = google_sql_database_instance.postgres.service_account_email_address
    ip_addresses = {
      public  = length(google_sql_database_instance.postgres.ip_address) > 0 ? google_sql_database_instance.postgres.ip_address[0].ip_address : null
      private = length(google_sql_database_instance.postgres.private_ip_address) > 0 ? google_sql_database_instance.postgres.private_ip_address : null
    }
    databases = {
      main = google_sql_database.main.name
      analytics = google_sql_database.analytics.name
    }
  }
  sensitive = true
}

output "redis_info" {
  description = "Redis cache information"
  value = {
    instance_id    = google_redis_instance.cache.id
    name          = google_redis_instance.cache.name
    host          = google_redis_instance.cache.host
    port          = google_redis_instance.cache.port
    region        = google_redis_instance.cache.region
    memory_size_gb = google_redis_instance.cache.memory_size_gb
    redis_version = google_redis_instance.cache.redis_version
    tier          = google_redis_instance.cache.tier
  }
  sensitive = true
}

# ========== FIREBASE ==========

output "firebase_info" {
  description = "Firebase project information"
  value = {
    project_id = google_firebase_project.eatech.project
    databases = {
      firestore = {
        name        = google_firestore_database.eatech.name
        location_id = google_firestore_database.eatech.location_id
        type        = google_firestore_database.eatech.type
      }
    }
  }
}

# ========== CLOUDFLARE ==========

output "cloudflare_info" {
  description = "Cloudflare configuration information"
  value = {
    zone_id = data.cloudflare_zones.eatech.zones[0].id
    zone_name = data.cloudflare_zones.eatech.zones[0].name
    dns_records = {
      for record in cloudflare_record.main : record.name => {
        name    = record.name
        value   = record.value
        type    = record.type
        ttl     = record.ttl
        proxied = record.proxied
      }
    }
  }
}

output "cloudflare_page_rules" {
  description = "Cloudflare page rules"
  value = {
    for rule in cloudflare_page_rule.cache_rules : rule.target => {
      target   = rule.target
      priority = rule.priority
      status   = rule.status
    }
  }
}

# ========== DNS ==========

output "dns_info" {
  description = "DNS configuration information"
  value = {
    main_domain = var.domain_name
    nameservers = data.cloudflare_zones.eatech.zones[0].name_servers
    subdomains = {
      for subdomain, config in var.subdomains : subdomain => {
        fqdn = "${config.name}.${var.domain_name}"
        type = config.record_type
        target = config.target
      }
    }
  }
}

# ========== SERVICE ACCOUNTS ==========

output "service_accounts" {
  description = "Service account information"
  value = {
    gke_nodes = {
      email        = google_service_account.gke_nodes.email
      unique_id    = google_service_account.gke_nodes.unique_id
      display_name = google_service_account.gke_nodes.display_name
    }
    gke_master = {
      email        = google_service_account.gke_master.email
      unique_id    = google_service_account.gke_master.unique_id
      display_name = google_service_account.gke_master.display_name
    }
    postgres = {
      email        = google_service_account.postgres.email
      unique_id    = google_service_account.postgres.unique_id
      display_name = google_service_account.postgres.display_name
    }
  }
  sensitive = true
}

# ========== STORAGE ==========

output "storage_buckets" {
  description = "Storage bucket information"
  value = {
    terraform_state = {
      name         = google_storage_bucket.terraform_state.name
      url          = google_storage_bucket.terraform_state.url
      location     = google_storage_bucket.terraform_state.location
      storage_class = google_storage_bucket.terraform_state.storage_class
    }
    backups = {
      name         = google_storage_bucket.backups.name
      url          = google_storage_bucket.backups.url
      location     = google_storage_bucket.backups.location
      storage_class = google_storage_bucket.backups.storage_class
    }
    static_assets = {
      name         = google_storage_bucket.static_assets.name
      url          = google_storage_bucket.static_assets.url
      location     = google_storage_bucket.static_assets.location
      storage_class = google_storage_bucket.static_assets.storage_class
    }
  }
}

# ========== SECURITY ==========

output "security_info" {
  description = "Security configuration information"
  value = {
    kms_keyring = {
      name     = google_kms_key_ring.eatech.name
      location = google_kms_key_ring.eatech.location
    }
    kms_keys = {
      for key_name, key in google_kms_crypto_key.keys : key_name => {
        name            = key.name
        purpose         = key.purpose
        rotation_period = key.rotation_period
      }
    }
    secret_manager_secrets = {
      for secret_name, secret in google_secret_manager_secret.secrets : secret_name => {
        name       = secret.name
        secret_id  = secret.secret_id
        project    = secret.project
      }
    }
  }
  sensitive = true
}

output "ssl_certificates" {
  description = "SSL certificate information"
  value = {
    managed_cert = {
      name    = google_compute_managed_ssl_certificate.default.name
      domains = google_compute_managed_ssl_certificate.default.managed[0].domains
      status  = google_compute_managed_ssl_certificate.default.managed[0].status
    }
  }
  sensitive = true
}

# ========== MONITORING ==========

output "monitoring_info" {
  description = "Monitoring and observability information"
  value = {
    notification_channels = {
      for channel_name, channel in google_monitoring_notification_channel.channels : channel_name => {
        name         = channel.name
        display_name = channel.display_name
        type         = channel.type
      }
    }
    alert_policies = {
      for policy_name, policy in google_monitoring_alert_policy.policies : policy_name => {
        name         = policy.name
        display_name = policy.display_name
        enabled      = policy.enabled
      }
    }
    uptime_checks = {
      for check_name, check in google_monitoring_uptime_check_config.checks : check_name => {
        name         = check.name
        display_name = check.display_name
        timeout      = check.timeout
      }
    }
  }
}

# ========== BACKUP ==========

output "backup_info" {
  description = "Backup configuration information"
  value = {
    postgres_backups = {
      enabled           = google_sql_database_instance.postgres.backup_configuration[0].enabled
      start_time        = google_sql_database_instance.postgres.backup_configuration[0].start_time
      point_in_time_recovery_enabled = google_sql_database_instance.postgres.backup_configuration[0].point_in_time_recovery_enabled
      backup_retention_settings = google_sql_database_instance.postgres.backup_configuration[0].backup_retention_settings
    }
    storage_backups = {
      bucket_name = google_storage_bucket.backups.name
      location    = google_storage_bucket.backups.location
      lifecycle_rules = google_storage_bucket.backups.lifecycle_rule
    }
  }
}

# ========== COST TRACKING ==========

output "cost_tracking" {
  description = "Cost tracking and billing information"
  value = {
    billing_account = var.gcp_billing_account
    cost_centers = {
      production = "eatech-ops"
      development = "eatech-dev"
    }
    resource_labels = var.resource_labels
    budget_filters = {
      project = var.gcp_project_id
      services = [
        "Kubernetes Engine",
        "Compute Engine",
        "Cloud SQL",
        "Cloud Storage",
        "Firebase",
        "Cloud Load Balancing"
      ]
    }
  }
  sensitive = true
}

# ========== COMPLIANCE ==========

output "compliance_info" {
  description = "Compliance and regulatory information"
  value = {
    data_residency = {
      primary_region   = var.gcp_region
      secondary_region = var.gcp_secondary_region
      allowed_regions  = var.compliance_config.data_residency_regions
    }
    encryption = {
      at_rest     = var.compliance_config.enable_encryption_at_rest
      in_transit  = var.compliance_config.enable_encryption_in_transit
    }
    audit_logging = {
      enabled         = var.compliance_config.enable_audit_logging
      retention_days  = var.compliance_config.audit_log_retention_days
    }
    compliance_standards = {
      gdpr = var.compliance_config.gdpr_compliance
      dsg  = var.compliance_config.dsg_compliance
    }
  }
}

# ========== ENVIRONMENT URLS ==========

output "application_urls" {
  description = "Application URLs and endpoints"
  value = {
    main_app    = "https://${var.domain_name}"
    customer_app = "https://app.${var.domain_name}"
    admin_app   = "https://admin.${var.domain_name}"
    master_app  = "https://master.${var.domain_name}"
    api_endpoint = "https://api.${var.domain_name}"
    cdn_endpoint = "https://cdn.${var.domain_name}"
    websocket   = "wss://ws.${var.domain_name}"
    monitoring = {
      grafana    = "https://grafana.${var.domain_name}"
      prometheus = "https://prometheus.${var.domain_name}"
    }
  }
}

# ========== KUBERNETES CONNECTION ==========

output "kubectl_config" {
  description = "kubectl configuration command"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.eatech_cluster.name} --region ${google_container_cluster.eatech_cluster.location} --project ${var.gcp_project_id}"
}

output "kubernetes_context" {
  description = "Kubernetes context information"
  value = {
    cluster_name = google_container_cluster.eatech_cluster.name
    region      = google_container_cluster.eatech_cluster.location
    project     = var.gcp_project_id
    context     = "gke_${var.gcp_project_id}_${google_container_cluster.eatech_cluster.location}_${google_container_cluster.eatech_cluster.name}"
  }
}

# ========== DEPLOYMENT INFO ==========

output "deployment_info" {
  description = "Deployment information and next steps"
  value = {
    terraform_state_bucket = google_storage_bucket.terraform_state.name
    deployment_timestamp   = timestamp()
    infrastructure_version = var.version
    next_steps = [
      "1. Configure kubectl: ${output.kubectl_config.value}",
      "2. Deploy Kubernetes resources from /infrastructure/kubernetes/",
      "3. Configure DNS records in Cloudflare",
      "4. Set up monitoring dashboards",
      "5. Configure backup schedules",
      "6. Run security scans and compliance checks"
    ]
  }
}

# ========== EMERGENCY CONTACTS ==========

output "emergency_contacts" {
  description = "Emergency contact information"
  value = {
    platform_team = "platform-team@eatech.ch"
    security_team = "security-team@eatech.ch"
    on_call_phone = "+41791234567"
    slack_channel = "#eatech-alerts"
    pagerduty_service = "EATECH-PROD"
  }
  sensitive = true
}

# ========== RESOURCE SUMMARY ==========

output "resource_summary" {
  description = "Summary of created resources"
  value = {
    total_resources = {
      gcp_resources = length([
        google_container_cluster.eatech_cluster,
        google_container_node_pool.general,
        google_container_node_pool.admin,
        google_container_node_pool.master,
        google_compute_network.vpc,
        google_compute_subnetwork.public,
        google_compute_subnetwork.private,
        google_compute_subnetwork.database,
        google_sql_database_instance.postgres,
        google_redis_instance.cache,
        google_firebase_project.eatech,
        google_firestore_database.eatech
      ])
      cloudflare_resources = length(cloudflare_record.main)
      total = length([
        google_container_cluster.eatech_cluster,
        google_container_node_pool.general,
        google_container_node_pool.admin,
        google_container_node_pool.master,
        google_compute_network.vpc,
        google_compute_subnetwork.public,
        google_compute_subnetwork.private,
        google_compute_subnetwork.database,
        google_sql_database_instance.postgres,
        google_redis_instance.cache,
        google_firebase_project.eatech,
        google_firestore_database.eatech
      ]) + length(cloudflare_record.main)
    }
    estimated_monthly_cost = {
      gke_cluster = "$300-500"
      cloud_sql   = "$150-300"
      redis       = "$100-200"
      load_balancer = "$50-100"
      storage     = "$50-150"
      networking  = "$50-100"
      monitoring  = "$25-75"
      cloudflare  = "$20-50"
      total_estimated = "$745-1475"
      note = "Costs may vary based on usage and region"
    }
  }
}
