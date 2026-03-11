import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { createReview } from "../services/reviews";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  route: {
    params: {
      bookingId: string;
      artisanId: string;
      artisanName: string;
      serviceName: string;
    };
  };
  navigation: any;
};

export default function ReviewScreen({ route, navigation }: Props) {
  const { bookingId, artisanId, artisanName, serviceName } = route.params;
  const { t } = useTranslation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert("", t("review.selectRating"));
      return;
    }
    setLoading(true);
    const { error } = await createReview({
      bookingId,
      artisanId,
      rating,
      comment: comment.trim() || undefined,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreen}>
          <View style={styles.successCircle}>
            <Icon name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{t("review.thankYou")}</Text>
          <Text style={styles.successSubtitle}>{t("review.submitted")}</Text>

          {/* Show stars */}
          <View style={styles.starsRowCenter}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= rating ? "star" : "star-outline"}
                size={32}
                color="#F59E0B"
              />
            ))}
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
        <Text style={styles.headerTitle}>{t("review.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Artisan info */}
        <View style={styles.artisanCard}>
          <View style={styles.artisanAvatar}>
            <Icon name="person" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.artisanInfo}>
            <Text style={styles.artisanName}>{artisanName}</Text>
            <Text style={styles.serviceName}>{serviceName}</Text>
          </View>
        </View>

        {/* Rating question */}
        <Text style={styles.question}>{t("review.howWas")}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Icon
                name={star <= rating ? "star" : "star-outline"}
                size={44}
                color={star <= rating ? "#F59E0B" : "#d1d5db"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating label */}
        <Text style={styles.ratingLabel}>
          {rating === 1
            ? t("review.terrible")
            : rating === 2
              ? t("review.bad")
              : rating === 3
                ? t("review.ok")
                : rating === 4
                  ? t("review.good")
                  : rating === 5
                    ? t("review.excellent")
                    : ""}
        </Text>

        {/* Comment */}
        <Text style={styles.commentLabel}>{t("review.commentLabel")}</Text>
        <TextInput
          style={styles.commentInput}
          placeholder={t("review.commentPlaceholder")}
          placeholderTextColor={COLORS.textLight}
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{comment.length}/500</Text>
      </View>

      {/* Submit */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="star" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>{t("review.submit")}</Text>
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
  artisanCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#f9fafb", borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  artisanAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  artisanInfo: { flex: 1 },
  artisanName: { fontSize: 17, fontWeight: "700", color: "#1f2937" },
  serviceName: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  question: {
    fontSize: 18, fontWeight: "700", color: "#1f2937",
    textAlign: "center", marginBottom: SPACING.lg,
  },
  starsRow: {
    flexDirection: "row", justifyContent: "center", gap: 8,
    marginBottom: 8,
  },
  starsRowCenter: {
    flexDirection: "row", justifyContent: "center", gap: 6,
    marginVertical: SPACING.lg,
  },
  starBtn: { padding: 4 },
  ratingLabel: {
    fontSize: 15, fontWeight: "600", color: COLORS.primary,
    textAlign: "center", minHeight: 22, marginBottom: SPACING.xl,
  },
  commentLabel: {
    fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 8,
  },
  commentInput: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#e5e7eb",
    padding: 14, fontSize: 14, color: "#1f2937",
    minHeight: 100,
  },
  charCount: {
    fontSize: 11, color: COLORS.textLight, textAlign: "right", marginTop: 4,
  },
  bottomBar: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, gap: 10,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  successCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: "center" },
  homeBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: RADIUS.md,
  },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
