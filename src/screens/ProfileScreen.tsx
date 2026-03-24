import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import LanguageSelector from "../components/LanguageSelector";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { profile, user } = useAuth();

  const menuItems = [
    {
      icon: "calendar-outline",
      label: t("profile.myBookings"),
      onPress: () => navigation.navigate("MyBookings"),
    },
    {
      icon: "person-outline",
      label: t("profile.myAccount"),
      onPress: () => navigation.navigate("MyAccount"),
    },
    {
      icon: "notifications-outline",
      label: t("profile.notifications"),
      onPress: () => navigation.navigate("NotificationsSettings"),
    },
    {
      icon: "card-outline",
      label: t("profile.payment"),
      onPress: () => navigation.navigate("Payment"),
    },
    {
      icon: "pricetag-outline",
      label: t("promo.title"),
      onPress: () => navigation.navigate("PromoCode"),
    },
    {
      icon: "people-outline",
      label: t("referral.title"),
      onPress: () => navigation.navigate("Referral"),
    },
    {
      icon: "location-outline",
      label: t("addresses.title"),
      onPress: () => navigation.navigate("AddressBook"),
    },
    {
      icon: "help-circle-outline",
      label: t("profile.help"),
      onPress: () => navigation.navigate("Help"),
    },
    {
      icon: "book-outline",
      label: t("profile.howItWorks"),
      onPress: () => navigation.navigate("HowItWorks"),
    },
  ];

  const legalItems = [
    {
      icon: "document-text-outline",
      label: t("legal.cguTitle"),
      onPress: () => navigation.navigate("Legal", { type: "cgu" }),
    },
    {
      icon: "shield-checkmark-outline",
      label: t("legal.legalNoticeTitle"),
      onPress: () => navigation.navigate("Legal", { type: "legal" }),
    },
    {
      icon: "lock-closed-outline",
      label: t("legal.privacyTitle"),
      onPress: () => navigation.navigate("Legal", { type: "privacy" }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={36} color={COLORS.white} />
          </View>
          <Text style={styles.welcomeText}>
            {profile?.full_name || t("profile.welcome")}
          </Text>
          <Text style={styles.subtitleText}>
            {user?.email || t("profile.loginPrompt")}
          </Text>
        </View>

        {/* Language */}
        <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
        <LanguageSelector />

        {/* Menu */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("profile.settings")}
        </Text>
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Icon name={item.icon} size={20} color={COLORS.text} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("profile.legalSection")}
        </Text>
        <View style={styles.menuSection}>
          {legalItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Icon name={item.icon} size={20} color={COLORS.text} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>
            <Text style={{ color: COLORS.primary }}>Casa</Text>
            <Text style={{ color: COLORS.accent }}>Fix</Text>
          </Text>
          <Text style={styles.version}>v1.0.0 - Costa del Sol</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  menuSection: {
    marginHorizontal: SPACING.md,
    backgroundColor: "#f9f9f9",
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    marginTop: SPACING.md,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
  },
  version: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
