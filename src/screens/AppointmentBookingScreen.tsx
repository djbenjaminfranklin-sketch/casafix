import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import MediaPicker from "../components/MediaPicker";
import DiagnosticCard from "../components/DiagnosticCard";

import { MediaItem, uploadAllMedia } from "../services/media";
import { createBooking, subscribeToBooking, getBookingWithArtisan } from "../services/bookings";
import { supabase } from "../lib/supabase";
import { Booking } from "../lib/database.types";
import { analyzeProblem, DiagnosticResult } from "../services/ai-diagnostic";


type Props = {
  route: {
    params: {
      categoryId: string;
      serviceId: string;
      serviceName: string;
      priceRange: string;
    };
  };
  navigation: any;
};

const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "18:00 - 20:00",
];

function getNextDays(count: number) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      dayName: d.toLocaleDateString("es-ES", { weekday: "short" }).toUpperCase(),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("es-ES", { month: "short" }),
      isToday: i === 0,
    });
  }
  return days;
}

export default function AppointmentBookingScreen({ route, navigation }: Props) {
  const { categoryId, serviceName, priceRange } = route.params;
  const { t } = useTranslation();
  const category = CATEGORIES.find((c) => c.id === categoryId);

  const days = getNextDays(14);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [description, setDescription] = useState("");
  const [aiDiagnostic, setAiDiagnostic] = useState<DiagnosticResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  // Subscribe to booking realtime updates (detect price_proposed)
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = subscribeToBooking(bookingId, async (updatedBooking: Booking) => {
      if (updatedBooking.status === "price_proposed" && updatedBooking.proposed_price) {
        const { data: fullBooking } = await getBookingWithArtisan(bookingId);
        const artisanName = fullBooking?.artisan?.full_name || "";

        navigation.replace("PriceConfirmation", {
          bookingId,
          serviceName,
          artisanName,
          categoryId,
          depositAmount: updatedBooking.deposit_amount || updatedBooking.max_price,
          proposedPrice: updatedBooking.proposed_price,
          paymentIntentId: updatedBooking.stripe_payment_intent_id || "",
        });
      }
    });

    return unsubscribe;
  }, [bookingId, navigation, serviceName]);

  const handleAnalyze = async () => {
    if (!description.trim()) {
      Alert.alert(t("media.descriptionRequired"), t("media.descriptionRequiredDesc"));
      return;
    }
    setAnalyzingAi(true);
    try {
      const result = await analyzeProblem({
        mediaItems: media,
        description: description.trim(),
        serviceName,
        categoryName: category ? t(`categories.${category.id}`) : "",
        priceRange,
      });
      setAiDiagnostic(result);
    } catch (e: any) {
      console.warn("AI diagnostic failed:", e);
      Alert.alert(t("diagnostic.error"), e.message || t("diagnostic.analysisFailed"));
    } finally {
      setAnalyzingAi(false);
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.confirmationScreen}>
          <View style={styles.checkCircle}>
            <Icon name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.confirmTitle}>{t("booking.confirmed")}</Text>
          <Text style={styles.confirmSubtitle}>{t("booking.confirmedDesc")}</Text>

          {/* AI Diagnostic */}
          {aiDiagnostic && <DiagnosticCard diagnostic={aiDiagnostic} />}

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Icon name="calendar" size={18} color={COLORS.primary} />
              <Text style={styles.confirmText}>
                {days[selectedDay].dayNum} {days[selectedDay].month}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Icon name="time" size={18} color={COLORS.primary} />
              <Text style={styles.confirmText}>
                {selectedSlot !== null ? TIME_SLOTS[selectedSlot] : ""}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Icon name="construct" size={18} color={COLORS.primary} />
              <Text style={styles.confirmText}>{serviceName}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Icon name="card" size={18} color={COLORS.primary} />
              <Text style={styles.confirmText}>
                {t("payment.maxPrice")}: {priceRange}
              </Text>
            </View>
          </View>

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("booking.appointment")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service */}
        <View style={styles.serviceSummary}>
          <View style={[styles.svcIcon, { backgroundColor: category?.bg }]}>
            <Icon name={category?.icon || "build"} size={20} color={category?.color} />
          </View>
          <View style={styles.svcInfo}>
            <Text style={styles.svcName}>{serviceName}</Text>
            <Text style={styles.svcPrice}>{priceRange}</Text>
          </View>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionTitle}>{t("booking.chooseDate")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}
        >
          {days.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayCard, selectedDay === i && styles.dayCardActive]}
              onPress={() => setSelectedDay(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, selectedDay === i && styles.dayTextActive]}>
                {day.isToday ? t("booking.today") : day.dayName}
              </Text>
              <Text style={[styles.dayNum, selectedDay === i && styles.dayTextActive]}>
                {day.dayNum}
              </Text>
              <Text style={[styles.dayMonth, selectedDay === i && styles.dayTextActive]}>
                {day.month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time slots */}
        <Text style={styles.sectionTitle}>{t("booking.chooseTime")}</Text>
        <View style={styles.slotsGrid}>
          {TIME_SLOTS.map((slot, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.slotCard, selectedSlot === i && styles.slotCardActive]}
              onPress={() => setSelectedSlot(i)}
              activeOpacity={0.7}
            >
              <Icon
                name="time-outline"
                size={16}
                color={selectedSlot === i ? "#FFFFFF" : COLORS.textLight}
              />
              <Text style={[styles.slotText, selectedSlot === i && styles.slotTextActive]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos / Videos */}
        <MediaPicker media={media} onMediaChange={setMedia} maxItems={5} description={description} onDescriptionChange={setDescription} />

        {/* Analyze button */}
        {media.length > 0 && description.trim().length > 0 && !aiDiagnostic && (
          <TouchableOpacity
            style={[styles.analyzeBtn, analyzingAi && { opacity: 0.6 }]}
            onPress={handleAnalyze}
            activeOpacity={0.85}
            disabled={analyzingAi}
          >
            <Icon name="sparkles" size={20} color={COLORS.primary} />
            <Text style={styles.analyzeBtnText}>
              {analyzingAi ? t("diagnostic.analyzing") : t("diagnostic.analyze")}
            </Text>
          </TouchableOpacity>
        )}

        {/* AI Diagnostic result */}
        {aiDiagnostic && <DiagnosticCard diagnostic={aiDiagnostic} />}

        {/* Payment info */}
        <View style={styles.paymentInfo}>
          <Icon name="information-circle" size={16} color={COLORS.primary} />
          <Text style={styles.paymentText}>{t("payment.explanation")}</Text>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bookBtn, (selectedSlot === null || submitting || analyzingAi) && styles.bookBtnDisabled]}
          onPress={async () => {
            if (selectedSlot === null || submitting) return;

            setSubmitting(true);

            const selectedDate = days[selectedDay].date.toISOString().split("T")[0];
            const { data: booking } = await createBooking({
              categoryId,
              serviceId: route.params.serviceId,
              serviceName,
              priceRange,
              type: "appointment",
              scheduledDate: selectedDate,
              scheduledSlot: TIME_SLOTS[selectedSlot],
              description: description.trim() || undefined,
            });

            if (booking) {
              setBookingId(booking.id);
            }

            // Upload media if any
            if (booking && media.length > 0) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await uploadAllMedia(booking.id, user.id, media);
              }
            }

            // Trigger push notifications to matching artisans
            supabase.functions.invoke("process-notifications").catch(() => {});

            setSubmitting(false);
            setConfirmed(true);
          }}
          activeOpacity={0.85}
          disabled={selectedSlot === null || submitting || analyzingAi}
        >
          <Icon name="card" size={20} color="#FFFFFF" />
          <Text style={styles.bookBtnText}>{t("payment.book")}</Text>
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
  serviceSummary: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: SPACING.md, padding: SPACING.md,
    backgroundColor: "#f9f9f9", borderRadius: RADIUS.lg,
  },
  svcIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: "center", justifyContent: "center",
  },
  svcInfo: { flex: 1 },
  svcName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  svcPrice: { fontSize: 14, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: "#1f2937",
    paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  daysRow: { paddingHorizontal: SPACING.md, gap: 8 },
  dayCard: {
    width: 64, paddingVertical: 12, borderRadius: RADIUS.md,
    alignItems: "center", backgroundColor: "#f5f5f5",
  },
  dayCardActive: { backgroundColor: COLORS.primary },
  dayName: { fontSize: 11, fontWeight: "600", color: COLORS.textLight },
  dayNum: { fontSize: 20, fontWeight: "700", color: "#1f2937", marginVertical: 2 },
  dayMonth: { fontSize: 11, color: COLORS.textLight },
  dayTextActive: { color: "#FFFFFF" },
  slotsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: SPACING.md, gap: 8,
  },
  slotCard: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: RADIUS.sm, backgroundColor: "#f5f5f5",
    width: (Dimensions.get("window").width - SPACING.md * 2 - 8) / 2,
  },
  slotCardActive: { backgroundColor: COLORS.primary },
  slotText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  slotTextActive: { color: "#FFFFFF" },
  analyzeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0f9ff", paddingVertical: 12, borderRadius: RADIUS.md, gap: 8,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderWidth: 2, borderColor: COLORS.primary,
  },
  analyzeBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  paymentInfo: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: SPACING.md, marginTop: SPACING.lg,
    padding: 12, backgroundColor: "#FEF2F2", borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: "#FECACA",
  },
  paymentText: { fontSize: 11, color: "#991B1B", flex: 1, lineHeight: 16 },
  bottomBar: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, gap: 10,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  // Confirmation
  confirmationScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  checkCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg,
  },
  confirmTitle: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  confirmSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: "center", marginBottom: SPACING.xl },
  confirmDetails: {
    width: "100%", backgroundColor: "#f9f9f9", borderRadius: RADIUS.lg,
    padding: SPACING.md, gap: 12, marginBottom: SPACING.xl,
  },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirmText: { fontSize: 14, fontWeight: "500", color: "#4b5563" },
  homeBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: RADIUS.md,
  },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
