import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>{t("nav.favorites")}</Text>
      <View style={styles.empty}>
        <View style={styles.iconCircle}>
          <Icon name="heart-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t("favorites.empty")}</Text>
        <Text style={styles.emptySubtitle}>{t("favorites.emptyDesc")}</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => navigation.navigate("Search")}
          activeOpacity={0.85}
        >
          <Icon name="search" size={18} color="#FFFFFF" />
          <Text style={styles.browseBtnText}>{t("nav.search")}</Text>
        </TouchableOpacity>
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
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center", paddingHorizontal: 40 },
  browseBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: RADIUS.md, marginTop: 24,
  },
  browseBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
