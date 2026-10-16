# 1. Fetch Route 53 Hosted Zone
data "aws_route53_zone" "primary" {
  name         = var.parent_domain
  private_zone = false
}

# 2. S3 Bucket (Private, No Public Access)
resource "aws_s3_bucket" "app_bucket" {
  bucket        = "rr-edu-${var.environment}-${replace(var.domain_name, ".", "-")}"
  force_destroy = true # Allows easy "nuke and repave"
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket                  = aws_s3_bucket.app_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. AWS Certificate Manager (US-East-1 required for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 4. Route 53 DNS Validation Record for ACM Certificate
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.zone_id
}

resource "aws_acm_certificate_validation" "cert_valid" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# 5. CloudFront Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "rr-edu-oac-${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 6. CloudFront Distribution (HTTPS + SPA Fallback)
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.app_bucket.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.app_bucket.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.app_bucket.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # SPA Routing: Redirect 403/404 to index.html for React Router
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert_valid.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# 7. S3 Bucket Policy (Allows ONLY CloudFront OAC)
data "aws_iam_policy_document" "s3_oac_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.app_bucket.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.app_bucket.id
  policy = data.aws_iam_policy_document.s3_oac_policy.json
}

# 8. Route 53 Alias Record pointing subdomain to CloudFront
resource "aws_route53_record" "dns_alias" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# ==============================================================================
# COGNITO AUTHENTICATION
# ==============================================================================

# 1. Cognito User Pool
resource "aws_cognito_user_pool" "pool" {
  name = "rr-edu-user-pool-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your RR-EDU Verification Code"
    email_message        = "Welcome to RR-EDU! Your verification code is {####}."
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# 2. Cognito Domain Prefix (required for hosted OAuth / Social flows)
resource "aws_cognito_user_pool_domain" "domain" {
  domain       = "auth-${var.environment}-${replace(var.parent_domain, ".", "-")}"
  user_pool_id = aws_cognito_user_pool.pool.id
}

# 3. Google Identity Provider Resource
resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "email profile openid"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# 4. Cognito User Pool Client (Web App Client with PKCE & Social Auth)
resource "aws_cognito_user_pool_client" "client" {
  name         = "rr-edu-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret = false # False required for browser single-page apps (SPAs)

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  supported_identity_providers = var.google_client_id != "" ? ["COGNITO", "Google"] : ["COGNITO"]

  callback_urls = [
    "http://localhost:5173",
    "https://${var.domain_name}"
  ]

  logout_urls = [
    "http://localhost:5173",
    "https://${var.domain_name}"
  ]

  depends_on = [aws_cognito_identity_provider.google]
}

# 5. Cognito Identity Pool (Federated Identities for Direct AWS Service Access)
resource "aws_cognito_identity_pool" "identity_pool" {
  identity_pool_name               = "rredu_identity_pool_${var.environment}"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.client.id
    provider_name           = aws_cognito_user_pool.pool.endpoint
    server_side_token_check = false
  }
}

# IAM Role for Authenticated Cognito Users
resource "aws_iam_role" "authenticated_user" {
  name = "rr-edu-authenticated-user-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

# Attach IAM Authenticated Role to Identity Pool
resource "aws_cognito_identity_pool_roles_attachment" "roles_attach" {
  identity_pool_id = aws_cognito_identity_pool.identity_pool.id

  roles = {
    authenticated = aws_iam_role.authenticated_user.arn
  }
}

# ==============================================================================
# DYNAMODB TABLE (SINGLE-TABLE DESIGN)
# ==============================================================================

resource "aws_dynamodb_table" "app_data" {
  name         = "rr-edu-data-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # On-Demand / Free-tier friendly
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index for Reverse Lookups (e.g., Students in a Class)
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "RR-EDU"
  }
}

# IAM Policy for Authenticated Cognito Users to access DynamoDB
resource "aws_iam_role_policy" "cognito_dynamo_policy" {
  name = "rr-edu-cognito-dynamo-policy-${var.environment}"
  role = aws_iam_role.authenticated_user.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.app_data.arn,
          "${aws_dynamodb_table.app_data.arn}/index/*"
        ]
        # Restricts authenticated browser sessions strictly to their own partition
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "USER#$${cognito-identity.amazonaws.com:sub}*"
            ]
          }
        }
      }
    ]
  })
}