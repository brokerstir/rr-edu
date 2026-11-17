/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Hub } from 'aws-amplify/utils';
import {
  sendOtpChallenge,
  submitOtpCode,
  resendOtpCode,
  getCurrentAuthUser,
  signOutUser,
  formatAuthError
} from '../services/auth';
import { syncUserProfile } from '../services/dbService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const userData = await getCurrentAuthUser();
      if (userData) {
        let profile = null;
        try {
          profile = await syncUserProfile(userData);
        } catch (syncErr) {
          console.warn('Could not sync user profile in checkUser:', syncErr);
        }
        const enrichedUser = {
          ...userData,
          role: profile?.role || 'student',
          tier: profile?.tier || 'free'
        };
        setUser(enrichedUser);
        return enrichedUser;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    checkUser().then(() => {
      if (ignore) return;
    });

    // Listen for auth state events from Amplify Hub
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload?.event) {
        case 'signedIn':
        case 'autoSignIn':
          checkUser();
          break;
        case 'signedOut':
          setUser(null);
          break;
        default:
          break;
      }
    });

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [checkUser]);

  // Step 1: Send OTP code to email
  const handleSendOtp = async (email) => {
    return await sendOtpChallenge(email);
  };

  // Step 2: Verify 6-digit OTP code and launch authenticated session
  const handleVerifyOtp = async (code, email) => {
    const verifiedUser = await submitOtpCode(code, email);
    if (verifiedUser) {
      let profile = null;
      try {
        profile = await syncUserProfile(verifiedUser);
      } catch (syncErr) {
        console.warn('Could not sync profile upon verifyOtp:', syncErr);
      }
      const enrichedUser = {
        ...verifiedUser,
        role: profile?.role || 'student',
        tier: profile?.tier || 'free'
      };
      setUser(enrichedUser);
      return enrichedUser;
    }
    return verifiedUser;
  };

  // Resend OTP code
  const handleResendOtp = async (email) => {
    return await resendOtpCode(email);
  };

  // Backward-compatible signIn interface (now passwordless email OTP)
  const handleSignIn = async (credentials) => {
    const email = (typeof credentials === 'object' && credentials !== null)
      ? (credentials.username || credentials.email)
      : credentials;
    return await sendOtpChallenge(email);
  };

  // Backward-compatible signUp interface
  const handleSignUp = async (params) => {
    const email = (typeof params === 'object' && params !== null)
      ? (params.username || params.email)
      : params;
    return await sendOtpChallenge(email);
  };

  // Backward-compatible confirmSignUp interface
  const handleConfirmSignUp = async (params, maybeCode) => {
    const code = (typeof params === 'object' && params !== null)
      ? params.confirmationCode
      : maybeCode;
    const email = (typeof params === 'object' && params !== null)
      ? params.username
      : params;
    return await handleVerifyOtp(code, email);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
  };

  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        resendOtp: handleResendOtp,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        signOut: handleSignOut,
        refreshUser: checkUser,
        formatAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);