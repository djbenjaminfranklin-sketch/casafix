import messaging from "@react-native-firebase/messaging";
import { Platform, PermissionsAndroid } from "react-native";
import { supabase } from "../lib/supabase";

// Request notification permission (iOS needs explicit permission, Android 13+ too)
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  // Android 13+ (API 33) requires POST_NOTIFICATIONS permission
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

// Get FCM token and save it to Supabase
export async function registerDeviceToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const token = await messaging().getToken();
    if (!token) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Upsert: if token already exists, update last_active
    await supabase
      .from("user_devices")
      .upsert(
        {
          user_id: user.id,
          fcm_token: token,
          platform: Platform.OS,
          last_active: new Date().toISOString(),
        },
        { onConflict: "fcm_token" }
      );

    return token;
  } catch (error) {
    console.error("Error registering device token:", error);
    return null;
  }
}

// Listen for token refreshes
export function onTokenRefresh(callback?: (token: string) => void) {
  return messaging().onTokenRefresh(async (newToken) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("user_devices")
      .upsert(
        {
          user_id: user.id,
          fcm_token: newToken,
          platform: Platform.OS,
          last_active: new Date().toISOString(),
        },
        { onConflict: "fcm_token" }
      );

    callback?.(newToken);
  });
}

// Remove device token on logout
export async function unregisterDeviceToken() {
  try {
    const token = await messaging().getToken();
    if (token) {
      await supabase
        .from("user_devices")
        .delete()
        .eq("fcm_token", token);
    }
  } catch (error) {
    console.error("Error unregistering device token:", error);
  }
}

// Setup foreground notification handler
export function onForegroundMessage(
  callback: (title: string, body: string, data: any) => void
) {
  return messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title || "";
    const body = remoteMessage.notification?.body || "";
    callback(title, body, remoteMessage.data);
  });
}

// Handle notification tap when app was in background
export function onNotificationOpenedApp(
  callback: (data: any) => void
) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    callback(remoteMessage.data);
  });
}

// Check if app was opened from a notification (cold start)
export async function getInitialNotification(): Promise<any | null> {
  const remoteMessage = await messaging().getInitialNotification();
  return remoteMessage?.data || null;
}
