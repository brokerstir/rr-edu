import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  signOut, 
  getCurrentUser, 
  fetchUserAttributes 
} from '@aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current auth status on app load
  useEffect(() => {
    checkUser();
  }, []);

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

  const handleSignIn = async (email, password) => {
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