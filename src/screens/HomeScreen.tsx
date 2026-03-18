import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import CategoryCard from "../components/CategoryCard";
import LanguageSelector from "../components/LanguageSelector";
import EmergencyButton from "../components/EmergencyButton";
import { supabase } from "../lib/supabase";

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [activeBooking, setActiveBooking] = useState<any>(null);

  // Check for active booking — show banner, don't force redirect
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("bookings")
          .select("id, category_id, service_id, service_name, price_range, status")
          .eq("client_id", user.id)
          .in("status", ["searching", "matched", "in_progress", "price_proposed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setActiveBooking(data || null);
      })();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Active booking banner */}
      {activeBooking && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => navigation.navigate("EmergencyBooking", {
            categoryId: activeBooking.category_id,
            serviceId: activeBooking.service_id,
            serviceName: activeBooking.service_name,
            priceRange: activeBooking.price_range,
            resumeBookingId: activeBooking.id,
          })}
          activeOpacity={0.9}
        >
          <View style={styles.activeBannerDot} />
          <View style={styles.activeBannerInfo}>
            <Text style={styles.activeBannerTitle}>{t("booking.activeBooking")}</Text>
            <Text style={styles.activeBannerSubtitle}>{activeBooking.service_name}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Logo & Location */}
            <View style={styles.topRow}>
              <View>
                <View style={styles.logoRow}>
                  <Image source={require("../assets/logo.png")} style={styles.logoImage} />
                </View>
                <View style={styles.locationRow}>
                  <Icon name="location" size={14} color={COLORS.accent} />
                  <Text style={styles.locationText}>{t("location")}</Text>
                </View>
              </View>
            </View>

            {/* Language selector */}
            <LanguageSelector />

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={18} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder={t("searchPlaceholder")}
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Emergency button */}
            <EmergencyButton onPress={() => navigation.navigate("Emergency")} />

            {/* Section title */}
            <Text style={styles.sectionTitle}>{t("servicesTitle")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CategoryCard
            id={item.id}
            name={t(`categories.${item.id}`)}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            onPress={() => navigation.navigate("CategoryDetail", { categoryId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 100,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 12,
  },
  activeBannerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
  },
  activeBannerInfo: {
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activeBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});
