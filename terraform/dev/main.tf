# terraform/dev/main.tf

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Declare variables to accept values from terraform.tfvars
variable "google_client_id" {
  type    = string
  default = ""
}

variable "google_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

module "dev_site" {
  source               = "../modules/static_site"
  environment          = "dev"
  domain_name          = "dev.robertrisk.com"
  parent_domain        = "robertrisk.com"
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

output "s3_bucket" {
  value = module.dev_site.s3_bucket_name
}

output "cloudfront_id" {
  value = module.dev_site.cloudfront_distribution_id
}

output "dev_url" {
  value = module.dev_site.site_url
}

output "user_pool_id" {
  value = module.dev_site.user_pool_id
}

output "user_pool_client_id" {
  value = module.dev_site.user_pool_client_id
}

output "identity_pool_id" {
  value = module.dev_site.identity_pool_id
}