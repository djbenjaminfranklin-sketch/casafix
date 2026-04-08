import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Profile } from "../lib/database.types";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setIsAdmin(data?.is_admin === true);
    setLoading(false);
  }

  async function signUp(email: string, password: string, fullName: string, phone?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: "casafix://auth/callback",
      },
    });

    // Save phone to profiles table after signup
    if (!error && data?.user && phone) {
      await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", data.user.id);
    }

    return { error };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signInWithApple() {
    try {
      const { appleAuth } = require("@invertase/react-native-apple-authentication");
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let rawNonce = "";
      for (let i = 0; i < 32; i++) {
        rawNonce += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const appleResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        nonce: rawNonce,
      });

      if (!appleResponse.identityToken) {
        return { error: { message: "No identity token returned from Apple" } };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: appleResponse.identityToken,
        nonce: rawNonce,
      });
      return { error };
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return { error: null };
      return { error: e };
    }
  }

  async function signInWithGoogle() {
    try {
      const { GoogleSignin } = require("@react-native-google-signin/google-signin");
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices();
      }
      const response = await GoogleSignin.signIn();

      if (response.type === "cancelled") {
        return { error: null };
      }

      const idToken = response.data?.idToken;

      if (!idToken) {
        // Fallback: try getTokens()
        const tokens = await GoogleSignin.getTokens();
        if (tokens.idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: tokens.idToken,
          });
          return { error };
        }
        return { error: { message: "No ID token returned from Google" } };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      return { error };
    } catch (e: any) {
      if (e.code === "SIGN_IN_CANCELLED") return { error: null };
      return { error: e };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (data) setProfile(data);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, loading, signUp, signIn, signInWithApple, signInWithGoogle, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
