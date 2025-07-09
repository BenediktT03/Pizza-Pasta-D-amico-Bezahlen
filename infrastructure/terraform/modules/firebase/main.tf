# Firebase Module for EATECH Platform
# This module manages Firebase project resources and configurations

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west6" # Zurich
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "firebase_config" {
  description = "Firebase configuration"
  type = object({
    database_url = string
    storage_bucket = string
    messaging_sender_id = string
    app_id = string
    measurement_id = string
  })
}

# Enable required APIs
resource "google_project_service" "firebase" {
  project = var.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase_auth" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase_storage" {
  project = var.project_id
  service = "storage.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase_hosting" {
  project = var.project_id
  service = "firebasehosting.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "cloud_functions" {
  project = var.project_id
  service = "cloudfunctions.googleapis.com"

  disable_on_destroy = false
}

# Firestore Database
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Swiss data residency
  concurrency_mode = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"

  depends_on = [google_project_service.firestore]
}

# Firestore Security Rules
resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file("${path.root}/../../firestore.rules")
    }
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firebaserules_release" "firestore" {
  project      = var.project_id
  release_id   = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
}

# Firestore Indexes
resource "google_firestore_index" "orders_tenant_created" {
  project    = var.project_id
  collection = "orders"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firestore_index" "orders_tenant_status" {
  project    = var.project_id
  collection = "orders"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firestore_index" "products_tenant_active" {
  project    = var.project_id
  collection = "products"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "active"
    order      = "ASCENDING"
  }

  fields {
    field_path = "sortOrder"
    order      = "ASCENDING"
  }

  depends_on = [google_firestore_database.database]
}

# Storage Bucket
resource "google_storage_bucket" "firebase_storage" {
  project  = var.project_id
  name     = "${var.project_id}.appspot.com"
  location = var.region

  # Swiss data residency
  storage_class = "STANDARD"
  
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.firebase_storage]
}

# Storage Security Rules
resource "google_firebaserules_ruleset" "storage" {
  project = var.project_id
  source {
    files {
      name = "storage.rules"
      content = <<-EOT
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /tenants/{tenantId}/{allPaths=**} {
              allow read: if request.auth != null && 
                request.auth.token.tenantId == tenantId;
              allow write: if request.auth != null && 
                request.auth.token.tenantId == tenantId &&
                request.auth.token.role in ['admin', 'manager'];
            }
            
            match /public/{allPaths=**} {
              allow read;
            }
          }
        }
      EOT
    }
  }

  depends_on = [google_storage_bucket.firebase_storage]
}

resource "google_firebaserules_release" "storage" {
  project      = var.project_id
  release_id   = "firebase.storage/${google_storage_bucket.firebase_storage.name}"
  ruleset_name = google_firebaserules_ruleset.storage.name

  depends_on = [google_firebaserules_ruleset.storage]
}

# Firebase Hosting Sites
resource "google_firebase_hosting_site" "web" {
  project  = var.project_id
  site_id  = "${var.project_id}-web-${var.environment}"

  depends_on = [google_project_service.firebase_hosting]
}

resource "google_firebase_hosting_site" "admin" {
  project  = var.project_id
  site_id  = "${var.project_id}-admin-${var.environment}"

  depends_on = [google_project_service.firebase_hosting]
}

resource "google_firebase_hosting_site" "master" {
  project  = var.project_id
  site_id  = "${var.project_id}-master-${var.environment}"

  depends_on = [google_project_service.firebase_hosting]
}

# Service Account for Functions
resource "google_service_account" "functions" {
  project      = var.project_id
  account_id   = "eatech-functions-${var.environment}"
  display_name = "EATECH Functions Service Account"
  description  = "Service account for Cloud Functions in ${var.environment}"
}

# IAM Roles for Functions Service Account
resource "google_project_iam_member" "functions_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

resource "google_project_iam_member" "functions_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

resource "google_project_iam_member" "functions_auth" {
  project = var.project_id
  role    = "roles/firebase.auth.admin"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Outputs
output "firebase_config" {
  value = {
    project_id           = var.project_id
    database_url        = var.firebase_config.database_url
    storage_bucket      = google_storage_bucket.firebase_storage.name
    hosting_site_web    = google_firebase_hosting_site.web.site_id
    hosting_site_admin  = google_firebase_hosting_site.admin.site_id
    hosting_site_master = google_firebase_hosting_site.master.site_id
    functions_sa_email  = google_service_account.functions.email
  }
  sensitive = true
}

output "firestore_database" {
  value = {
    name     = google_firestore_database.database.name
    location = google_firestore_database.database.location_id
  }
}

output "storage_bucket" {
  value = {
    name     = google_storage_bucket.firebase_storage.name
    location = google_storage_bucket.firebase_storage.location
    url      = google_storage_bucket.firebase_storage.url
  }
}
