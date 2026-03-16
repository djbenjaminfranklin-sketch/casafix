import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { CATEGORIES } from "../constants/categories";
import { SERVICES } from "../constants/services";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type SearchResult = {
  serviceId: string;
  categoryId: string;
  priceRange: string;
};

export default function SearchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const matches: SearchResult[] = [];
    for (const cat of SERVICES) {
      for (const sub of cat.subcategories) {
        for (const svc of sub.services) {
          const name = t(`services.${svc.id}`).toLowerCase();
          const catName = t(`categories.${cat.categoryId}`).toLowerCase();
          const subName = t(`subcategories.${sub.id}`).toLowerCase();
          if (name.includes(q) || catName.includes(q) || subName.includes(q)) {
            matches.push({
              serviceId: svc.id,
              categoryId: cat.categoryId,
              priceRange: svc.priceRange,
            });
          }
        }
      }
    }
    return matches;
  }, [query, t]);

  function getCategoryData(categoryId: string) {
    return CATEGORIES.find((c) => c.id === categoryId);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={COLORS.textLight}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Icon name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {query.length < 2 ? (
        /* Show categories when no search */
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>{t("servicesTitle")}</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryChip}
                onPress={() => navigation.navigate("CategoryDetail", { categoryId: cat.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.chipIcon, { backgroundColor: cat.bg }]}>
                  <Icon name={cat.icon} size={16} color={cat.color} />
                </View>
                <Text style={styles.chipText} numberOfLines={1}>
                  {t(`categories.${cat.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.serviceId}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{t("searchPlaceholder")}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = getCategoryData(item.categoryId);
            return (
              <TouchableOpacity
                style={styles.resultRow}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("BookingChoice", {
                    categoryId: item.categoryId,
                    serviceId: item.serviceId,
                    serviceName: t(`services.${item.serviceId}`),
                    priceRange: item.priceRange,
                  })
                }
              >
                <View style={[styles.resultIcon, { backgroundColor: cat?.bg }]}>
                  <Icon name={cat?.icon || "build"} size={18} color={cat?.color} />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{t(`services.${item.serviceId}`)}</Text>
                  <Text style={styles.resultCategory}>{t(`categories.${item.categoryId}`)}</Text>
                </View>
                <Text style={styles.resultPrice}>{item.priceRange === "__onQuote__" ? t("pricing.onQuote") : item.priceRange}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: RADIUS.xl,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  categoriesSection: { flex: 1 },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9f9f9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "500", color: COLORS.text },
  resultsList: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  resultCategory: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  resultPrice: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },
});
