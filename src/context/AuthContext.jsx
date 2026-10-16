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
      setUser({ ...currentUser, attributes });
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();

    // Listen for OAuth redirect completion or auth state changes
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

  const handleSignIn = async (email, password) => {
    // If already signed in, refresh user and return
    if (user) {
      await checkUser();
      return;
    }
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      await checkUser();
    }
    return result;
  };

  const handleSignUp = async (email, password) => {
    return await signUp({
      username: email,
      password,
      options: {
        userAttributes: { email }
      }
    });
  };

  const handleConfirmSignUp = async (email, code) => {
    return await confirmSignUp({
      username: email,
      confirmationCode: code
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