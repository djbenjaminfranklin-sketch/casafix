import React from "react";
import { ActivityIndicator, StyleSheet, View, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import HomeScreen from "../screens/HomeScreen";
import EmergencyScreen from "../screens/EmergencyScreen";
import CategoryDetailScreen from "../screens/CategoryDetailScreen";
import BookingChoiceScreen from "../screens/BookingChoiceScreen";
import EmergencyBookingScreen from "../screens/EmergencyBookingScreen";
import AppointmentBookingScreen from "../screens/AppointmentBookingScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LegalScreen from "../screens/LegalScreen";
import ReviewScreen from "../screens/ReviewScreen";
import PriceConfirmationScreen from "../screens/PriceConfirmationScreen";
import WorkCompletionScreen from "../screens/WorkCompletionScreen";
import MyBookingsScreen from "../screens/MyBookingsScreen";
import ChatScreen from "../screens/ChatScreen";
import MessagesScreen from "../screens/MessagesScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import ReportScreen from "../screens/ReportScreen";
import MyAccountScreen from "../screens/MyAccountScreen";
import NotificationsSettingsScreen from "../screens/NotificationsSettingsScreen";
import PaymentScreen from "../screens/PaymentScreen";
import HelpScreen from "../screens/HelpScreen";
import HowItWorksScreen from "../screens/HowItWorksScreen";
import InvoiceScreen from "../screens/InvoiceScreen";
import PromoCodeScreen from "../screens/PromoCodeScreen";
import ReferralScreen from "../screens/ReferralScreen";
import AddressBookScreen from "../screens/AddressBookScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminArtisansScreen from "../screens/admin/AdminArtisansScreen";
import AdminArtisanDetailScreen from "../screens/admin/AdminArtisanDetailScreen";
import AdminBookingsScreen from "../screens/admin/AdminBookingsScreen";
import AdminBookingDetailScreen from "../screens/admin/AdminBookingDetailScreen";
import AdminDisputesScreen from "../screens/admin/AdminDisputesScreen";
import AdminStatsScreen from "../screens/admin/AdminStatsScreen";
import AdminClientsScreen from "../screens/admin/AdminClientsScreen";
import AdminClientDetailScreen from "../screens/admin/AdminClientDetailScreen";
import AdminMessageScreen from "../screens/admin/AdminMessageScreen";
import AdminInvoicesScreen from "../screens/admin/AdminInvoicesScreen";

type RootStackParamList = {
  Auth: undefined;
  Tabs: undefined;
  Emergency: undefined;
  CategoryDetail: { categoryId: string };
  Legal: { type: "cgu" | "legal" | "privacy" };
  BookingChoice: { categoryId: string; serviceId: string; serviceName: string; priceRange: string };
  EmergencyBooking: { categoryId: string; serviceId: string; serviceName: string; priceRange: string };
  AppointmentBooking: { categoryId: string; serviceId: string; serviceName: string; priceRange: string };
  Review: { bookingId: string; artisanId: string; artisanName: string; serviceName: string };
  PriceConfirmation: { bookingId: string; serviceName: string; artisanName: string; depositAmount: number; proposedPrice: number; paymentIntentId: string; categoryId?: string };
  WorkCompletion: { bookingId: string; serviceName: string; artisanName: string; finalPrice: number; artisanMarkedDoneAt: string };
  MyBookings: undefined;
  Chat: { bookingId: string; artisanName: string };
  Report: { bookingId: string; reportedUserId: string; reportedUserName: string };
  MyAccount: undefined;
  NotificationsSettings: undefined;
  Payment: undefined;
  Help: undefined;
  HowItWorks: undefined;
  Invoice: { bookingId: string };
  PromoCode: undefined;
  Referral: undefined;
  AddressBook: undefined;
  AdminDashboard: undefined;
  AdminArtisans: undefined;
  AdminArtisanDetail: { artisanId: string };
  AdminBookings: undefined;
  AdminBookingDetail: { bookingId: string };
  AdminDisputes: undefined;
  AdminStats: undefined;
  AdminClients: undefined;
  AdminClientDetail: { clientId: string };
  AdminMessage: undefined;
  AdminInvoices: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: "home", inactive: "home-outline" },
  MyBookingsTab: { active: "clipboard", inactive: "clipboard-outline" },
  Messages: { active: "chatbubble", inactive: "chatbubble-outline" },
  Favorites: { active: "heart", inactive: "heart-outline" },
  Admin: { active: "shield", inactive: "shield-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

function TabsScreen() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.navActive,
        tabBarInactiveTintColor: COLORS.navInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Icon name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t("nav.home") }}
      />
      <Tab.Screen
        name="MyBookingsTab"
        component={MyBookingsScreen}
        options={{ tabBarLabel: t("nav.myBookings") }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarLabel: t("nav.messages") }}
      />
      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminDashboardScreen}
          options={{ tabBarLabel: t("admin.title") }}
        />
      ) : (
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ tabBarLabel: t("nav.favorites") }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t("nav.profile") }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={({ navigation, route }) => ({
        headerShown: route.name !== "Tabs" && route.name !== "Auth",
        headerTitle: "",
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] })}
            style={{ padding: 8 }}
          >
            <Icon name="home" size={22} color={COLORS.text} />
          </TouchableOpacity>
        ),
      })}
    >
      {!session ? (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: "fade", headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="BookingChoice"
        component={BookingChoiceScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="EmergencyBooking"
        component={EmergencyBookingScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AppointmentBooking"
        component={AppointmentBookingScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PriceConfirmation"
        component={PriceConfirmationScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="WorkCompletion"
        component={WorkCompletionScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="MyAccount"
        component={MyAccountScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="NotificationsSettings"
        component={NotificationsSettingsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="HowItWorks"
        component={HowItWorksScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Invoice"
        component={InvoiceScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PromoCode"
        component={PromoCodeScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AddressBook"
        component={AddressBookScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminArtisans"
        component={AdminArtisansScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminArtisanDetail"
        component={AdminArtisanDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminBookings"
        component={AdminBookingsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminDisputes"
        component={AdminDisputesScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminStats"
        component={AdminStatsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminBookingDetail"
        component={AdminBookingDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminClients"
        component={AdminClientsScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminClientDetail"
        component={AdminClientDetailScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminMessage"
        component={AdminMessageScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="AdminInvoices"
        component={AdminInvoicesScreen}
        options={{ animation: "slide_from_right" }}
      />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
});
