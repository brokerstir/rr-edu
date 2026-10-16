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
  region = "us-east-1" # Or us-west-2, depending on your primary region
}

module "dev_site" {
  source        = "../modules/static_site"
  environment   = "dev"
  domain_name   = "dev.robertrisk.com"
  parent_domain = "robertrisk.com"
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