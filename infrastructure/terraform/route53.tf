# =====================================================
# EATECH V3.0 - Route53 DNS Configuration
# Multi-Tenant Foodtruck Ordering System
# Swiss Data Residency & Global CDN Support
# =====================================================

# Primary hosted zone for eatech.ch
resource "aws_route53_zone" "primary" {
  name              = var.domain_name
  comment           = "EATECH V3.0 Production Domain"
  delegation_set_id = aws_route53_delegation_set.main.id

  tags = {
    Name        = "EATECH Production"
    Environment = var.environment
    Project     = "eatech-v3"
    ManagedBy   = "terraform"
    DataCenter  = "eu-west-1"
  }
}

# Delegation set for consistent nameservers
resource "aws_route53_delegation_set" "main" {
  reference_name = "eatech-production"
}

# =====================================================
# CORE APPLICATION DOMAINS
# =====================================================

# Main application - Vercel deployment
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_deployment_url]

  depends_on = [aws_route53_zone.primary]
}

# Admin dashboard
resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "admin.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_admin_url]
}

# Master control system
resource "aws_route53_record" "master" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "master.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_master_url]
}

# API Gateway
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# WebSocket connections
resource "aws_route53_record" "ws" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# =====================================================
# CDN & STATIC ASSETS
# =====================================================

# CDN for static assets and images
resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "cdn.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# Image optimization service
resource "aws_route53_record" "images" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "images.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.images.domain_name
    zone_id                = aws_cloudfront_distribution.images.hosted_zone_id
    evaluate_target_health = false
  }
}

# =====================================================
# MULTI-TENANT SUBDOMAINS
# =====================================================

# Wildcard for tenant subdomains (*.eatech.ch)
resource "aws_route53_record" "wildcard" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tenant_wildcard.domain_name
    zone_id                = aws_cloudfront_distribution.tenant_wildcard.hosted_zone_id
    evaluate_target_health = false
  }
}

# Custom tenant domain support (optional)
resource "aws_route53_record" "tenant_custom" {
  for_each = var.custom_tenant_domains

  zone_id = data.aws_route53_zone.tenant_zone[each.key].zone_id
  name    = each.value.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tenant_custom[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.tenant_custom[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}

# =====================================================
# MONITORING & OPERATIONS
# =====================================================

# Status page
resource "aws_route53_record" "status" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "status.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.statuspage_url]
}

# Documentation
resource "aws_route53_record" "docs" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "docs.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.docs_url]
}

# Monitoring endpoint
resource "aws_route53_record" "monitoring" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "monitoring.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.monitoring.dns_name
    zone_id                = aws_lb.monitoring.zone_id
    evaluate_target_health = true
  }
}

# =====================================================
# EMAIL & COMMUNICATION
# =====================================================

# Email (SendGrid)
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 300
  records = [
    "10 mail.${var.domain_name}",
    "20 backup-mail.${var.domain_name}"
  ]
}

# DKIM for SendGrid
resource "aws_route53_record" "dkim" {
  count   = length(var.sendgrid_dkim_keys)
  zone_id = aws_route53_zone.primary.zone_id
  name    = "${var.sendgrid_dkim_keys[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${var.sendgrid_dkim_keys[count.index]}.dkim.sendgrid.net"]
}

# SPF record
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  records = [
    "v=spf1 include:sendgrid.net include:_spf.google.com -all"
  ]
}

# DMARC policy
resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain_name}; ruf=mailto:dmarc@${var.domain_name}; sp=quarantine; adkim=s; aspf=s;"
  ]
}

# =====================================================
# SECURITY & VERIFICATION
# =====================================================

# Security.txt
resource "aws_route53_record" "security_txt" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  records = [
    "security=https://${var.domain_name}/.well-known/security.txt"
  ]
}

# CAA records for SSL certificate authority authorization
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "CAA"
  ttl     = 300
  records = [
    "0 issue \"letsencrypt.org\"",
    "0 issue \"amazon.com\"",
    "0 issue \"digicert.com\"",
    "0 iodef \"mailto:security@${var.domain_name}\""
  ]
}

# =====================================================
# HEALTH CHECKS & MONITORING
# =====================================================

# Health check for main application
resource "aws_route53_health_check" "app" {
  fqdn                            = "app.${var.domain_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/api/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_alarm_region         = var.aws_region
  cloudwatch_alarm_name           = "eatech-app-health"
  insufficient_data_health_status = "Failure"
  measure_latency                 = true
  invert_healthcheck             = false

  tags = {
    Name        = "EATECH App Health Check"
    Environment = var.environment
  }
}

# Health check for API
resource "aws_route53_health_check" "api" {
  fqdn                            = "api.${var.domain_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 2
  request_interval                = 10
  cloudwatch_alarm_region         = var.aws_region
  cloudwatch_alarm_name           = "eatech-api-health"
  insufficient_data_health_status = "Failure"
  measure_latency                 = true

  tags = {
    Name        = "EATECH API Health Check"
    Environment = var.environment
  }
}

# Failover configuration for API
resource "aws_route53_record" "api_primary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }

  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.api.id
}

resource "aws_route53_record" "api_secondary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.backup.dns_name
    zone_id                = aws_lb.backup.zone_id
    evaluate_target_health = true
  }

  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }
}

# =====================================================
# REGIONAL ROUTING (Swiss Priority)
# =====================================================

# Geolocation routing for Swiss users
resource "aws_route53_record" "app_swiss" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.swiss.dns_name
    zone_id                = aws_lb.swiss.zone_id
    evaluate_target_health = true
  }

  set_identifier = "swiss-users"

  geolocation_routing_policy {
    country = "CH"
  }

  health_check_id = aws_route53_health_check.app.id
}

# EU users routing
resource "aws_route53_record" "app_eu" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.eu.dns_name
    zone_id                = aws_lb.eu.zone_id
    evaluate_target_health = true
  }

  set_identifier = "eu-users"

  geolocation_routing_policy {
    continent = "EU"
  }
}

# Default routing for other regions
resource "aws_route53_record" "app_default" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.global.dns_name
    zone_id                = aws_lb.global.zone_id
    evaluate_target_health = true
  }

  set_identifier = "default"

  geolocation_routing_policy {
    country = "*"
  }
}

# =====================================================
# DEVELOPMENT & STAGING
# =====================================================

# Staging environment
resource "aws_route53_record" "staging" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "staging.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_staging_url]
}

# Development environment
resource "aws_route53_record" "dev" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "dev.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_dev_url]
}

# =====================================================
# QR CODE LANDING PAGES
# =====================================================

# Short URL for QR codes
resource "aws_route53_record" "qr" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "qr.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.qr_redirects.domain_name
    zone_id                = aws_cloudfront_distribution.qr_redirects.hosted_zone_id
    evaluate_target_health = false
  }
}

# Menu QR codes
resource "aws_route53_record" "menu" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "menu.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.menu_pages.domain_name
    zone_id                = aws_cloudfront_distribution.menu_pages.hosted_zone_id
    evaluate_target_health = false
  }
}

# =====================================================
# OUTPUTS
# =====================================================

# Export nameservers for domain configuration
output "nameservers" {
  description = "Route53 nameservers for domain configuration"
  value       = aws_route53_zone.primary.name_servers
}

# Zone ID for other resources
output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.primary.zone_id
}

# Health check IDs
output "health_check_ids" {
  description = "Health check IDs for monitoring"
  value = {
    app = aws_route53_health_check.app.id
    api = aws_route53_health_check.api.id
  }
}

# Domain verification records
output "verification_records" {
  description = "DNS records for domain verification"
  value = {
    txt_verification = aws_route53_record.spf.records[0]
    mx_records      = aws_route53_record.mx.records
    caa_records     = aws_route53_record.caa.records
  }
}

# =====================================================
# DATA SOURCES
# =====================================================

# External tenant domain zones
data "aws_route53_zone" "tenant_zone" {
  for_each = var.custom_tenant_domains
  name     = each.value.zone_name
}

# =====================================================
# LOCALS
# =====================================================

locals {
  # Common record configuration
  common_record_config = {
    allow_overwrite = false
    ttl            = 300
  }

  # Health check regions for enhanced monitoring
  health_check_regions = [
    "eu-west-1",      # Ireland (closest to Switzerland)
    "eu-central-1",   # Frankfurt
    "us-east-1",      # Virginia
    "ap-southeast-1", # Singapore
    "sa-east-1"       # São Paulo
  ]

  # Swiss data residency compliance
  swiss_compliant_regions = [
    "eu-west-1",
    "eu-central-1",
    "eu-west-3"
  ]
}

# =====================================================
# CONDITIONAL RESOURCES
# =====================================================

# Beta testing subdomain (only in development)
resource "aws_route53_record" "beta" {
  count   = var.enable_beta_testing ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "beta.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_beta_url]

  lifecycle {
    prevent_destroy = false
  }
}

# Maintenance page
resource "aws_route53_record" "maintenance" {
  count   = var.enable_maintenance_mode ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = "maintenance.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.maintenance.domain_name
    zone_id                = aws_cloudfront_distribution.maintenance.hosted_zone_id
    evaluate_target_health = false
  }
}
