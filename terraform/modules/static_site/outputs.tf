output "s3_bucket_name" {
  value = aws_s3_bucket.app_bucket.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}

output "site_url" {
  value = "https://${var.domain_name}"
}

output "user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

output "identity_pool_id" {
  value = aws_cognito_identity_pool.identity_pool.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.app_data.name
}