import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Firebase user object
  const [userProfile, setUserProfile] = useState(null); // Firestore se extra info
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth state listener
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Firestore se user profile fetch karo
        const doc = await firestore()
          .collection('users')
          .doc(firebaseUser.uid)
          .get();
        setUserProfile(doc.exists ? doc.data() : null);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe; // cleanup
  }, []);

  // ── Signup ─────────────────────────────────────────
  const signup = async (email, password, name) => {
    const result = await auth().createUserWithEmailAndPassword(email, password);
    // Firestore mein user save karo
    await firestore().collection('users').doc(result.user.uid).set({
      name,
      email,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return result;
  };

  // ── Login ──────────────────────────────────────────
  const login = async (email, password) => {
    return await auth().signInWithEmailAndPassword(email, password);
  };

  // ── Logout ─────────────────────────────────────────
  const logout = async () => {
    await auth().signOut();
  };

  // ── Password Reset ─────────────────────────────────
  const resetPassword = async (email) => {
    await auth().sendPasswordResetEmail(email);
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signup, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — screens mein aasani se use karo
export const useAuth = () => useContext(AuthContext);