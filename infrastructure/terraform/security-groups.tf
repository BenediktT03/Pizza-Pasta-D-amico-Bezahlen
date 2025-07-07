# EATECH V3.0 - Security Groups and Firewall Rules
# Comprehensive security configuration with Swiss compliance
# Zero-trust network security with layered protection

# ========== FIREWALL RULES - INGRESS ==========

# Allow internal communication within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_name}-allow-internal"
  network = google_compute_network.vpc.name

  description = "Allow internal communication within VPC"

  allow {
    protocol = "tcp"
    ports    = ["1-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["1-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.vpc_cidr,
    "10.10.0.0/14",  # K8s pod range
    "10.20.0.0/16"   # K8s service range
  ]

  target_tags = ["eatech-internal"]

  project = var.gcp_project_id
}

# Allow SSH access from admin networks
resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.project_name}-allow-ssh"
  network = google_compute_network.vpc.name

  description = "Allow SSH access from authorized networks"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.allowed_ip_ranges
  target_tags   = ["ssh-allowed"]

  project = var.gcp_project_id
}

# Allow HTTP traffic to load balancers
resource "google_compute_firewall" "allow_http" {
  name    = "${var.project_name}-allow-http"
  network = google_compute_network.vpc.name

  description = "Allow HTTP traffic to load balancers"

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server", "load-balancer"]

  project = var.gcp_project_id
}

# Allow HTTPS traffic to load balancers
resource "google_compute_firewall" "allow_https" {
  name    = "${var.project_name}-allow-https"
  network = google_compute_network.vpc.name

  description = "Allow HTTPS traffic to load balancers"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["https-server", "load-balancer"]

  project = var.gcp_project_id
}

# Allow GKE master access
resource "google_compute_firewall" "allow_gke_master" {
  name    = "${var.project_name}-allow-gke-master"
  network = google_compute_network.vpc.name

  description = "Allow GKE master to access nodes"

  allow {
    protocol = "tcp"
    ports    = ["10250", "443"]
  }

  source_ranges = ["172.16.0.0/28"]  # GKE master CIDR
  target_tags   = ["gke-node"]

  project = var.gcp_project_id
}

# Allow health check probes
resource "google_compute_firewall" "allow_health_check" {
  name    = "${var.project_name}-allow-health-check"
  network = google_compute_network.vpc.name

  description = "Allow Google Cloud health check probes"

  allow {
    protocol = "tcp"
  }

  source_ranges = [
    "130.211.0.0/22",
    "35.191.0.0/16"
  ]

  target_tags = ["health-check"]

  project = var.gcp_project_id
}

# Allow customer application ports
resource "google_compute_firewall" "allow_customer_app" {
  name    = "${var.project_name}-allow-customer-app"
  network = google_compute_network.vpc.name

  description = "Allow customer application traffic"

  allow {
    protocol = "tcp"
    ports    = ["3000", "8080"]
  }

  source_tags = ["load-balancer"]
  target_tags = ["eatech-web", "eatech-functions"]

  project = var.gcp_project_id
}

# Allow admin dashboard access (restricted)
resource "google_compute_firewall" "allow_admin_app" {
  name    = "${var.project_name}-allow-admin-app"
  network = google_compute_network.vpc.name

  description = "Allow admin dashboard access from authorized networks"

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3001"]
  }

  source_ranges = var.allowed_ip_ranges
  target_tags   = ["eatech-admin"]

  project = var.gcp_project_id
}

# Allow master control access (maximum security)
resource "google_compute_firewall" "allow_master_control" {
  name    = "${var.project_name}-allow-master-control"
  network = google_compute_network.vpc.name

  description = "Allow master control access with maximum security"

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8443"]
  }

  # Very restrictive IP ranges for master control
  source_ranges = [
    "10.0.0.0/8"  # Internal only - update with specific admin IPs
  ]

  target_tags = ["eatech-master", "master-control"]

  project = var.gcp_project_id
}

# Allow WebSocket connections
resource "google_compute_firewall" "allow_websocket" {
  name    = "${var.project_name}-allow-websocket"
  network = google_compute_network.vpc.name

  description = "Allow WebSocket connections for real-time features"

  allow {
    protocol = "tcp"
    ports    = ["3001", "8080"]
  }

  source_tags = ["load-balancer"]
  target_tags = ["eatech-websocket"]

  project = var.gcp_project_id
}

# Allow database access (private only)
resource "google_compute_firewall" "allow_database" {
  name    = "${var.project_name}-allow-database"
  network = google_compute_network.vpc.name

  description = "Allow database access from application tier"

  allow {
    protocol = "tcp"
    ports    = ["5432", "6379"]  # PostgreSQL and Redis
  }

  source_tags = ["eatech-functions", "eatech-web", "eatech-admin"]
  target_tags = ["database", "postgres", "redis"]

  project = var.gcp_project_id
}

# Allow monitoring access
resource "google_compute_firewall" "allow_monitoring" {
  name    = "${var.project_name}-allow-monitoring"
  network = google_compute_network.vpc.name

  description = "Allow monitoring and observability traffic"

  allow {
    protocol = "tcp"
    ports    = ["9090", "9091", "9093", "3000", "8080"]  # Prometheus, Grafana, etc.
  }

  source_tags = ["monitoring", "prometheus", "grafana"]
  target_tags = ["eatech-web", "eatech-admin", "eatech-functions", "monitoring"]

  project = var.gcp_project_id
}

# ========== FIREWALL RULES - EGRESS ==========

# Deny all egress by default (whitelist approach)
resource "google_compute_firewall" "deny_all_egress" {
  name      = "${var.project_name}-deny-all-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 65534

  description = "Deny all egress traffic by default"

  deny {
    protocol = "all"
  }

  destination_ranges = ["0.0.0.0/0"]

  project = var.gcp_project_id
}

# Allow internal egress
resource "google_compute_firewall" "allow_internal_egress" {
  name      = "${var.project_name}-allow-internal-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 1000

  description = "Allow internal egress traffic"

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  destination_ranges = [
    var.vpc_cidr,
    "10.10.0.0/14",
    "10.20.0.0/16"
  ]

  target_tags = ["eatech-internal"]

  project = var.gcp_project_id
}

# Allow HTTPS egress for API calls
resource "google_compute_firewall" "allow_https_egress" {
  name      = "${var.project_name}-allow-https-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 1000

  description = "Allow HTTPS egress for external API calls"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  destination_ranges = ["0.0.0.0/0"]
  target_tags       = ["external-api-access"]

  project = var.gcp_project_id
}

# Allow DNS egress
resource "google_compute_firewall" "allow_dns_egress" {
  name      = "${var.project_name}-allow-dns-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 1000

  description = "Allow DNS resolution"

  allow {
    protocol = "tcp"
    ports    = ["53"]
  }

  allow {
    protocol = "udp"
    ports    = ["53"]
  }

  destination_ranges = ["0.0.0.0/0"]
  target_tags       = ["dns-access"]

  project = var.gcp_project_id
}

# Allow NTP egress
resource "google_compute_firewall" "allow_ntp_egress" {
  name      = "${var.project_name}-allow-ntp-egress"
  network   = google_compute_network.vpc.name
  direction = "EGRESS"
  priority  = 1000

  description = "Allow NTP time synchronization"

  allow {
    protocol = "udp"
    ports    = ["123"]
  }

  destination_ranges = ["0.0.0.0/0"]
  target_tags       = ["ntp-access"]

  project = var.gcp_project_id
}

# ========== ADVANCED SECURITY RULES ==========

# Block suspicious traffic patterns
resource "google_compute_firewall" "block_suspicious" {
  name     = "${var.project_name}-block-suspicious"
  network  = google_compute_network.vpc.name
  priority = 500

  description = "Block suspicious traffic patterns"

  deny {
    protocol = "tcp"
    ports    = [
      "23",    # Telnet
      "135",   # RPC
      "139",   # NetBIOS
      "445",   # SMB
      "1433",  # SQL Server
      "1521",  # Oracle
      "3389",  # RDP
      "5432",  # PostgreSQL (public)
      "6379",  # Redis (public)
      "27017", # MongoDB
    ]
  }

  source_ranges = ["0.0.0.0/0"]

  project = var.gcp_project_id
}

# Allow emergency access
resource "google_compute_firewall" "emergency_access" {
  name    = "${var.project_name}-emergency-access"
  network = google_compute_network.vpc.name

  description = "Emergency access for critical situations"
  disabled    = true  # Enable only during emergencies

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443"]
  }

  source_ranges = [
    "0.0.0.0/0"  # Update with emergency IP ranges
  ]

  target_tags = ["emergency-access"]

  project = var.gcp_project_id
}

# ========== SECURITY POLICIES ==========

# Cloud Armor security policy
resource "google_compute_security_policy" "eatech_security_policy" {
  name        = "${var.project_name}-security-policy"
  description = "EATECH security policy with WAF protection"

  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default allow rule"
  }

  # Block known malicious IPs
  rule {
    action   = "deny(403)"
    priority = "1000"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          # Add known malicious IP ranges
          "192.0.2.0/24",
          "198.51.100.0/24",
          "203.0.113.0/24"
        ]
      }
    }

    description = "Block known malicious IPs"
  }

  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "2000"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"

      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }

      ban_duration_sec = 600  # 10 minutes
    }

    description = "Rate limiting protection"
  }

  # SQL injection protection
  rule {
    action   = "deny(403)"
    priority = "3000"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }

    description = "SQL injection protection"
  }

  # XSS protection
  rule {
    action   = "deny(403)"
    priority = "3001"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }

    description = "XSS protection"
  }

  # Local file inclusion protection
  rule {
    action   = "deny(403)"
    priority = "3002"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('lfi-stable')"
      }
    }

    description = "Local file inclusion protection"
  }

  # Remote code execution protection
  rule {
    action   = "deny(403)"
    priority = "3003"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rce-stable')"
      }
    }

    description = "Remote code execution protection"
  }

  # Protocol attack protection
  rule {
    action   = "deny(403)"
    priority = "3004"

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('protocolattack-stable')"
      }
    }

    description = "Protocol attack protection"
  }

  # Admin panel protection
  rule {
    action   = "deny(403)"
    priority = "4000"

    match {
      expr {
        expression = "request.headers['host'].contains('admin.eatech.ch') && !inIpRange(origin.ip, '10.0.0.0/8')"
      }
    }

    description = "Restrict admin access to internal networks"
  }

  # Master control protection
  rule {
    action   = "deny(403)"
    priority = "4001"

    match {
      expr {
        expression = "request.headers['host'].contains('master.eatech.ch') && !inIpRange(origin.ip, '10.0.0.0/8')"
      }
    }

    description = "Restrict master control access to internal networks"
  }

  project = var.gcp_project_id
}

# ========== NETWORK SECURITY GROUPS ==========

# Define security groups using network tags
locals {
  security_groups = {
    # Public tier - Load balancers and external access
    public_tier = [
      "eatech-public",
      "load-balancer",
      "external-access",
      "http-server",
      "https-server",
      "health-check"
    ]

    # Application tier - Web and API services
    application_tier = [
      "eatech-private",
      "eatech-web",
      "eatech-functions",
      "eatech-websocket",
      "gke-node",
      "external-api-access",
      "dns-access",
      "ntp-access"
    ]

    # Admin tier - Admin dashboard and tools
    admin_tier = [
      "eatech-admin",
      "ssh-allowed",
      "monitoring",
      "external-api-access",
      "dns-access"
    ]

    # Master tier - Master control system
    master_tier = [
      "eatech-master",
      "master-control",
      "maximum-security",
      "external-api-access",
      "dns-access"
    ]

    # Database tier - Managed databases
    database_tier = [
      "eatech-database",
      "database",
      "postgres",
      "redis",
      "private-only"
    ]

    # Monitoring tier - Observability services
    monitoring_tier = [
      "monitoring",
      "prometheus",
      "grafana",
      "external-api-access",
      "dns-access"
    ]
  }
}

# ========== IAM SECURITY POLICIES ==========

# Binary Authorization policy
resource "google_binary_authorization_policy" "eatech_policy" {
  count = var.security_config.enable_binary_authorization ? 1 : 0

  admission_whitelist_patterns {
    name_pattern = "gcr.io/${var.gcp_project_id}/*"
  }

  admission_whitelist_patterns {
    name_pattern = "eu.gcr.io/${var.gcp_project_id}/*"
  }

  default_admission_rule {
    evaluation_mode  = "REQUIRE_ATTESTATION"
    enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"

    require_attestations_by = [
      google_binary_authorization_attestor.eatech_attestor[0].name
    ]
  }

  project = var.gcp_project_id
}

# Binary Authorization attestor
resource "google_binary_authorization_attestor" "eatech_attestor" {
  count = var.security_config.enable_binary_authorization ? 1 : 0

  name = "eatech-attestor"

  attestation_authority_note {
    note_reference = google_container_analysis_note.eatech_note[0].name

    public_keys {
      ascii_armored_pgp_public_key = file("${path.module}/attestor-public-key.asc")
    }
  }

  project = var.gcp_project_id
}

# Container Analysis note
resource "google_container_analysis_note" "eatech_note" {
  count = var.security_config.enable_binary_authorization ? 1 : 0

  name = "eatech-attestor-note"

  attestation_authority {
    hint {
      human_readable_name = "EATECH Production Attestor"
    }
  }

  project = var.gcp_project_id
}

# ========== OUTPUTS ==========

output "security_policy_name" {
  description = "Cloud Armor security policy name"
  value       = google_compute_security_policy.eatech_security_policy.name
}

output "firewall_rules" {
  description = "Created firewall rules"
  value = {
    allow_internal     = google_compute_firewall.allow_internal.name
    allow_ssh         = google_compute_firewall.allow_ssh.name
    allow_http        = google_compute_firewall.allow_http.name
    allow_https       = google_compute_firewall.allow_https.name
    allow_health_check = google_compute_firewall.allow_health_check.name
    deny_all_egress   = google_compute_firewall.deny_all_egress.name
  }
}

output "security_groups" {
  description = "Network security groups (tags)"
  value       = local.security_groups
}
