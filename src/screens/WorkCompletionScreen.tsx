import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { supabase } from "../lib/supabase";
import { releaseToArtisan } from "../lib/stripe";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getInvoiceByBooking, Invoice } from "../services/invoices";
import { uploadMedia, MediaItem } from "../services/media";
import BeforeAfterPhotos from "../components/BeforeAfterPhotos";

type Props = {
  route: {
    params: {
      bookingId: string;
      serviceName: string;
      artisanName: string;
      finalPrice: number;
      artisanMarkedDoneAt: string; // ISO date string
    };
  };
  navigation: any;
};

export default function WorkCompletionScreen({ route, navigation }: Props) {
  const { bookingId, serviceName, artisanName, finalPrice, artisanMarkedDoneAt } = route.params;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(48);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<MediaItem[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<MediaItem[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [activePhotoTab, setActivePhotoTab] = useState<"before" | "after">("before");

  // Calculate countdown
  useEffect(() => {
    function updateCountdown() {
      const deadline = new Date(artisanMarkedDoneAt);
      deadline.setHours(deadline.getHours() + 48);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffH = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
      setHoursLeft(diffH);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [artisanMarkedDoneAt]);

  function handleAddPhoto(type: "before" | "after") {
    const current = type === "before" ? beforePhotos : afterPhotos;
    if (current.length >= 5) {
      Alert.alert(t("media.maxReached"), t("media.maxReachedDesc", { max: 5 }));
      return;
    }

    Alert.alert(
      type === "before" ? t("beforeAfter.addBefore") : t("beforeAfter.addAfter"),
      "",
      [
        {
          text: t("media.takePhoto"),
          onPress: () => pickPhoto(type, "camera"),
        },
        {
          text: t("media.fromGallery"),
          onPress: () => pickPhoto(type, "gallery"),
        },
        { text: t("priceConfirm.no"), style: "cancel" },
      ]
    );
  }

  async function pickPhoto(type: "before" | "after", source: "camera" | "gallery") {
    const result =
      source === "camera"
        ? await launchCamera({ mediaType: "photo", quality: 0.8 })
        : await launchImageLibrary({ mediaType: "photo", selectionLimit: 5 - (type === "before" ? beforePhotos.length : afterPhotos.length), quality: 0.8 });

    if (result.assets && result.assets.length > 0) {
      const newItems: MediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri!,
        type: "photo" as const,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      }));
      if (type === "before") {
        setBeforePhotos((prev) => [...prev, ...newItems]);
      } else {
        setAfterPhotos((prev) => [...prev, ...newItems]);
      }
    }
  }

  function removePhoto(type: "before" | "after", index: number) {
    if (type === "before") {
      setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function uploadBeforeAfterPhotos() {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    setUploadingPhotos(true);

    for (const photo of beforePhotos) {
      if (photo.uploaded) continue;
      const result = await uploadMedia(bookingId, userId, photo);
      if (result) {
        await supabase.from("booking_photos").insert({
          booking_id: bookingId,
          image_url: result.url,
          type: "before",
          uploaded_by: userId,
        });
      }
    }

    for (const photo of afterPhotos) {
      if (photo.uploaded) continue;
      const result = await uploadMedia(bookingId, userId, photo);
      if (result) {
        await supabase.from("booking_photos").insert({
          booking_id: bookingId,
          image_url: result.url,
          type: "after",
          uploaded_by: userId,
        });
      }
    }

    setUploadingPhotos(false);
  }

  async function handleConfirmCompletion() {
    Alert.alert(
      t("completion.confirmTitle"),
      t("completion.confirmDesc", { price: finalPrice, artisan: artisanName }),
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("completion.yesConfirm"),
          onPress: async () => {
            setLoading(true);

            // Upload before/after photos if any
            if (beforePhotos.length > 0 || afterPhotos.length > 0) {
              await uploadBeforeAfterPhotos();
            }

            const { data, error } = await supabase.rpc("complete_work", {
              p_booking_id: bookingId,
              p_client_id: (await supabase.auth.getUser()).data.user?.id,
            });

            if (error) {
              setLoading(false);
              Alert.alert(t("common.error"), error.message);
              return;
            }

            // Release payment to artisan
            await releaseToArtisan({ bookingId });

            setLoading(false);
            setCompleted(true);

            // Fetch the auto-generated invoice
            const { data: inv } = await getInvoiceByBooking(bookingId);
            if (inv) setInvoice(inv);
          },
        },
      ]
    );
  }

  async function handleDispute() {
    const { data } = await supabase
      .from("bookings")
      .select("artisan_id")
      .eq("id", bookingId)
      .single();

    navigation.navigate("Report", {
      bookingId,
      reportedUserId: data?.artisan_id || "",
      reportedUserName: artisanName,
    });
  }

  // ─── SUCCESS ───
  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreen}>
          <View style={styles.checkCircle}>
            <Icon name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{t("completion.workDone")}</Text>
          <Text style={styles.successSubtitle}>{t("completion.artisanPaid")}</Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.service")}</Text>
              <Text style={styles.receiptValue}>{serviceName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.artisan")}</Text>
              <Text style={styles.receiptValue}>{artisanName}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, styles.finalLabel]}>{t("completion.released")}</Text>
              <Text style={styles.finalPrice}>{finalPrice}€</Text>
            </View>
          </View>

          {/* Invoice section */}
          {invoice && !showInvoice && (
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() => setShowInvoice(true)}
              activeOpacity={0.85}
            >
              <Icon name="document-text-outline" size={20} color={COLORS.primary} />
              <Text style={styles.invoiceBtnText}>{t("completion.viewInvoice")}</Text>
            </TouchableOpacity>
          )}

          {invoice && showInvoice && (
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Icon name="document-text" size={20} color={COLORS.primary} />
                <Text style={styles.invoiceTitle}>{t("completion.invoiceGenerated")}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>N°</Text>
                <Text style={styles.invoiceValue}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>{t("priceConfirm.service")}</Text>
                <Text style={styles.invoiceValue}>{invoice.service_name}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>{t("invoice.subtotal")}</Text>
                <Text style={styles.invoiceValue}>{invoice.subtotal}€</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>{t("invoice.iva")} ({invoice.iva_rate}%)</Text>
                <Text style={styles.invoiceValue}>{invoice.iva_amount}€</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, styles.finalLabel]}>{t("invoice.total")}</Text>
                <Text style={styles.finalPrice}>{invoice.total}€</Text>
              </View>
            </View>
          )}

          <BeforeAfterPhotos bookingId={bookingId} />

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              navigation.replace("Review", {
                bookingId,
                artisanId: "",
                artisanName,
                serviceName,
              })
            }
            activeOpacity={0.85}
          >
            <Icon name="star" size={20} color="#FFFFFF" />
            <Text style={styles.reviewBtnText}>{t("priceConfirm.leaveReview")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>{t("booking.backHome")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN ───
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("completion.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Artisan marked done */}
        <View style={styles.doneCard}>
          <View style={styles.doneIconBox}>
            <Icon name="checkmark-done" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.doneTitle}>{t("completion.artisanMarkedDone")}</Text>
          <Text style={styles.doneSubtitle}>
            {artisanName} {t("completion.saysWorkDone")}
          </Text>
        </View>

        {/* 48h countdown */}
        <View style={styles.countdownCard}>
          <Icon name="time" size={20} color="#d97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.countdownTitle}>
              {hoursLeft > 0
                ? t("completion.hoursLeft", { hours: hoursLeft })
                : t("completion.autoConfirmSoon")}
            </Text>
            <Text style={styles.countdownDesc}>{t("completion.autoConfirmInfo")}</Text>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Icon name="briefcase" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{serviceName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{artisanName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="card" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{finalPrice}€</Text>
          </View>
        </View>

        {/* Before/After photos from artisan (if already uploaded) */}
        <BeforeAfterPhotos bookingId={bookingId} />

        {/* Before/After photo upload section */}
        <View style={styles.photoSection}>
          <View style={styles.photoSectionHeader}>
            <Icon name="images" size={18} color={COLORS.primary} />
            <Text style={styles.photoSectionTitle}>{t("beforeAfter.title")}</Text>
          </View>

          {/* Photo tabs */}
          <View style={styles.photoTabs}>
            <TouchableOpacity
              style={[styles.photoTab, activePhotoTab === "before" && styles.photoTabActive]}
              onPress={() => setActivePhotoTab("before")}
            >
              <Text style={[styles.photoTabText, activePhotoTab === "before" && styles.photoTabTextActive]}>
                {t("beforeAfter.before")} ({beforePhotos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoTab, activePhotoTab === "after" && styles.photoTabActive]}
              onPress={() => setActivePhotoTab("after")}
            >
              <Text style={[styles.photoTabText, activePhotoTab === "after" && styles.photoTabTextActive]}>
                {t("beforeAfter.after")} ({afterPhotos.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo grid for active tab */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {(activePhotoTab === "before" ? beforePhotos : afterPhotos).map((item, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => removePhoto(activePhotoTab, index)}
                >
                  <Icon name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}

            {(activePhotoTab === "before" ? beforePhotos : afterPhotos).length < 5 && (
              <TouchableOpacity
                style={styles.photoAddBtn}
                onPress={() => handleAddPhoto(activePhotoTab)}
                activeOpacity={0.7}
              >
                <Icon name="add" size={28} color={COLORS.primary} />
                <Text style={styles.photoAddText}>
                  {activePhotoTab === "before" ? t("beforeAfter.addBefore") : t("beforeAfter.addAfter")}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {uploadingPhotos && (
            <View style={styles.uploadingBar}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.uploadingText}>{t("beforeAfter.uploading")}</Text>
            </View>
          )}
        </View>

        {/* Guarantee */}
        <View style={styles.guaranteeCard}>
          <Icon name="shield-checkmark" size={18} color="#16a34a" />
          <Text style={styles.guaranteeText}>{t("multiday.guaranteeReminder")}</Text>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.disputeBtn} onPress={handleDispute} activeOpacity={0.8}>
          <Icon name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.disputeBtnText}>{t("completion.dispute")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirmCompletion}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>{t("completion.confirm")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  contentInner: { paddingBottom: SPACING.md },
  // Artisan done card
  doneCard: {
    alignItems: "center", backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 2, borderColor: "#BFDBFE",
  },
  doneIconBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  doneTitle: { fontSize: 18, fontWeight: "700", color: "#1e40af", marginBottom: 4 },
  doneSubtitle: { fontSize: 14, color: "#3b82f6", textAlign: "center" },
  // Countdown
  countdownCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FEF3C7", padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  countdownTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  countdownDesc: { fontSize: 12, color: "#92400e", marginTop: 2 },
  // Details
  detailCard: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, gap: 10,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  // Guarantee
  guaranteeCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#dcfce7", padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  guaranteeText: { fontSize: 12, color: "#166534", flex: 1, lineHeight: 18 },
  // Before/After photos
  photoSection: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  photoSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.sm,
  },
  photoSectionTitle: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  photoTabs: {
    flexDirection: "row", backgroundColor: "#e5e7eb", borderRadius: RADIUS.sm,
    padding: 2, marginBottom: SPACING.sm,
  },
  photoTab: {
    flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: RADIUS.sm - 2,
  },
  photoTabActive: { backgroundColor: "#FFFFFF" },
  photoTabText: { fontSize: 13, fontWeight: "500", color: COLORS.textLight },
  photoTabTextActive: { color: COLORS.text, fontWeight: "600" },
  photoScroll: { flexDirection: "row" },
  photoItem: {
    width: 80, height: 80, borderRadius: RADIUS.sm, marginRight: 8,
    overflow: "hidden",
  },
  photoThumbnail: { width: "100%", height: "100%", borderRadius: RADIUS.sm },
  photoRemoveBtn: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  photoAddBtn: {
    width: 80, height: 80, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: "#e5e7eb", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  photoAddText: { fontSize: 9, color: COLORS.primary, marginTop: 2, textAlign: "center", paddingHorizontal: 4 },
  uploadingBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: SPACING.sm, paddingVertical: 8,
  },
  uploadingText: { fontSize: 12, color: COLORS.textLight },
  // Bottom
  bottomBar: {
    flexDirection: "row", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  disputeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: RADIUS.md, gap: 6,
    borderWidth: 2, borderColor: "#fecaca",
  },
  disputeBtnText: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  confirmBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#16a34a", paddingVertical: 14, borderRadius: RADIUS.md, gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  // Success
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  checkCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: "center", marginBottom: SPACING.lg },
  receiptCard: {
    width: "100%", backgroundColor: "#f9fafb", borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6,
  },
  receiptLabel: { fontSize: 13, color: COLORS.textLight },
  receiptValue: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  receiptDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
  finalLabel: { fontWeight: "600", color: "#1f2937" },
  finalPrice: { fontSize: 20, fontWeight: "800", color: "#16a34a" },
  reviewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: RADIUS.md, gap: 8, marginBottom: SPACING.sm, width: "100%",
  },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  homeBtn: { paddingVertical: 12, paddingHorizontal: 30 },
  homeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textLight },
  // Invoice
  invoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: SPACING.sm, width: "100%",
  },
  invoiceBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.primary },
  invoiceCard: {
    width: "100%", backgroundColor: "#f0f9ff", borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: "#bae6fd",
  },
  invoiceHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.sm,
  },
  invoiceTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  invoiceRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 4,
  },
  invoiceLabel: { fontSize: 13, color: COLORS.textLight },
  invoiceValue: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
});
