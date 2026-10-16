import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  signOut, 
  getCurrentUser, 
  fetchUserAttributes 
} from '@aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const userData = { ...currentUser, attributes };
      setUser(userData);
      return userData;
    } catch (err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();

    // Listen for auth state changes (sign in, sign out)
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
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

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (credentials, maybePassword) => {
    // Support either structured object { username, password } or positional arguments
    const signInParams = (typeof credentials === 'object' && credentials !== null)
      ? credentials
      : { username: credentials, password: maybePassword };

    // If user state is already present in React state, return success
    if (user) {
      await checkUser();
      return { isSignedIn: true };
    }

    try {
      // Check if an active session already exists in Amplify storage
      const existingUser = await checkUser();
      if (existingUser) {
        return { isSignedIn: true };
      }

      const result = await signIn({
        username: signInParams.username,
        password: signInParams.password
      });

      if (result.isSignedIn) {
        await checkUser();
      }
      return result;
    } catch (err) {
      if (
        err.name === 'UserAlreadyAuthenticatedException' ||
        err.message?.includes('already a signed in user') ||
        err.message?.includes('UserAlreadyAuthenticatedException')
      ) {
        await checkUser();
        return { isSignedIn: true };
      }
      throw err;
    }
  };

  const handleSignUp = async (params, maybePassword) => {
    const signUpParams = (typeof params === 'object' && params !== null)
      ? params
      : {
          username: params,
          password: maybePassword,
          options: {
            userAttributes: { email: params }
          }
        };

    return await signUp({
      username: signUpParams.username,
      password: signUpParams.password,
      options: signUpParams.options || {
        userAttributes: { email: signUpParams.username }
      }
    });
  };

  const handleConfirmSignUp = async (params, maybeCode) => {
    const confirmParams = (typeof params === 'object' && params !== null)
      ? params
      : {
          username: params,
          confirmationCode: maybeCode
        };

    return await confirmSignUp({
      username: confirmParams.username,
      confirmationCode: confirmParams.confirmationCode
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        signOut: handleSignOut,
        refreshUser: checkUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);