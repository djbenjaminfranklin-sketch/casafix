import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type ArtisanCardProps = {
  name: string;
  rating: number;
  reviewCount: number;
  phone: string;
  lastReviewComment?: string | null;
  isAvailable?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
};

export default function ArtisanCard({
  name,
  rating,
  reviewCount,
  phone,
  lastReviewComment,
  isAvailable,
  isFavorited,
  onToggleFavorite,
}: ArtisanCardProps) {
  const { t } = useTranslation();

  // Render visual star rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Icon key={i} name="star" size={16} color="#F59E0B" />
        );
      } else if (i === fullStars && hasHalf) {
        stars.push(
          <Icon key={i} name="star-half" size={16} color="#F59E0B" />
        );
      } else {
        stars.push(
          <Icon key={i} name="star-outline" size={16} color="#D1D5DB" />
        );
      }
    }
    return stars;
  };

  const handleCall = () => {
    const tel = `tel:${phone}`;
    Linking.canOpenURL(tel).then((supported) => {
      if (supported) {
        Linking.openURL(tel);
      } else {
        Alert.alert("Error", t("booking.callUnavailable"));
      }
    });
  };

  return (
    <View style={styles.card}>
      {/* Top row: avatar, name + rating, favorite button */}
      <View style={styles.topRow}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Icon name="person" size={28} color="#FFFFFF" />
          </View>
          {/* Online indicator dot */}
          {isAvailable !== undefined && (
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: isAvailable ? "#22c55e" : "#9ca3af" },
              ]}
            />
          )}
        </View>

        {/* Name + rating */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
          </View>
          <View style={styles.starsRow}>
            {renderStars()}
            <Text style={styles.reviewCountText}>
              ({reviewCount})
            </Text>
          </View>
        </View>

        {/* Favorite heart button */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={onToggleFavorite}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={isFavorited ? "heart" : "heart-outline"}
              size={24}
              color={isFavorited ? COLORS.primary : "#9ca3af"}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Recommended badge */}
      <View style={styles.recommendedBadge}>
        <Icon name="shield-checkmark" size={14} color="#16a34a" />
        <Text style={styles.recommendedText}>{t("booking.recommendedInArea")}</Text>
      </View>

      {/* Last review comment */}
      {lastReviewComment ? (
        <View style={styles.reviewBox}>
          <Icon name="chatbubble-ellipses-outline" size={14} color="#6b7280" />
          <Text style={styles.reviewText} numberOfLines={2}>
            "{lastReviewComment}"
          </Text>
        </View>
      ) : null}

      {/* Call button */}
      {phone ? (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Icon name="call" size={18} color={COLORS.primary} />
          <Text style={styles.callBtnText}>{t("booking.call")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  reviewCountText: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 4,
  },
  heartBtn: {
    padding: 4,
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: SPACING.sm,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  reviewBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  reviewText: {
    fontSize: 13,
    color: "#4b5563",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 18,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
