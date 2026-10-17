/**
 * AWS Amplify Configuration for dev.robertrisk.com
 * Generated from Terraform outputs
 * Configured for Passwordless Email OTP / Custom Auth Challenge flow
 */
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_yvS6Cr6HM',
      userPoolClientId: 'sco0hbd3803d3vsmrc0t412f2',
      identityPoolId: 'us-east-1:f7a57f26-690b-4142-9bde-67c01334c8ad',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        oauth: {
          domain: 'auth-dev-robertrisk-com.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: ['https://dev.robertrisk.com', 'http://localhost:5173'],
          redirectSignOut: ['https://dev.robertrisk.com', 'http://localhost:5173'],
          responseType: 'code'
        }
      },
      passwordless: {
        emailOtpEnabled: true,
        preferredChallenge: 'EMAIL_OTP'
      }
    }
  }
};

export default awsConfig;