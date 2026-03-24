import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Linking } from "react-native";

export const SUPABASE_URL = "https://ivhotilzgjofpbtwdxge.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aG90aWx6Z2pvZnBidHdkeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA2NzksImV4cCI6MjA4ODc1NjY3OX0.RcHgOEf8EGxQU28QoS8_f23fznm8SANbDbxLj_opISA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Handle deep links for email confirmation
Linking.addEventListener("url", ({ url }) => {
  if (url.startsWith("casafix://")) {
    const params = new URL(url);
    const accessToken = params.searchParams.get("access_token");
    const refreshToken = params.searchParams.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
  }
});
