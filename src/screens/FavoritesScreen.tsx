import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getMyFavorites, removeFavorite } from "../services/favorites";
import { CATEGORIES } from "../constants/categories";

type FavoriteItem = {
  id: string;
  artisan_id: string;
  created_at: string;
  artisan: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating: number;
    review_count: number;
    categories: string[];
    is_available: boolean;
  };
};

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    const { data } = await getMyFavorites();
    setFavorites((data as FavoriteItem[]) || []);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleRemove = (artisanId: string, artisanName: string) => {
    Alert.alert(
      t("favorites.remove"),
      artisanName,
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("favorites.remove"),
          style: "destructive",
          onPress: async () => {
            await removeFavorite(artisanId);
            setFavorites((prev) => prev.filter((f) => f.artisan_id !== artisanId));
            Alert.alert("", t("favorites.removed"));
          },
        },
      ]
    );
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={14} color="#F59E0B" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Icon key={i} name="star-half" size={14} color="#F59E0B" />);
      } else {
        stars.push(<Icon key={i} name="star-outline" size={14} color="#D1D5DB" />);
      }
    }
    return stars;
  };

  const getCategoryLabel = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return catId;
    return t(`categories.${cat.id}`);
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const artisan = item.artisan;
    if (!artisan) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {/* Avatar with online dot */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="person" size={24} color="#FFFFFF" />
            </View>
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: artisan.is_available ? "#22c55e" : "#9ca3af" },
              ]}
            />
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{artisan.full_name}</Text>
            <View style={styles.starsRow}>
              {renderStars(artisan.rating)}
              <Text style={styles.reviewCount}>({artisan.review_count})</Text>
            </View>
          </View>

          {/* Unfavorite heart */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => handleRemove(artisan.id, artisan.full_name)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="heart" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        {artisan.categories && artisan.categories.length > 0 && (
          <View style={styles.chipsRow}>
            <Text style={styles.chipsLabel}>{t("favorites.categories")}</Text>
            <View style={styles.chips}>
              {artisan.categories.slice(0, 3).map((catId) => (
                <View key={catId} style={styles.chip}>
                  <Text style={styles.chipText}>{getCategoryLabel(catId)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.title}>{t("nav.favorites")}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>{t("nav.favorites")}</Text>

      {favorites.length === 0 ? (
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
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  heartBtn: {
    padding: 4,
  },
  chipsRow: {
    marginTop: SPACING.sm,
  },
  chipsLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
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
