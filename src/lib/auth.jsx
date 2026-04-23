import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const SESSION_KEY = "cricpadder.session.v1";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) setUser(JSON.parse(s));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const persist = (u, token) => {
    api.setToken(token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signUp = async (name, email, password) => {
    const { user: u, token } = await api.post("/auth/signup", { name, email, password });
    persist(u, token);
  };

  const signIn = async (email, password) => {
    const { user: u, token } = await api.post("/auth/signin", { email, password });
    persist(u, token);
  };

  const signOut = () => {
    api.setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, signUp, signIn, signOut }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
