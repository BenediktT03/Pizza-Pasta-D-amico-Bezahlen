# Cloudflare Module for EATECH Platform
# This module manages Cloudflare DNS, CDN, and Workers configurations

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Variables
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain" {
  description = "Main domain name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "firebase_hosting_ips" {
  description = "Firebase Hosting IP addresses"
  type        = list(string)
  default     = ["199.36.158.100", "199.36.158.101"]
}

variable "worker_script_path" {
  description = "Path to Cloudflare Worker scripts"
  type        = string
  default     = "../../services/workers/dist"
}

# Provider Configuration
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# DNS Records for Main Domain
resource "cloudflare_record" "root_a" {
  count   = length(var.firebase_hosting_ips)
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = var.firebase_hosting_ips[count.index]
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Subdomains for Different Apps
resource "cloudflare_record" "admin" {
  zone_id = var.cloudflare_zone_id
  name    = "admin"
  value   = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "master" {
  zone_id = var.cloudflare_zone_id
  name    = "master"
  value   = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Environment-specific subdomains
resource "cloudflare_record" "env_subdomain" {
  count   = var.environment != "prod" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = var.environment
  value   = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Page Rules
resource "cloudflare_page_rule" "force_https" {
  zone_id  = var.cloudflare_zone_id
  target   = "http://*${var.domain}/*"
  priority = 1

  actions {
    always_use_https = true
  }
}

resource "cloudflare_page_rule" "cache_static" {
  zone_id  = var.cloudflare_zone_id
  target   = "*${var.domain}/*.{css,js,jpg,jpeg,png,gif,ico,woff,woff2}"
  priority = 2

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 86400
    browser_cache_ttl = 31536000
  }
}

# Cloudflare Workers
resource "cloudflare_worker_script" "image_optimizer" {
  account_id = var.cloudflare_zone_id
  name       = "eatech-image-optimizer-${var.environment}"
  content    = file("${var.worker_script_path}/image-optimization.js")

  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  kv_namespace_binding {
    name         = "IMAGE_CACHE"
    namespace_id = cloudflare_workers_kv_namespace.image_cache.id
  }
}

resource "cloudflare_worker_script" "cache_handler" {
  account_id = var.cloudflare_zone_id
  name       = "eatech-cache-handler-${var.environment}"
  content    = file("${var.worker_script_path}/cache-handler.js")

  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  kv_namespace_binding {
    name         = "CACHE_STORE"
    namespace_id = cloudflare_workers_kv_namespace.cache_store.id
  }
}

# Workers KV Namespaces
resource "cloudflare_workers_kv_namespace" "image_cache" {
  account_id = var.cloudflare_zone_id
  title      = "eatech-image-cache-${var.environment}"
}

resource "cloudflare_workers_kv_namespace" "cache_store" {
  account_id = var.cloudflare_zone_id
  title      = "eatech-cache-store-${var.environment}"
}

# Worker Routes
resource "cloudflare_worker_route" "image_optimizer" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "*${var.domain}/images/*"
  script_name = cloudflare_worker_script.image_optimizer.name
}

resource "cloudflare_worker_route" "cache_handler" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "*${var.domain}/api/*"
  script_name = cloudflare_worker_script.cache_handler.name
}

# Firewall Rules
resource "cloudflare_ruleset" "zone_level_firewall" {
  zone_id = var.cloudflare_zone_id
  name    = "EATECH Firewall Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(cf.threat_score gt 50)"
    description = "Block high threat score requests"
    enabled = true
  }

  rules {
    action = "challenge"
    expression = "(not cf.bot_management.verified_bot and cf.bot_management.score lt 30)"
    description = "Challenge suspicious bots"
    enabled = true
  }

  rules {
    action = "skip"
    expression = "(http.request.uri.path matches \"^/api/webhooks/\")"
    description = "Allow webhook endpoints"
    enabled = true
    action_parameters {
      ruleset = "current"
    }
  }
}

# Rate Limiting Rules
resource "cloudflare_rate_limit" "api_limit" {
  zone_id = var.cloudflare_zone_id
  threshold = 100
  period = 60
  match {
    request {
      url_pattern = "*${var.domain}/api/*"
    }
  }
  action {
    mode = "challenge"
    timeout = 600
  }
  description = "API rate limiting"
  disabled = false
}

# SSL/TLS Configuration
resource "cloudflare_zone_settings_override" "ssl_settings" {
  zone_id = var.cloudflare_zone_id

  settings {
    ssl = "flexible"
    always_use_https = "on"
    min_tls_version = "1.2"
    tls_1_3 = "on"
    automatic_https_rewrites = "on"
    
    # Security Headers
    security_header {
      enabled = true
      include_subdomains = true
      max_age = 31536000
      nosniff = true
      preload = true
    }
  }
}

# Cache Settings
resource "cloudflare_zone_settings_override" "cache_settings" {
  zone_id = var.cloudflare_zone_id

  settings {
    cache_level = "aggressive"
    browser_cache_ttl = 1800
    challenge_ttl = 1800
    
    # Polish for image optimization
    polish = "lossless"
    webp = "on"
    
    # Minification
    minify {
      css = "on"
      html = "on"
      js = "on"
    }
    
    # Brotli compression
    brotli = "on"
  }
}

# Load Balancer (for production)
resource "cloudflare_load_balancer" "main" {
  count            = var.environment == "prod" ? 1 : 0
  zone_id          = var.cloudflare_zone_id
  name             = "eatech-lb-${var.environment}"
  fallback_pool_id = cloudflare_load_balancer_pool.primary[0].id
  default_pool_ids = [cloudflare_load_balancer_pool.primary[0].id]
  description      = "EATECH Load Balancer"
  proxied          = true
  session_affinity = "cookie"
  session_affinity_ttl = 82800
}

resource "cloudflare_load_balancer_pool" "primary" {
  count       = var.environment == "prod" ? 1 : 0
  account_id  = var.cloudflare_zone_id
  name        = "eatech-pool-primary-${var.environment}"
  description = "Primary origin pool"

  dynamic "origins" {
    for_each = var.firebase_hosting_ips
    content {
      name    = "firebase-${origins.key}"
      address = origins.value
      enabled = true
    }
  }

  check_regions = ["WEUR"]
  monitor       = cloudflare_load_balancer_monitor.health[0].id
}

resource "cloudflare_load_balancer_monitor" "health" {
  count         = var.environment == "prod" ? 1 : 0
  account_id    = var.cloudflare_zone_id
  type          = "https"
  port          = 443
  method        = "GET"
  path          = "/health"
  interval      = 60
  timeout       = 10
  retries       = 2
  description   = "Health check monitor"
  
  header {
    header = "Host"
    values = [var.domain]
  }
}

# Outputs
output "cloudflare_config" {
  value = {
    zone_id = var.cloudflare_zone_id
    domain  = var.domain
    workers = {
      image_optimizer = cloudflare_worker_script.image_optimizer.name
      cache_handler   = cloudflare_worker_script.cache_handler.name
    }
    kv_namespaces = {
      image_cache = cloudflare_workers_kv_namespace.image_cache.id
      cache_store = cloudflare_workers_kv_namespace.cache_store.id
    }
  }
}

output "dns_records" {
  value = {
    root   = [for r in cloudflare_record.root_a : r.hostname]
    www    = cloudflare_record.www.hostname
    admin  = cloudflare_record.admin.hostname
    master = cloudflare_record.master.hostname
    api    = cloudflare_record.api.hostname
  }
}

output "worker_routes" {
  value = {
    image_optimizer = cloudflare_worker_route.image_optimizer.pattern
    cache_handler   = cloudflare_worker_route.cache_handler.pattern
  }
}
