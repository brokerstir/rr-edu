variable "environment" {
  type        = string
  description = "Environment name (dev or prod)"
}

variable "domain_name" {
  type        = string
  description = "Domain name for this environment (e.g. dev.robertrisk.com)"
}

variable "parent_domain" {
  type        = string
  default     = "robertrisk.com"
  description = "Parent Route 53 domain name"
}

variable "google_client_id" {
  type        = string
  description = "Google OAuth Client ID"
  default     = ""
}

variable "google_client_secret" {
  type        = string
  description = "Google OAuth Client Secret"
  sensitive   = true
  default     = ""
}