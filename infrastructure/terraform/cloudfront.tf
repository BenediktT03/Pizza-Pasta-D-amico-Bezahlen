# EATECH V3.0 - CDN and Cloudflare Configuration
# Global content delivery with Swiss data compliance
# Performance optimization and security enhancement

# ========== CLOUDFLARE ZONE SETTINGS ==========

# Cloudflare zone settings for optimal performance
resource "cloudflare_zone_settings_override" "eatech_settings" {
  zone_id = data.cloudflare_zones.eatech.zones[0].id

  settings {
    # SSL/TLS settings
    ssl                      = "strict"
    min_tls_version         = "1.2"
    tls_1_3                 = "on"
    automatic_https_rewrites = "on"
    opportunistic_encryption = "on"

    # Security settings
    security_level          = "medium"
    challenge_ttl          = 1800
    browser_check          = "on"
    hotlink_protection     = "on"
    email_obfuscation      = "on"
    server_side_exclude    = "on"

    # Performance settings
    brotli                 = "on"
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }

    # Cache settings
    browser_cache_ttl      = 14400  # 4 hours
    always_online          = "on"
    development_mode       = "off"

    # HTTP/3 and 0-RTT
    http3                  = "on"
    zero_rtt               = "on"

    # Other optimizations
    rocket_loader          = "on"
    mirage                 = "on"
    polish                 = "lossless"
    webp                   = "on"

    # Privacy settings (GDPR compliance)
    privacy_pass           = "on"

    # Bot protection
    bot_management {
      enable_js              = true
      suppress_session_score = false
    }
  }
}

# ========== DNS RECORDS ==========

# Main DNS records for EATECH domains
resource "cloudflare_record" "main" {
  for_each = {
    # Main domain
    root = {
      name    = "@"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    # Customer PWA
    app = {
      name    = "app"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    # API endpoints
    api = {
      name    = "api"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    # CDN endpoint
    cdn = {
      name    = "cdn"
      value   = google_storage_bucket.static_assets.url
      type    = "CNAME"
      ttl     = 3600
      proxied = true
    }

    # WebSocket endpoint
    ws = {
      name    = "ws"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = false  # WebSocket doesn't work through Cloudflare proxy
    }

    # Admin dashboard (restricted)
    admin = {
      name    = "admin"
      value   = google_compute_global_address.admin.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    # Master control (maximum security)
    master = {
      name    = "master"
      value   = google_compute_global_address.master.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    # Monitoring services
    grafana = {
      name    = "grafana"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = true
    }

    prometheus = {
      name    = "prometheus"
      value   = google_compute_global_address.default.address
      type    = "A"
      ttl     = 300
      proxied = true
    }
  }

  zone_id = data.cloudflare_zones.eatech.zones[0].id
  name    = each.value.name
  value   = each.value.value
  type    = each.value.type
  ttl     = each.value.ttl
  proxied = each.value.proxied

  comment = "EATECH ${each.key} endpoint"
}

# TXT records for verification and security
resource "cloudflare_record" "txt_records" {
  for_each = {
    # Domain verification
    google_verification = {
      name  = "@"
      value = "google-site-verification=PLACEHOLDER_GOOGLE_VERIFICATION"
    }

    # SPF record for email security
    spf = {
      name  = "@"
      value = "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
    }

    # DMARC policy
    dmarc = {
      name  = "_dmarc"
      value = "v=DMARC1; p=quarantine; rua=mailto:dmarc@eatech.ch; ruf=mailto:dmarc@eatech.ch; sp=quarantine; adkim=r; aspf=r;"
    }

    # Security.txt location
    security = {
      name  = "@"
      value = "security-contact=https://eatech.ch/.well-known/security.txt"
    }
  }

  zone_id = data.cloudflare_zones.eatech.zones[0].id
  name    = each.value.name
  value   = each.value.value
  type    = "TXT"
  ttl     = 3600

  comment = "Security and verification record"
}

# MX records for email
resource "cloudflare_record" "mx_records" {
  for_each = {
    mx1 = { priority = 1, value = "aspmx.l.google.com" }
    mx2 = { priority = 5, value = "alt1.aspmx.l.google.com" }
    mx3 = { priority = 5, value = "alt2.aspmx.l.google.com" }
    mx4 = { priority = 10, value = "alt3.aspmx.l.google.com" }
    mx5 = { priority = 10, value = "alt4.aspmx.l.google.com" }
  }

  zone_id  = data.cloudflare_zones.eatech.zones[0].id
  name     = "@"
  value    = each.value.value
  type     = "MX"
  priority = each.value.priority
  ttl      = 3600
}

# ========== PAGE RULES ==========

# Cache rules for optimal performance
resource "cloudflare_page_rule" "cache_rules" {
  for_each = {
    # Static assets - aggressive caching
    static_assets = {
      target   = "cdn.${var.domain_name}/*"
      priority = 1
      status   = "active"
      actions = {
        cache_level         = "cache_everything"
        edge_cache_ttl      = 2592000  # 30 days
        browser_cache_ttl   = 31536000 # 1 year
        cache_key_fields = {
          query_string = { exclude = "*" }
          header       = { check_presence = ["Accept-Encoding"] }
        }
      }
    }

    # API endpoints - no caching
    api_no_cache = {
      target   = "api.${var.domain_name}/*"
      priority = 2
      status   = "active"
      actions = {
        cache_level       = "bypass"
        browser_cache_ttl = 0
      }
    }

    # Admin interface - security headers
    admin_security = {
      target   = "admin.${var.domain_name}/*"
      priority = 3
      status   = "active"
      actions = {
        cache_level = "bypass"
        security_level = "high"
        browser_check = "on"
      }
    }

    # Master control - maximum security
    master_security = {
      target   = "master.${var.domain_name}/*"
      priority = 4
      status   = "active"
      actions = {
        cache_level = "bypass"
        security_level = "high"
        browser_check = "on"
        waf = "on"
      }
    }

    # Web app - optimized caching
    web_optimized = {
      target   = "app.${var.domain_name}/*"
      priority = 5
      status   = "active"
      actions = {
        cache_level       = "standard"
        browser_cache_ttl = 14400  # 4 hours
        rocket_loader     = "on"
        mirage           = "on"
      }
    }
  }

  zone_id  = data.cloudflare_zones.eatech.zones[0].id
  target   = each.value.target
  priority = each.value.priority
  status   = each.value.status

  actions {
    cache_level       = lookup(each.value.actions, "cache_level", null)
    edge_cache_ttl    = lookup(each.value.actions, "edge_cache_ttl", null)
    browser_cache_ttl = lookup(each.value.actions, "browser_cache_ttl", null)
    security_level    = lookup(each.value.actions, "security_level", null)
    browser_check     = lookup(each.value.actions, "browser_check", null)
    rocket_loader     = lookup(each.value.actions, "rocket_loader", null)
    mirage           = lookup(each.value.actions, "mirage", null)

    dynamic "cache_key_fields" {
      for_each = lookup(each.value.actions, "cache_key_fields", null) != null ? [each.value.actions.cache_key_fields] : []
      content {
        dynamic "query_string" {
          for_each = lookup(cache_key_fields.value, "query_string", null) != null ? [cache_key_fields.value.query_string] : []
          content {
            exclude = lookup(query_string.value, "exclude", null)
            include = lookup(query_string.value, "include", null)
          }
        }
        dynamic "header" {
          for_each = lookup(cache_key_fields.value, "header", null) != null ? [cache_key_fields.value.header] : []
          content {
            check_presence = lookup(header.value, "check_presence", null)
            exclude        = lookup(header.value, "exclude", null)
            include        = lookup(header.value, "include", null)
          }
        }
      }
    }
  }
}

# ========== WORKERS AND EDGE COMPUTING ==========

# Cloudflare Worker for edge processing
resource "cloudflare_worker_script" "edge_processor" {
  account_id = var.cloudflare_account_id
  name       = "eatech-edge-processor"
  content    = file("${path.module}/workers/edge-processor.js")

  # KV namespace bindings for edge storage
  kv_namespace_binding {
    name         = "EDGE_CACHE"
    namespace_id = cloudflare_workers_kv_namespace.edge_cache.id
  }

  # Service bindings
  service_binding {
    name    = "API_SERVICE"
    service = "eatech-api-worker"
  }

  # Environment variables
  plain_text_binding {
    name  = "ENVIRONMENT"
    text  = "production"
  }

  secret_text_binding {
    name = "API_SECRET"
    text = var.edge_api_secret
  }
}

# KV namespace for edge caching
resource "cloudflare_workers_kv_namespace" "edge_cache" {
  account_id = var.cloudflare_account_id
  title      = "eatech-edge-cache"
}

# Worker route for edge processing
resource "cloudflare_worker_route" "edge_route" {
  zone_id     = data.cloudflare_zones.eatech.zones[0].id
  pattern     = "api.${var.domain_name}/edge/*"
  script_name = cloudflare_worker_script.edge_processor.name
}

# ========== STATIC ASSETS STORAGE ==========

# Google Cloud Storage bucket for static assets
resource "google_storage_bucket" "static_assets" {
  name     = "${var.project_name}-static-assets-${random_id.bucket_suffix.hex}"
  location = "EU"  # Multi-region for better performance

  storage_class = "STANDARD"

  # Make bucket publicly readable
  uniform_bucket_level_access = true

  # CORS configuration for web access
  cors {
    origin          = ["https://*.${var.domain_name}"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Website configuration
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  # Lifecycle management
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  # Labels
  labels = merge(var.resource_labels, {
    purpose = "static-assets"
    cdn     = "cloudflare"
  })

  project = var.gcp_project_id
}

# Make bucket public
resource "google_storage_bucket_iam_member" "public_access" {
  bucket = google_storage_bucket.static_assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ========== WAF RULES ==========

# Custom WAF rules for enhanced security
resource "cloudflare_ruleset" "waf_custom_rules" {
  zone_id     = data.cloudflare_zones.eatech.zones[0].id
  name        = "EATECH Custom WAF Rules"
  description = "Custom WAF rules for EATECH application security"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Block common attack patterns
  rules {
    action      = "block"
    description = "Block SQL injection attempts"
    expression  = "(http.request.uri.query contains \"' OR 1=1\" or http.request.uri.query contains \"UNION SELECT\" or http.request.body contains \"' OR 1=1\")"
    enabled     = true
  }

  rules {
    action      = "block"
    description = "Block XSS attempts"
    expression  = "(http.request.uri.query contains \"<script\" or http.request.body contains \"<script\" or http.request.uri.query contains \"javascript:\")"
    enabled     = true
  }

  # Rate limiting for admin interfaces
  rules {
    action      = "challenge"
    description = "Rate limit admin login attempts"
    expression  = "(http.request.uri.path contains \"/admin/login\" and http.request.method eq \"POST\")"
    enabled     = true

    action_parameters {
      challenge {
        type = "managed"
      }
    }

    ratelimit {
      characteristics = ["ip.src"]
      period         = 60
      requests_per_period = 5
      mitigation_timeout = 600
    }
  }

  # Geo-blocking for admin interfaces (optional)
  rules {
    action      = "block"
    description = "Geo-block admin access outside allowed countries"
    expression  = "(http.request.uri.path contains \"/admin\" or http.request.uri.path contains \"/master\") and not (ip.geoip.country in {\"CH\" \"DE\" \"AT\" \"FR\" \"IT\"})"
    enabled     = false  # Enable if geo-blocking is required
  }

  # Bot protection
  rules {
    action      = "managed_challenge"
    description = "Challenge suspected bots"
    expression  = "(cf.bot_management.score < 30)"
    enabled     = true
  }
}

# ========== LOAD BALANCING ==========

# Cloudflare Load Balancer for high availability
resource "cloudflare_load_balancer_pool" "main_pool" {
  account_id = var.cloudflare_account_id
  name       = "eatech-main-pool"

  origins {
    name    = "gcp-primary"
    address = google_compute_global_address.default.address
    enabled = true
    weight  = 1
  }

  # Health check configuration
  check_regions = ["WEU", "EEUR"]  # Western Europe, Eastern Europe

  monitor = cloudflare_load_balancer_monitor.http_monitor.id

  notification_email = "alerts@eatech.ch"
}

# Load balancer monitor
resource "cloudflare_load_balancer_monitor" "http_monitor" {
  account_id     = var.cloudflare_account_id
  type           = "https"
  expected_codes = "200"
  method         = "GET"
  path           = "/api/health"
  interval       = 60
  retries        = 2
  timeout        = 5

  header {
    header = "Host"
    values = ["api.${var.domain_name}"]
  }

  allow_insecure   = false
  follow_redirects = true
}

# Load balancer configuration
resource "cloudflare_load_balancer" "main_lb" {
  zone_id          = data.cloudflare_zones.eatech.zones[0].id
  name             = "eatech-main-lb.${var.domain_name}"
  fallback_pool_id = cloudflare_load_balancer_pool.main_pool.id
  default_pool_ids = [cloudflare_load_balancer_pool.main_pool.id]

  description = "Main load balancer for EATECH"
  ttl         = 30
  proxied     = true

  # Geographic steering (optional)
  region_pools {
    region   = "WEU"
    pool_ids = [cloudflare_load_balancer_pool.main_pool.id]
  }

  steering_policy = "geo"

  # Session affinity
  session_affinity         = "cookie"
  session_affinity_ttl     = 1800
  session_affinity_attributes = {
    samesite = "Strict"
    secure   = "Always"
  }
}

# ========== ANALYTICS AND MONITORING ==========

# Cloudflare Analytics (Web Analytics)
resource "cloudflare_web_analytics_site" "eatech_analytics" {
  account_id   = var.cloudflare_account_id
  zone_tag     = data.cloudflare_zones.eatech.zones[0].id
  auto_install = true
}

# Cloudflare Log Push (for SIEM integration)
resource "cloudflare_logpush_job" "security_logs" {
  account_id          = var.cloudflare_account_id
  dataset             = "http_requests"
  destination_conf    = "gs://${google_storage_bucket.security_logs.name}/{DATE}?project-id=${var.gcp_project_id}"
  enabled             = true
  frequency           = "high"
  kind                = """
  logpull_options     = "fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,EdgeStartTimestamp,OriginResponseStatus,SecurityLevel,WAFAction,WAFMatchedVar,WAFProfile"
  ownership_challenge = "test"
}

# Security logs bucket
resource "google_storage_bucket" "security_logs" {
  name     = "${var.project_name}-security-logs-${random_id.bucket_suffix.hex}"
  location = var.gcp_region

  storage_class = "STANDARD"

  # Lifecycle for log retention
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  # Encryption
  encryption {
    default_kms_key_name = google_kms_crypto_key.backup.id
  }

  uniform_bucket_level_access = true

  labels = merge(var.resource_labels, {
    purpose = "security-logs"
    source  = "cloudflare"
  })

  project = var.gcp_project_id
}

# ========== OUTPUTS ==========

output "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  value       = data.cloudflare_zones.eatech.zones[0].id
}

output "dns_records" {
  description = "Created DNS records"
  value = {
    for record_name, record in cloudflare_record.main : record_name => {
      name    = record.hostname
      value   = record.value
      type    = record.type
      proxied = record.proxied
    }
  }
}

output "static_assets_bucket" {
  description = "Static assets bucket URL"
  value       = google_storage_bucket.static_assets.url
}

output "cdn_endpoints" {
  description = "CDN endpoint URLs"
  value = {
    main_app    = "https://app.${var.domain_name}"
    api         = "https://api.${var.domain_name}"
    cdn         = "https://cdn.${var.domain_name}"
    admin       = "https://admin.${var.domain_name}"
    master      = "https://master.${var.domain_name}"
    websocket   = "wss://ws.${var.domain_name}"
  }
}

output "cloudflare_worker_script" {
  description = "Cloudflare Worker script name"
  value       = cloudflare_worker_script.edge_processor.name
}

output "load_balancer_hostname" {
  description = "Load balancer hostname"
  value       = cloudflare_load_balancer.main_lb.name
}
