import React from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import CategoryCard from "../components/CategoryCard";
import LanguageSelector from "../components/LanguageSelector";
import EmergencyButton from "../components/EmergencyButton";

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

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
                  <View style={styles.logoIcon}>
                    <Icon name="home" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.logo}>
                    <Text style={{ color: COLORS.primary }}>Casa</Text>
                    <Text style={{ color: COLORS.text }}>Fix</Text>
                  </Text>
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
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
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
});
