# EATECH V3.0 - Load Balancer Configuration
# Global load balancing with SSL termination and Swiss data routing
# High availability with auto-scaling and health checks

# ========== SSL CERTIFICATES ==========

# Managed SSL certificate for main domains
resource "google_compute_managed_ssl_certificate" "default" {
  name = "${var.project_name}-ssl-cert"

  description = "Managed SSL certificate for EATECH domains"

  managed {
    domains = [
      var.domain_name,
      "app.${var.domain_name}",
      "api.${var.domain_name}",
      "cdn.${var.domain_name}",
      "ws.${var.domain_name}"
    ]
  }

  project = var.gcp_project_id
}

# Managed SSL certificate for admin domains (enhanced security)
resource "google_compute_managed_ssl_certificate" "admin" {
  name = "${var.project_name}-admin-ssl-cert"

  description = "Enhanced SSL certificate for admin interfaces"

  managed {
    domains = [
      "admin.${var.domain_name}",
      "master.${var.domain_name}"
    ]
  }

  project = var.gcp_project_id
}

# ========== HEALTH CHECKS ==========

# Health check for web applications
resource "google_compute_health_check" "web_health_check" {
  name = "${var.project_name}-web-health-check"

  description = "Health check for web applications"

  timeout_sec         = 10
  check_interval_sec  = 30
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port               = 3000
    request_path       = "/api/health"
    proxy_header       = "PROXY_V1"
    response           = "healthy"
  }

  log_config {
    enable = true
  }

  project = var.gcp_project_id
}

# Health check for API services
resource "google_compute_health_check" "api_health_check" {
  name = "${var.project_name}-api-health-check"

  description = "Health check for API services"

  timeout_sec         = 15
  check_interval_sec  = 30
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port               = 8080
    request_path       = "/health"
    proxy_header       = "PROXY_V1"
    response           = "healthy"
  }

  log_config {
    enable = true
  }

  project = var.gcp_project_id
}

# Health check for admin services
resource "google_compute_health_check" "admin_health_check" {
  name = "${var.project_name}-admin-health-check"

  description = "Health check for admin services"

  timeout_sec         = 10
  check_interval_sec  = 60  # Less frequent for admin
  healthy_threshold   = 2
  unhealthy_threshold = 5   # More tolerant for admin

  http_health_check {
    port               = 80
    request_path       = "/health"
    proxy_header       = "PROXY_V1"
    response           = "healthy"
  }

  log_config {
    enable = true
  }

  project = var.gcp_project_id
}

# Health check for WebSocket services
resource "google_compute_health_check" "websocket_health_check" {
  name = "${var.project_name}-websocket-health-check"

  description = "Health check for WebSocket services"

  timeout_sec         = 10
  check_interval_sec  = 30
  healthy_threshold   = 2
  unhealthy_threshold = 3

  tcp_health_check {
    port         = 3001
    proxy_header = "PROXY_V1"
  }

  log_config {
    enable = true
  }

  project = var.gcp_project_id
}

# ========== BACKEND SERVICES ==========

# Backend service for web applications
resource "google_compute_backend_service" "web" {
  name        = "${var.project_name}-web-backend"
  description = "Backend service for customer web applications"

  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  health_checks = [google_compute_health_check.web_health_check.id]

  # Load balancing configuration
  load_balancing_scheme = "EXTERNAL_MANAGED"

  # Session affinity for better performance
  session_affinity = "CLIENT_IP"

  # Connection draining
  connection_draining_timeout_sec = 60

  # Backend configuration
  backend {
    group           = "projects/${var.gcp_project_id}/zones/${var.gcp_zone}/instanceGroups/gke-${google_container_cluster.eatech_cluster.name}-general-${random_id.suffix.hex}"
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
    capacity_scaler = 1.0
  }

  # Enable Cloud CDN
  enable_cdn = var.performance_config.enable_cdn

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = var.performance_config.cdn_cache_ttl
    max_ttl          = 86400
    client_ttl       = 3600
    negative_caching = true

    negative_caching_policy {
      code = 404
      ttl  = 300
    }

    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }

    signed_url_cache_max_age_sec = 7200
  }

  # Outlier detection
  outlier_detection {
    consecutive_errors                    = 5
    consecutive_gateway_failure_threshold = 3
    interval {
      seconds = 30
    }
    base_ejection_time {
      seconds = 30
    }
    max_ejection_percent = 50
    min_health_percent   = 50
  }

  # Custom request and response headers
  custom_request_headers = [
    "X-Forwarded-Proto: https",
    "X-Forwarded-For: {client_ip}",
    "X-Real-IP: {client_ip}"
  ]

  custom_response_headers = [
    "X-Cache-Status: {cdn_cache_status}",
    "X-Server-Region: ${var.gcp_region}"
  ]

  # Security policy
  security_policy = google_compute_security_policy.eatech_security_policy.id

  project = var.gcp_project_id

  depends_on = [google_container_cluster.eatech_cluster]
}

# Backend service for API
resource "google_compute_backend_service" "api" {
  name        = "${var.project_name}-api-backend"
  description = "Backend service for API endpoints"

  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 60  # Longer timeout for API calls

  health_checks = [google_compute_health_check.api_health_check.id]

  load_balancing_scheme = "EXTERNAL_MANAGED"

  # No session affinity for API (stateless)
  session_affinity = "NONE"

  connection_draining_timeout_sec = 60

  backend {
    group           = "projects/${var.gcp_project_id}/zones/${var.gcp_zone}/instanceGroups/gke-${google_container_cluster.eatech_cluster.name}-general-${random_id.suffix.hex}"
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.7  # Lower utilization for API stability
    capacity_scaler = 1.0
  }

  # Outlier detection for API reliability
  outlier_detection {
    consecutive_errors                    = 3
    consecutive_gateway_failure_threshold = 2
    interval {
      seconds = 15
    }
    base_ejection_time {
      seconds = 60
    }
    max_ejection_percent = 30
    min_health_percent   = 70
  }

  # API-specific headers
  custom_request_headers = [
    "X-API-Version: 3.0",
    "X-Forwarded-Proto: https"
  ]

  security_policy = google_compute_security_policy.eatech_security_policy.id

  project = var.gcp_project_id

  depends_on = [google_container_cluster.eatech_cluster]
}

# Backend service for admin dashboard
resource "google_compute_backend_service" "admin" {
  name        = "${var.project_name}-admin-backend"
  description = "Backend service for admin dashboard"

  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  health_checks = [google_compute_health_check.admin_health_check.id]

  load_balancing_scheme = "EXTERNAL_MANAGED"

  session_affinity = "CLIENT_IP"  # Maintain sessions for admin users

  connection_draining_timeout_sec = 120  # Longer draining for admin sessions

  backend {
    group           = "projects/${var.gcp_project_id}/zones/${var.gcp_zone}/instanceGroups/gke-${google_container_cluster.eatech_cluster.name}-admin-${random_id.suffix.hex}"
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.6  # Conservative for admin stability
    capacity_scaler = 1.0
  }

  # Admin-specific security
  custom_request_headers = [
    "X-Admin-Interface: true",
    "X-Security-Level: high"
  ]

  security_policy = google_compute_security_policy.eatech_security_policy.id

  project = var.gcp_project_id

  depends_on = [google_container_cluster.eatech_cluster]
}

# Backend service for WebSocket
resource "google_compute_backend_service" "websocket" {
  name        = "${var.project_name}-websocket-backend"
  description = "Backend service for WebSocket connections"

  protocol    = "HTTP"
  port_name   = "websocket"
  timeout_sec = 3600  # Long timeout for WebSocket connections

  health_checks = [google_compute_health_check.websocket_health_check.id]

  load_balancing_scheme = "EXTERNAL_MANAGED"

  # Sticky sessions for WebSocket
  session_affinity = "CLIENT_IP"

  connection_draining_timeout_sec = 300  # Allow time for WebSocket cleanup

  backend {
    group           = "projects/${var.gcp_project_id}/zones/${var.gcp_zone}/instanceGroups/gke-${google_container_cluster.eatech_cluster.name}-general-${random_id.suffix.hex}"
    balancing_mode  = "CONNECTION"
    max_connections = 1000
    capacity_scaler = 1.0
  }

  # WebSocket-specific configuration
  custom_request_headers = [
    "X-WebSocket-Protocol: wss",
    "X-Real-Time: enabled"
  ]

  project = var.gcp_project_id

  depends_on = [google_container_cluster.eatech_cluster]
}

# ========== URL MAPS ==========

# Main URL map for routing
resource "google_compute_url_map" "default" {
  name        = "${var.project_name}-url-map"
  description = "Main URL map for EATECH routing"

  # Default backend for main app
  default_service = google_compute_backend_service.web.id

  # Host-based routing
  host_rule {
    hosts        = ["app.${var.domain_name}"]
    path_matcher = "web-matcher"
  }

  host_rule {
    hosts        = ["api.${var.domain_name}"]
    path_matcher = "api-matcher"
  }

  host_rule {
    hosts        = ["admin.${var.domain_name}"]
    path_matcher = "admin-matcher"
  }

  host_rule {
    hosts        = ["ws.${var.domain_name}"]
    path_matcher = "websocket-matcher"
  }

  # Path matchers
  path_matcher {
    name            = "web-matcher"
    default_service = google_compute_backend_service.web.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api.id
    }

    path_rule {
      paths   = ["/ws/*"]
      service = google_compute_backend_service.websocket.id
    }
  }

  path_matcher {
    name            = "api-matcher"
    default_service = google_compute_backend_service.api.id

    path_rule {
      paths   = ["/v1/*", "/v2/*", "/v3/*"]
      service = google_compute_backend_service.api.id
    }
  }

  path_matcher {
    name            = "admin-matcher"
    default_service = google_compute_backend_service.admin.id
  }

  path_matcher {
    name            = "websocket-matcher"
    default_service = google_compute_backend_service.websocket.id
  }

  project = var.gcp_project_id
}

# URL map for redirecting HTTP to HTTPS
resource "google_compute_url_map" "http_redirect" {
  name        = "${var.project_name}-http-redirect"
  description = "Redirect HTTP to HTTPS"

  default_url_redirect {
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
    https_redirect         = true
  }

  project = var.gcp_project_id
}

# ========== TARGET PROXIES ==========

# HTTPS target proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.project_name}-https-proxy"
  description      = "HTTPS target proxy for EATECH"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [
    google_compute_managed_ssl_certificate.default.id,
    google_compute_managed_ssl_certificate.admin.id
  ]

  # SSL policy for enhanced security
  ssl_policy = google_compute_ssl_policy.eatech_ssl_policy.id

  project = var.gcp_project_id
}

# HTTP target proxy for redirect
resource "google_compute_target_http_proxy" "http_redirect" {
  name    = "${var.project_name}-http-proxy"
  url_map = google_compute_url_map.http_redirect.id

  project = var.gcp_project_id
}

# ========== SSL POLICY ==========

resource "google_compute_ssl_policy" "eatech_ssl_policy" {
  name = "${var.project_name}-ssl-policy"

  description = "SSL policy for enhanced security"

  profile         = "MODERN"
  min_tls_version = "TLS_1_2"

  # Allowed cipher suites for maximum security
  custom_features = [
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256",
    "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256"
  ]

  project = var.gcp_project_id
}

# ========== FORWARDING RULES ==========

# HTTPS forwarding rule
resource "google_compute_global_forwarding_rule" "https" {
  name       = "${var.project_name}-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  ip_address = google_compute_global_address.default.address
  port_range = "443"

  load_balancing_scheme = "EXTERNAL_MANAGED"

  labels = var.resource_labels

  project = var.gcp_project_id
}

# HTTP forwarding rule (for redirect)
resource "google_compute_global_forwarding_rule" "http" {
  name       = "${var.project_name}-http-forwarding-rule"
  target     = google_compute_target_http_proxy.http_redirect.id
  ip_address = google_compute_global_address.default.address
  port_range = "80"

  load_balancing_scheme = "EXTERNAL_MANAGED"

  labels = var.resource_labels

  project = var.gcp_project_id
}

# ========== REGIONAL LOAD BALANCERS ==========

# Internal load balancer for database access
resource "google_compute_forwarding_rule" "database_internal" {
  name                  = "${var.project_name}-database-internal"
  region                = var.gcp_region
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.database.id
  all_ports            = true
  network              = google_compute_network.vpc.id
  subnetwork           = google_compute_subnetwork.database.id

  project = var.gcp_project_id
}

# Regional backend service for database
resource "google_compute_region_backend_service" "database" {
  name                  = "${var.project_name}-database-backend"
  region                = var.gcp_region
  load_balancing_scheme = "INTERNAL"

  health_checks = [google_compute_region_health_check.database.id]

  backend {
    group = google_compute_instance_group.database.id
  }

  project = var.gcp_project_id
}

# Health check for database backend
resource "google_compute_region_health_check" "database" {
  name   = "${var.project_name}-database-health-check"
  region = var.gcp_region

  tcp_health_check {
    port = "5432"
  }

  project = var.gcp_project_id
}

# Instance group for database (placeholder)
resource "google_compute_instance_group" "database" {
  name = "${var.project_name}-database-group"
  zone = var.gcp_zone

  project = var.gcp_project_id
}

# ========== MONITORING AND ALERTING ==========

# Uptime check for main application
resource "google_monitoring_uptime_check_config" "main_app" {
  display_name = "EATECH Main App Uptime Check"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.gcp_project_id
      host       = "app.${var.domain_name}"
    }
  }

  content_matchers {
    content = "EATECH"
    matcher = "CONTAINS_STRING"
  }

  project = var.gcp_project_id
}

# Alert policy for load balancer health
resource "google_monitoring_alert_policy" "lb_health" {
  display_name = "Load Balancer Health Alert"
  combiner     = "OR"

  conditions {
    display_name = "Load balancer backend unhealthy"

    condition_threshold {
      filter         = "resource.type=\"gce_backend_service\" AND metric.type=\"loadbalancing.googleapis.com/https/backend_request_count\""
      duration       = "300s"
      comparison     = "COMPARISON_LESS_THAN"
      threshold_value = 1

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  project = var.gcp_project_id
}

# Notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notifications"
  type         = "email"

  labels = {
    email_address = "alerts@eatech.ch"
  }

  project = var.gcp_project_id
}

# ========== RANDOM SUFFIX ==========

resource "random_id" "suffix" {
  byte_length = 4
}

# ========== OUTPUTS ==========

output "load_balancer_ip" {
  description = "Load balancer IP address"
  value       = google_compute_global_address.default.address
}

output "ssl_certificate_status" {
  description = "SSL certificate status"
  value       = google_compute_managed_ssl_certificate.default.managed[0].status
}

output "backend_services" {
  description = "Backend service information"
  value = {
    web       = google_compute_backend_service.web.name
    api       = google_compute_backend_service.api.name
    admin     = google_compute_backend_service.admin.name
    websocket = google_compute_backend_service.websocket.name
  }
}

output "url_map" {
  description = "URL map name"
  value       = google_compute_url_map.default.name
}

output "forwarding_rules" {
  description = "Forwarding rules"
  value = {
    https = google_compute_global_forwarding_rule.https.name
    http  = google_compute_global_forwarding_rule.http.name
  }
}
