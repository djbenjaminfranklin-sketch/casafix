import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
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

const { width } = Dimensions.get("window");

type BookingState = "confirm" | "searching" | "matched" | "arriving";

// Simulated artisan data
const MOCK_ARTISAN = {
  name: "Carlos M.",
  rating: 4.8,
  reviews: 127,
  punctuality: 98,
};

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

// Generate a simulated route (series of points from artisan start to user location)
function generateRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  steps: number
) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add slight curve to make it look like a real road
    const curve = Math.sin(t * Math.PI) * 0.002;
    points.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t + curve,
      longitude: from.longitude + (to.longitude - from.longitude) * t - curve * 0.5,
    });
  }
  return points;
}

export default function EmergencyBookingScreen({ route, navigation }: Props) {
  const { categoryId, serviceName, priceRange } = route.params;
  const { t } = useTranslation();
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const mapRef = useRef<MapView>(null);

  const [state, setState] = useState<BookingState>("confirm");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [description, setDescription] = useState("");
  const [aiDiagnostic, setAiDiagnostic] = useState<DiagnosticResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: 36.5105,
    longitude: -4.8826,
  });

  // Artisan live position
  const [artisanPosition, setArtisanPosition] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeProgress, setRouteProgress] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(12);

  // Pulse animation for searching
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulse2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Geolocation.requestAuthorization(
      () => {
        Geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            console.warn("Geolocation error:", err);
            Alert.alert(
              t("booking.locationError") || "Localisation",
              t("booking.locationErrorDesc") || "Impossible d'obtenir votre position. Vérifiez vos paramètres de localisation."
            );
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      },
      () => {
        Alert.alert(
          t("booking.locationError") || "Localisation",
          t("booking.locationDenied") || "L'accès à la localisation est nécessaire pour trouver un artisan proche."
        );
      }
    );
  }, []);

  // Search pulse animation
  useEffect(() => {
    if (state === "searching") {
      const pulse = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      const pulse2 = Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(pulse2Anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      pulse2.start();

      // Simulate match after 4 seconds
      const timer = setTimeout(() => {
        pulse.stop();
        pulse2.stop();
        setState("matched");
      }, 4000);

      return () => {
        clearTimeout(timer);
        pulse.stop();
        pulse2.stop();
      };
    }
  }, [state, pulseAnim, pulse2Anim]);

  // When matched: generate route and start artisan movement
  useEffect(() => {
    if (state === "matched") {
      const artisanStart = {
        latitude: userLocation.latitude + 0.015,
        longitude: userLocation.longitude + 0.01,
      };
      const fullRoute = generateRoute(artisanStart, userLocation, 50);
      setRoutePoints(fullRoute);
      setArtisanPosition(artisanStart);
      setRouteProgress(0);
      setEtaMinutes(12);

      // Fit map to show both user and artisan
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [userLocation, artisanStart],
          { edgePadding: { top: 100, right: 60, bottom: 300, left: 60 }, animated: true }
        );
      }, 500);

      // After 2 seconds, switch to "arriving" state and start movement
      const arriveTimer = setTimeout(() => {
        setState("arriving");
      }, 2000);

      return () => clearTimeout(arriveTimer);
    }
  }, [state, userLocation]);

  // Subscribe to booking realtime updates (detect price_proposed)
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = subscribeToBooking(bookingId, async (updatedBooking: Booking) => {
      if (updatedBooking.status === "price_proposed" && updatedBooking.proposed_price) {
        // Fetch artisan details
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

  // Simulate artisan moving along the route
  useEffect(() => {
    if (state === "arriving" && routePoints.length > 0) {
      let step = routeProgress;
      const interval = setInterval(() => {
        step += 1;
        if (step >= routePoints.length) {
          clearInterval(interval);
          return;
        }
        setArtisanPosition(routePoints[step]);
        setRouteProgress(step);

        // Update ETA based on remaining distance
        const remaining = routePoints.length - step;
        const newEta = Math.max(1, Math.round((remaining / routePoints.length) * 12));
        setEtaMinutes(newEta);
      }, 800); // Move every 800ms

      return () => clearInterval(interval);
    }
  }, [state, routePoints, routeProgress]);

  // AI Analysis - before booking
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

  const handleConfirm = async () => {
    setState("searching");

    // Create real booking in Supabase
    const { data: booking } = await createBooking({
      categoryId,
      serviceId: route.params.serviceId,
      serviceName: serviceName,
      priceRange,
      type: "emergency",
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
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
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 4],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });
  const pulse2Scale = pulse2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 4],
  });
  const pulse2Opacity = pulse2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  // Remaining route (from artisan current position to user)
  const remainingRoute = routePoints.slice(routeProgress);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={{
          ...userLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Route polyline */}
        {(state === "matched" || state === "arriving") && remainingRoute.length > 1 && (
          <Polyline
            coordinates={remainingRoute}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Artisan marker (moving) */}
        {(state === "matched" || state === "arriving") && artisanPosition.latitude !== 0 && (
          <Marker
            coordinate={artisanPosition}
            title={MOCK_ARTISAN.name}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.artisanMarkerOuter}>
              <View style={styles.artisanMarker}>
                <Icon name="car" size={18} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* User destination marker */}
        {(state === "matched" || state === "arriving") && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDestMarker}>
              <Icon name="home" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Back button overlay */}
      <TouchableOpacity
        style={styles.backBtnOverlay}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color={COLORS.text} />
      </TouchableOpacity>

      {/* ETA overlay on map when artisan is moving */}
      {state === "arriving" && (
        <View style={styles.etaOverlay}>
          <Icon name="car" size={16} color={COLORS.primary} />
          <Text style={styles.etaOverlayText}>{etaMinutes} min</Text>
        </View>
      )}

      {/* Search pulse overlay */}
      {state === "searching" && (
        <View style={styles.pulseOverlay}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseCircle,
              { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity },
            ]}
          />
          <View style={styles.searchingDot}>
            <Icon name="search" size={24} color="#FFFFFF" />
          </View>
        </View>
      )}

      {/* Bottom card */}
      <ScrollView style={styles.bottomCard} bounces={false} showsVerticalScrollIndicator={false}>
        {state === "confirm" && (
          <>
            {/* Service info */}
            <View style={styles.serviceRow}>
              <View style={[styles.svcIcon, { backgroundColor: category?.bg }]}>
                <Icon name={category?.icon || "build"} size={20} color={category?.color} />
              </View>
              <View style={styles.svcInfo}>
                <Text style={styles.svcName}>{serviceName}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t("payment.maxPrice")}</Text>
                  <Text style={styles.priceValue}>{priceRange}</Text>
                </View>
              </View>
            </View>

            {/* 2h guarantee */}
            <View style={styles.guaranteeBadge}>
              <Icon name="timer-outline" size={18} color="#16a34a" />
              <Text style={styles.guaranteeText}>{t("booking.guarantee2h")}</Text>
            </View>

            {/* Payment info */}
            <View style={styles.paymentRow}>
              <Icon name="card" size={16} color={COLORS.primary} />
              <Text style={styles.paymentText}>{t("payment.explanation")}</Text>
            </View>

            {/* Photos / Videos */}
            <MediaPicker media={media} onMediaChange={setMedia} maxItems={5} description={description} onDescriptionChange={setDescription} />

            {/* Analyze button - appears when photos + description are present */}
            {media.length > 0 && description.trim().length > 0 && !aiDiagnostic && (
              <TouchableOpacity
                style={[styles.analyzeBtn, analyzingAi && { opacity: 0.6 }]}
                onPress={handleAnalyze}
                activeOpacity={0.85}
                disabled={analyzingAi}
              >
                {analyzingAi ? (
                  <>
                    <Icon name="sparkles" size={20} color={COLORS.primary} />
                    <Text style={styles.analyzeBtnText}>{t("diagnostic.analyzing")}</Text>
                    <View style={styles.dots}>
                      <AnimatedDot delay={0} />
                      <AnimatedDot delay={200} />
                      <AnimatedDot delay={400} />
                    </View>
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={20} color={COLORS.primary} />
                    <Text style={styles.analyzeBtnText}>{t("diagnostic.analyze")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* AI Diagnostic result */}
            {aiDiagnostic && <DiagnosticCard diagnostic={aiDiagnostic} />}

            {/* Confirm button */}
            <TouchableOpacity style={[styles.confirmBtn, analyzingAi && { opacity: 0.4 }]} onPress={handleConfirm} activeOpacity={0.85} disabled={analyzingAi}>
              <Icon name="flash" size={20} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>{t("booking.confirmEmergency")}</Text>
            </TouchableOpacity>
          </>
        )}

        {state === "searching" && (
          <View style={styles.searchingCard}>
            <Text style={styles.searchingTitle}>{t("booking.searching")}</Text>
            <Text style={styles.searchingSubtitle}>{t("booking.searchingDesc")}</Text>
            <View style={styles.dots}>
              <AnimatedDot delay={0} />
              <AnimatedDot delay={200} />
              <AnimatedDot delay={400} />
            </View>
          </View>
        )}

        {(state === "matched" || state === "arriving") && (
          <>
            <View style={styles.matchedHeader}>
              <Icon name="checkmark-circle" size={24} color="#16a34a" />
              <Text style={styles.matchedTitle}>
                {state === "arriving" ? t("booking.artisanOnWay") : t("booking.artisanFound")}
              </Text>
            </View>

            {/* Artisan info */}
            <View style={styles.artisanRow}>
              <View style={styles.artisanAvatar}>
                <Icon name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.artisanInfo}>
                <Text style={styles.artisanName}>{MOCK_ARTISAN.name}</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {MOCK_ARTISAN.rating} ({MOCK_ARTISAN.reviews})
                  </Text>
                  <View style={styles.punctualityBadge}>
                    <Icon name="timer-outline" size={12} color="#16a34a" />
                    <Text style={styles.punctualityText}>{MOCK_ARTISAN.punctuality}%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.etaBox}>
                <Icon name="car" size={16} color={COLORS.primary} />
                <Text style={styles.etaText}>{etaMinutes} min</Text>
              </View>
            </View>

            {/* Service + price */}
            <View style={styles.matchedService}>
              <Text style={styles.matchedServiceName}>{serviceName}</Text>
              <Text style={styles.matchedServicePrice}>{priceRange}</Text>
            </View>

            {/* Actions */}
            <View style={styles.matchedActions}>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const phone = "tel:+34600000000";
                  Linking.canOpenURL(phone).then((supported) => {
                    if (supported) {
                      Linking.openURL(phone);
                    } else {
                      Alert.alert("Error", t("booking.callUnavailable"));
                    }
                  });
                }}
              >
                <Icon name="call" size={20} color={COLORS.primary} />
                <Text style={styles.callBtnText}>{t("booking.call")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (bookingId) {
                    navigation.navigate("Chat", {
                      bookingId,
                      artisanName: MOCK_ARTISAN.name,
                    });
                  }
                }}
              >
                <Icon name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.chatBtnText}>{t("booking.chat")}</Text>
              </TouchableOpacity>
            </View>

            {/* Report */}
            <TouchableOpacity
              style={styles.reportLink}
              onPress={async () => {
                if (!bookingId) return;
                const { data } = await getBookingWithArtisan(bookingId);
                navigation.navigate("Report", {
                  bookingId,
                  reportedUserId: data?.artisan?.id || "",
                  reportedUserName: data?.artisan?.full_name || MOCK_ARTISAN.name,
                });
              }}
              activeOpacity={0.7}
            >
              <Icon name="flag-outline" size={16} color="#6b7280" />
              <Text style={styles.reportLinkText}>{t("report.title")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Animated loading dot
function AnimatedDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[
        styles.loadingDot,
        { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] },
        { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  map: { flex: 1 },
  backBtnOverlay: {
    position: "absolute", top: 60, left: SPACING.md,
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  etaOverlay: {
    position: "absolute", top: 60, right: SPACING.md,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 22,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  etaOverlayText: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  pulseOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  pulseCircle: {
    position: "absolute", width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  searchingDot: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  artisanMarkerOuter: {
    padding: 4, borderRadius: 24, backgroundColor: "rgba(239,68,68,0.15)",
  },
  artisanMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  userDestMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFFFFF",
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 40,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: SPACING.md },
  svcIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: "center", justifyContent: "center",
  },
  svcInfo: { flex: 1 },
  svcName: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  priceLabel: { fontSize: 11, color: COLORS.textLight },
  priceValue: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  guaranteeBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#dcfce7", paddingVertical: 10, borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: "#bbf7d0",
  },
  guaranteeText: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  paymentRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FEF2F2", padding: 12, borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  paymentText: { fontSize: 11, color: "#991B1B", flex: 1, lineHeight: 16 },
  analyzeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0f9ff", paddingVertical: 12, borderRadius: RADIUS.md, gap: 8,
    marginBottom: SPACING.sm, borderWidth: 2, borderColor: COLORS.primary,
  },
  analyzeBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, gap: 10,
  },
  confirmBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  searchingCard: { alignItems: "center", paddingVertical: SPACING.md },
  searchingTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  searchingSubtitle: { fontSize: 13, color: COLORS.textLight, textAlign: "center" },
  dots: { flexDirection: "row", gap: 8, marginTop: SPACING.md },
  loadingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  matchedHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md,
  },
  matchedTitle: { fontSize: 17, fontWeight: "700", color: "#16a34a" },
  artisanRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f9f9f9", padding: 12, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
  },
  artisanAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  artisanInfo: { flex: 1 },
  artisanName: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" },
  ratingText: { fontSize: 13, color: "#6b7280" },
  punctualityBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    marginLeft: 4,
  },
  punctualityText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  etaBox: {
    alignItems: "center", gap: 4, backgroundColor: "#FEF2F2",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm,
  },
  etaText: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  matchedService: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: SPACING.sm, marginBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  matchedServiceName: { fontSize: 14, fontWeight: "500", color: "#4b5563" },
  matchedServicePrice: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  matchedActions: { flexDirection: "row", gap: SPACING.sm },
  callBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: RADIUS.sm, gap: 8,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  callBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  chatBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.sm, gap: 8,
  },
  chatBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  reportLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: SPACING.sm, paddingVertical: 10,
  },
  reportLinkText: { fontSize: 13, color: "#6b7280", textDecorationLine: "underline" },
});
