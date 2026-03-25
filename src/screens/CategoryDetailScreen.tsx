import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories";
import { getServicesByCategory } from "../constants/services";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  route: { params: { categoryId: string } };
  navigation: any;
};

export default function CategoryDetailScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const { t } = useTranslation();

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const categoryServices = getServicesByCategory(categoryId);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  if (!category || !categoryServices) return null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={category.bg} />

      {/* Header */}
      <View style={[styles.headerArea, { backgroundColor: category.bg }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: category.color + "20" }]}
          >
            <Icon name="arrow-back" size={22} color={category.color} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIcon, { backgroundColor: category.color + "20" }]}>
              <Icon name={category.icon} size={22} color={category.color} />
            </View>
            <Text style={[styles.headerTitle, { color: category.color }]}>
              {t(`categories.${category.id}`)}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerItem}>
          <Icon name="card" size={15} color={COLORS.accent} />
          <Text style={styles.bannerText}>{t("banner.onlinePayment")}</Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.bannerItem}>
          <Icon name="shield-checkmark" size={15} color={COLORS.accent} />
          <Text style={styles.bannerText}>{t("banner.noMarkup")}</Text>
        </View>
        <View style={styles.dot} />
        <View style={styles.bannerItem}>
          <Icon name="ribbon" size={15} color={COLORS.accent} />
          <Text style={styles.bannerText}>{t("banner.guarantee")}</Text>
        </View>
      </View>


      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categoryServices.subcategories.map((sub) => {
          const open = expandedSections.includes(sub.id);
          return (
            <View key={sub.id} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(sub.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionLeft}>
                  <View style={[styles.subIcon, { backgroundColor: category.bg }]}>
                    <Icon name={sub.icon} size={18} color={category.color} />
                  </View>
                  <Text style={styles.sectionTitle}>
                    {t(`subcategories.${sub.id}`)}
                  </Text>
                </View>
                <View style={styles.sectionRight}>
                  <Text style={styles.count}>
                    {sub.services.length}
                  </Text>
                  <Icon
                    name={open ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.textLight}
                  />
                </View>
              </TouchableOpacity>

              {open && (
                <View style={styles.servicesList}>
                  {sub.services.map((svc, i) => (
                    <View
                      key={svc.id}
                      style={[
                        styles.serviceRow,
                        i < sub.services.length - 1 && styles.serviceBorder,
                      ]}
                    >
                      <View style={styles.serviceTop}>
                        <Text style={styles.serviceName}>
                          {t(`services.${svc.id}`)}
                        </Text>
                        <View style={styles.priceBox}>
                          <Text style={styles.priceLabel}>{t("payment.maxPrice")}</Text>
                          <Text style={styles.servicePrice}>{svc.priceRange === "__onQuote__" ? t("pricing.onQuote") : svc.priceRange}</Text>
                        </View>
                      </View>
                      <Text style={styles.priceNote}>{t("payment.realPriceNote")}</Text>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate("BookingChoice", {
                            categoryId,
                            serviceId: svc.id,
                            serviceName: t(`services.${svc.id}`),
                            priceRange: svc.priceRange,
                          })
                        }
                      >
                        <Icon name="card-outline" size={16} color={COLORS.white} />
                        <Text style={styles.bookBtnText}>
                          {t("payment.book")}
                        </Text>
                        <Icon name="arrow-forward" size={14} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerArea: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  bannerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginHorizontal: 8,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78350F",
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f3f3f3",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    flexShrink: 1,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  count: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "500",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  servicesList: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: SPACING.md,
  },
  serviceRow: {
    paddingVertical: 14,
  },
  serviceBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  serviceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    flex: 1,
    marginRight: SPACING.sm,
  },
  priceBox: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textLight,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  priceNote: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: "italic",
    marginBottom: 10,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  paymentInfoText: {
    fontSize: 12,
    color: "#991B1B",
    flex: 1,
    lineHeight: 18,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sm,
    gap: 8,
    alignSelf: "flex-start",
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  },
});
