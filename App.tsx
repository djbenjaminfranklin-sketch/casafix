import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import "./src/i18n";
import { AuthProvider } from "./src/contexts/AuthContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { STRIPE_PUBLISHABLE_KEY } from "./src/lib/stripe";
import RootNavigator from "./src/navigation/TabNavigator";
import {
  registerDeviceToken,
  onTokenRefresh,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from "./src/services/pushNotifications";

function NotificationHandler({ navigationRef }: { navigationRef: React.RefObject<NavigationContainerRef<any>> }) {
  useEffect(() => {
    // Register device for push notifications
    registerDeviceToken();

    // Listen for token refreshes
    const unsubToken = onTokenRefresh();

    // Handle foreground notifications
    const unsubForeground = onForegroundMessage((title, body) => {
      Alert.alert(title, body);
    });

    // Handle notification tap (app in background)
    const unsubOpened = onNotificationOpenedApp((data) => {
      if (data?.screen && navigationRef.current) {
        navigationRef.current.navigate(data.screen, data.params ? JSON.parse(data.params) : undefined);
      }
    });

    // Check if app was opened from notification (cold start)
    getInitialNotification().then((data) => {
      if (data?.screen && navigationRef.current) {
        navigationRef.current.navigate(data.screen, data.params ? JSON.parse(data.params) : undefined);
      }
    });

    return () => {
      unsubToken();
      unsubForeground();
      unsubOpened();
    };
  }, [navigationRef]);

  return null;
}

GoogleSignin.configure({
  webClientId: "480428910205-eb2pftedutugfshvv2lhmqov1j1dnlmm.apps.googleusercontent.com",
  iosClientId: "480428910205-ddl98g4s0d0otapukbpo0t3ggmudn518.apps.googleusercontent.com",
});

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.casafix">
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <NotificationHandler navigationRef={navigationRef} />
            <ErrorBoundary>
              <RootNavigator />
            </ErrorBoundary>
          </NavigationContainer>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
