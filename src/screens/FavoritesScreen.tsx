import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING } from "../constants/theme";

export default function FavoritesScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>{t("nav.favorites")}</Text>
      <View style={styles.empty}>
        <Icon name="heart-outline" size={56} color="#d1d5db" />
        <Text style={styles.emptyTitle}>{t("favorites.empty")}</Text>
        <Text style={styles.emptySubtitle}>{t("favorites.emptyDesc")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 100 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center", paddingHorizontal: 40 },
});
