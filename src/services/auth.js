import {
  signIn,
  confirmSignIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes
} from '@aws-amplify/auth';

/**
 * In-memory tracker for the active OTP verification session
 */
let activeOtpSession = {
  email: '',
  flow: 'NONE', // 'EMAIL_OTP' | 'CUSTOM_CHALLENGE' | 'CONFIRM_SIGN_UP'
  lastSentAt: null,
  nextStep: null
};

export function getActiveOtpSession() {
  return activeOtpSession;
}

export function clearActiveOtpSession() {
  activeOtpSession = {
    email: '',
    flow: 'NONE',
    lastSentAt: null,
    nextStep: null
  };
}

/**
 * Format Cognito and Amplify errors into user-friendly messages
 */
export function formatAuthError(err) {
  if (!err) return 'An unexpected error occurred.';
  const code = err.name || err.code || '';
  const msg = (err.message || '').toString();

  if (code === 'CodeMismatchException') {
    return 'The verification code entered is incorrect. Please check your email and try again.';
  }
  if (code === 'ExpiredCodeException' || msg.toLowerCase().includes('expired')) {
    return 'This verification code has expired. Please click "Resend Code" to receive a new 6-digit code.';
  }
  if (code === 'LimitExceededException' || msg.toLowerCase().includes('limit exceeded') || msg.toLowerCase().includes('exceeded')) {
    return 'Attempt limit exceeded. Please wait a few moments before requesting a new code.';
  }
  if (code === 'UserNotFoundException') {
    return 'Account not found. Please verify your email address.';
  }
  if (code === 'NotAuthorizedException' && (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('challenge'))) {
    return 'Verification session expired. Please enter your email again to receive a fresh code.';
  }
  if (code === 'UserAlreadyAuthenticatedException' || msg.includes('already a signed in user')) {
    return 'You are already signed in.';
  }
  if (code === 'InvalidParameterException') {
    return msg || 'Please verify the details entered.';
  }
  return msg || 'Authentication failed. Please try again.';
}

/**
 * Resolves current authenticated user with profile attributes safely
 */
export async function getCurrentAuthUser() {
  try {
    const currentUser = await getCurrentUser();
    let attributes = {};
    try {
      attributes = await fetchUserAttributes();
    } catch (attrErr) {
      console.warn('Could not fetch user attributes:', attrErr);
    }

    const resolvedEmail = attributes?.email || currentUser?.signInDetails?.loginId || currentUser?.username || '';
    return {
      ...currentUser,
      attributes: {
        ...attributes,
        email: resolvedEmail
      }
    };
  } catch {
    return null;
  }
}

/**
 * Step 1: Initiates passwordless email OTP dispatch without passwords
 * Uses Cognito native `USER_AUTH` + `EMAIL_OTP` with fallback to `CUSTOM_WITHOUT_SRP`
 */
export async function sendOtpChallenge(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const cleanEmail = email.trim().toLowerCase();

  // If already authenticated with active session, return immediately
  const existingUser = await getCurrentAuthUser();
  if (existingUser) {
    return {
      isSignedIn: true,
      user: existingUser,
      step: 'DONE'
    };
  }

  try {
    let signInResult;
    try {
      signInResult = await signIn({
        username: cleanEmail,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'EMAIL_OTP'
        }
      });
    } catch (primaryErr) {
      if (primaryErr.name === 'UserNotFoundException') {
        throw primaryErr;
      }
      // Fallback to CUSTOM_WITHOUT_SRP if custom challenge triggers are deployed
      signInResult = await signIn({
        username: cleanEmail,
        options: {
          authFlowType: 'CUSTOM_WITHOUT_SRP'
        }
      });
    }

    // Process sign-in step response
    const signInStep = signInResult?.nextStep?.signInStep;

    if (signInResult.isSignedIn) {
      clearActiveOtpSession();
      const user = await getCurrentAuthUser();
      return { isSignedIn: true, user, step: 'DONE' };
    }

    if (signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
      activeOtpSession = {
        email: cleanEmail,
        flow: 'EMAIL_OTP',
        lastSentAt: Date.now(),
        nextStep: signInResult.nextStep
      };
      return { isSignedIn: false, step: 'CONFIRM_CODE', email: cleanEmail };
    }

    if (signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
      // User Pool has multiple factors available; explicitly select EMAIL_OTP
      const selectionResult = await confirmSignIn({ challengeResponse: 'EMAIL_OTP' });
      activeOtpSession = {
        email: cleanEmail,
        flow: 'EMAIL_OTP',
        lastSentAt: Date.now(),
        nextStep: selectionResult.nextStep
      };
      return { isSignedIn: false, step: 'CONFIRM_CODE', email: cleanEmail };
    }

    if (signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
      activeOtpSession = {
        email: cleanEmail,
        flow: 'CUSTOM_CHALLENGE',
        lastSentAt: Date.now(),
        nextStep: signInResult.nextStep
      };
      return { isSignedIn: false, step: 'CONFIRM_CODE', email: cleanEmail };
    }

    if (signInStep === 'CONFIRM_SIGN_UP') {
      // User is registered but not confirmed yet
      await resendSignUpCode({ username: cleanEmail });
      activeOtpSession = {
        email: cleanEmail,
        flow: 'CONFIRM_SIGN_UP',
        lastSentAt: Date.now(),
        nextStep: signInResult.nextStep
      };
      return { isSignedIn: false, step: 'CONFIRM_CODE', email: cleanEmail };
    }

    // Default challenge tracking
    activeOtpSession = {
      email: cleanEmail,
      flow: 'EMAIL_OTP',
      lastSentAt: Date.now(),
      nextStep: signInResult.nextStep
    };
    return { isSignedIn: false, step: 'CONFIRM_CODE', email: cleanEmail };

  } catch (err) {
    // If user does not exist in User Pool, seamlessly register them passwordless
    if (err.name === 'UserNotFoundException') {
      return await handlePasswordlessSignUp(cleanEmail);
    }
    throw err;
  }
}

/**
 * Automatically creates passwordless user and triggers verification code
 */
async function handlePasswordlessSignUp(cleanEmail) {
  let signUpRes;
  try {
    signUpRes = await signUp({
      username: cleanEmail,
      options: {
        userAttributes: { email: cleanEmail },
        autoSignIn: { authFlowType: 'USER_AUTH', preferredChallenge: 'EMAIL_OTP' }
      }
    });
  } catch (signUpErr) {
    // If User Pool password policy requires a password on sign-up
    if (
      signUpErr.name === 'InvalidPasswordException' ||
      signUpErr.name === 'InvalidParameterException' ||
      signUpErr.message?.toLowerCase().includes('password')
    ) {
      const generatedInternalKey = `Otp_${crypto.randomUUID()}!Aa1`;
      signUpRes = await signUp({
        username: cleanEmail,
        password: generatedInternalKey,
        options: {
          userAttributes: { email: cleanEmail }
        }
      });
    } else {
      throw signUpErr;
    }
  }

  // If pool auto-confirms users
  if (signUpRes.isSignUpComplete) {
    // User is created; start OTP challenge
    return await sendOtpChallenge(cleanEmail);
  }

  // Standard Cognito verification code sent to user email
  activeOtpSession = {
    email: cleanEmail,
    flow: 'CONFIRM_SIGN_UP',
    lastSentAt: Date.now(),
    nextStep: signUpRes.nextStep
  };

  return {
    isSignedIn: false,
    step: 'CONFIRM_CODE',
    email: cleanEmail
  };
}

/**
 * Step 2: Submits the 6-digit verification code and launches authenticated session
 */
export async function submitOtpCode(code, emailOverride) {
  if (!code || !code.trim()) {
    throw new Error('Please enter your verification code.');
  }

  const cleanCode = code.trim();
  const email = (emailOverride || activeOtpSession.email || '').trim().toLowerCase();

  if (activeOtpSession.flow === 'CONFIRM_SIGN_UP') {
    // Confirm sign up with the code
    await confirmSignUp({
      username: email,
      confirmationCode: cleanCode
    });

    // Sign in the confirmed user with Email OTP
    try {
      const signInResult = await signIn({
        username: email,
        options: { authFlowType: 'USER_AUTH', preferredChallenge: 'EMAIL_OTP' }
      });

      if (signInResult.isSignedIn) {
        clearActiveOtpSession();
        return await getCurrentAuthUser();
      }

      if (
        signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE' ||
        signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE'
      ) {
        activeOtpSession.flow = 'EMAIL_OTP';
        activeOtpSession.nextStep = signInResult.nextStep;
        return { requiresOtpAnswer: true, nextStep: signInResult.nextStep };
      }
    } catch {
      // Fallback sign in attempt
      try {
        await signIn({
          username: email,
          options: { authFlowType: 'CUSTOM_WITHOUT_SRP' }
        });
      } catch (customErr) {
        console.warn('Post-confirmation sign in note:', customErr);
      }
    }
  } else {
    // Submit OTP code for Email OTP or Custom challenge
    const confirmResult = await confirmSignIn({
      challengeResponse: cleanCode
    });

    if (confirmResult.isSignedIn) {
      clearActiveOtpSession();
      return await getCurrentAuthUser();
    }
  }

  const verifiedUser = await getCurrentAuthUser();
  clearActiveOtpSession();
  return verifiedUser;
}

/**
 * Resends the OTP verification code to the active email address
 */
export async function resendOtpCode(emailOverride) {
  const email = (emailOverride || activeOtpSession.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Email address is required to resend verification code.');
  }

  if (activeOtpSession.flow === 'CONFIRM_SIGN_UP') {
    await resendSignUpCode({ username: email });
    activeOtpSession.lastSentAt = Date.now();
    return { success: true, message: 'A new verification code was sent to your email.' };
  }

  return await sendOtpChallenge(email);
}

/**
 * Sign out helper
 */
export async function signOutUser() {
  clearActiveOtpSession();
  await amplifySignOut();
}
