import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getInvoiceByBooking, Invoice } from "../services/invoices";

type Props = {
  navigation: any;
  route: { params: { bookingId: string } };
};

export default function InvoiceScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { bookingId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      const { data, error: err } = await getInvoiceByBooking(bookingId);
      if (err || !data) {
        setError(true);
      } else {
        setInvoice(data);
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [bookingId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2).replace(".", ",") + " \u20AC";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("invoice.title")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t("invoice.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("invoice.title")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Icon name="document-text-outline" size={56} color="#d1d5db" />
          <Text style={styles.errorText}>{t("invoice.noInvoice")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("invoice.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.invoiceCard}>
          {/* Logo and invoice number */}
          <View style={styles.invoiceHeader}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.invoiceNumberContainer}>
              <Text style={styles.invoiceNumberLabel}>{t("invoice.invoiceNumber")}</Text>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            </View>
          </View>

          {/* Date */}
          <Text style={styles.dateText}>
            {t("invoice.date")} : {formatDate(invoice.service_date)}
          </Text>

          <View style={styles.divider} />

          {/* Provider section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("invoice.provider")}</Text>
            <Text style={styles.sectionName}>{invoice.artisan_name}</Text>
            {invoice.artisan_business_address && (
              <Text style={styles.sectionDetail}>{invoice.artisan_business_address}</Text>
            )}
            {invoice.artisan_nie_nif && (
              <Text style={styles.sectionDetail}>NIE/NIF : {invoice.artisan_nie_nif}</Text>
            )}
            {invoice.artisan_autonomo_number && (
              <Text style={styles.sectionDetail}>Autonomo : {invoice.artisan_autonomo_number}</Text>
            )}
          </View>

          {/* Client section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("invoice.client")}</Text>
            <Text style={styles.sectionName}>{invoice.client_name}</Text>
            {invoice.client_address && (
              <Text style={styles.sectionDetail}>{invoice.client_address}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("invoice.service")}</Text>
            <Text style={styles.serviceText}>{invoice.service_name}</Text>
          </View>

          <View style={styles.divider} />

          {/* Price breakdown */}
          <View style={styles.priceTable}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t("invoice.subtotal")}</Text>
              <Text style={styles.priceValue}>{formatAmount(invoice.subtotal)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t("invoice.iva")} ({invoice.iva_rate}%)</Text>
              <Text style={styles.priceValue}>{formatAmount(invoice.iva_amount)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>{t("invoice.total")}</Text>
              <Text style={styles.totalValue}>{formatAmount(invoice.total)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment info */}
          <View style={styles.paymentInfo}>
            <Icon name="card-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.paymentText}>{t("invoice.paidByCard")}</Text>
          </View>

          {/* Invoice number footer */}
          <Text style={styles.footerInvoiceNumber}>
            {t("invoice.invoiceNumber")}{invoice.invoice_number}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  logo: {
    width: 100,
    height: 40,
  },
  invoiceNumberContainer: {
    alignItems: "flex-end",
  },
  invoiceNumberLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  section: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  sectionDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  serviceText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  priceTable: {
    marginVertical: SPACING.xs,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  totalDivider: {
    height: 1,
    backgroundColor: COLORS.text,
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  paymentText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  footerInvoiceNumber: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: SPACING.md,
  },
});
