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
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import Icon from "react-native-vector-icons/Ionicons";
import QRCodeGen from "qrcode";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import MediaPicker from "../components/MediaPicker";
import DiagnosticCard from "../components/DiagnosticCard";
import ArtisanCard from "../components/ArtisanCard";
import ArtisanPortfolio from "../components/ArtisanPortfolio";
import { MediaItem, uploadAllMedia } from "../services/media";
import { createBooking, subscribeToBooking, getBookingWithArtisan, reportNoShow } from "../services/bookings";
import { createPaymentIntent } from "../lib/stripe";
import { usePaymentSheet } from "@stripe/stripe-react-native";
import { addFavorite, removeFavorite, isFavorite } from "../services/favorites";
import { supabase } from "../lib/supabase";
import { Booking } from "../lib/database.types";
import { analyzeProblem, DiagnosticResult } from "../services/ai-diagnostic";

const { width } = Dimensions.get("window");

type BookingState = "confirm" | "searching" | "choosing" | "matched" | "arriving";

type ArtisanProposal = {
  id: string;
  artisan_id: string;
  name: string;
  rating: number;
  reviews: number;
  phone: string;
  avatarUrl: string | null;
  lastComment: string | null;
};


type Props = {
  route: {
    params: {
      categoryId: string;
      serviceId: string;
      serviceName: string;
      priceRange: string;
      resumeBookingId?: string;
    };
  };
  navigation: any;
};

export default function EmergencyBookingScreen({ route, navigation }: Props) {
  const { categoryId, serviceName, priceRange, resumeBookingId } = route.params;
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const mapRef = useRef<MapView>(null);

  const [state, setState] = useState<BookingState>("confirm");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [description, setDescription] = useState("");
  const [aiDiagnostic, setAiDiagnostic] = useState<DiagnosticResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState(120); // 2 minutes
  const [canCancelFree, setCanCancelFree] = useState(true);
  const [matchedArtisan, setMatchedArtisan] = useState<{
    id: string;
    name: string;
    rating: number;
    reviews: number;
    phone: string;
    isAvailable: boolean;
    lastReviewComment: string | null;
    isFavorited: boolean;
  } | null>(null);
  const [arrivalCode, setArrivalCode] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [proposals, setProposals] = useState<ArtisanProposal[]>([]);
  const [selectingArtisan, setSelectingArtisan] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [locationFailed, setLocationFailed] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fallback: center of France if geolocation fails
  const FALLBACK_LOCATION = { latitude: 48.8566, longitude: 2.3522 };
  const displayLocation = userLocation || FALLBACK_LOCATION;

  // Helper: fetch full artisan details (last review + favorite status)
  const fetchFullArtisanDetails = async (artisanData: any, artisanId: string) => {
    // Fetch last review
    let lastReviewComment: string | null = null;
    const { data: reviews } = await supabase
      .from("reviews")
      .select("comment")
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (reviews && reviews.length > 0 && reviews[0].comment) {
      lastReviewComment = reviews[0].comment;
    }

    // Check favorite status
    const favorited = await isFavorite(artisanId);

    return {
      id: artisanId,
      name: artisanData.full_name || "Artisan",
      rating: artisanData.rating || 0,
      reviews: artisanData.review_count || 0,
      phone: artisanData.phone || "",
      isAvailable: artisanData.is_available ?? true,
      lastReviewComment,
      isFavorited: favorited,
    };
  };

  // Toggle favorite for matched artisan
  const handleToggleFavorite = async () => {
    if (!matchedArtisan) return;
    if (matchedArtisan.isFavorited) {
      await removeFavorite(matchedArtisan.id);
      setMatchedArtisan({ ...matchedArtisan, isFavorited: false });
      Alert.alert("", t("favorites.removed"));
    } else {
      await addFavorite(matchedArtisan.id);
      setMatchedArtisan({ ...matchedArtisan, isFavorited: true });
      Alert.alert("", t("favorites.added"));
    }
  };

  // Artisan live position
  const [artisanPosition, setArtisanPosition] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [etaMinutes, setEtaMinutes] = useState(0);

  // Pulse animation for searching
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulse2Anim = useRef(new Animated.Value(0)).current;

  // Watch position — force fresh GPS, never use cache
  useEffect(() => {
    let watchId: number | null = null;

    Geolocation.requestAuthorization(
      () => {
        // Watch GPS with no cache — forces a fresh fix
        watchId = Geolocation.watchPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            setLocationFailed(true);
          },
          { enableHighAccuracy: true, distanceFilter: 10, maximumAge: 0, timeout: 20000 }
        );
      },
      () => {
        setLocationFailed(true);
      }
    );

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, []);

  // Resume an existing active booking (when returning to app)
  useEffect(() => {
    if (!resumeBookingId) return;

    setBookingId(resumeBookingId);

    (async () => {
      const { data } = await getBookingWithArtisan(resumeBookingId);
      if (!data) return;

      if (data.arrival_code) setArrivalCode(data.arrival_code);

      if (data.status === "searching") {
        setState("searching");
      } else if (data.status === "matched" || data.status === "in_progress") {
        if (data.artisan) {
          const artisanDetails = await fetchFullArtisanDetails(data.artisan, data.artisan.id);
          setMatchedArtisan(artisanDetails);
        }
        setState("matched");
      } else if (data.status === "price_proposed" && data.proposed_price) {
        navigation.replace("PriceConfirmation", {
          bookingId: resumeBookingId,
          serviceName,
          artisanName: data.artisan?.full_name || "",
          categoryId,
          depositAmount: data.deposit_amount || data.max_price,
          proposedPrice: data.proposed_price,
          paymentIntentId: data.stripe_payment_intent_id || "",
        });
      }
    })();
  }, [resumeBookingId]);

  // 2-minute free cancellation countdown based on booking creation time
  // Generate QR code matrix
  const qrMatrix = React.useMemo(() => {
    if (!arrivalCode || !bookingId) return [];
    try {
      const qr = QRCodeGen.create(`CASAFIX:${bookingId}:${arrivalCode}`, { errorCorrectionLevel: "M" });
      const size = qr.modules.size;
      const matrix: boolean[][] = [];
      for (let row = 0; row < size; row++) {
        const rowData: boolean[] = [];
        for (let col = 0; col < size; col++) {
          rowData.push(qr.modules.get(row, col) === 1);
        }
        matrix.push(rowData);
      }
      return matrix;
    } catch {
      return [];
    }
  }, [arrivalCode, bookingId]);

  const bookingCreatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (state !== "searching" || !bookingId) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const initTimer = async () => {
      if (!bookingCreatedRef.current) {
        const { data } = await supabase
          .from("bookings")
          .select("created_at")
          .eq("id", bookingId)
          .single();
        if (data?.created_at) {
          bookingCreatedRef.current = data.created_at;
        }
      }

      if (cancelled) return;

      const updateCountdown = () => {
        if (!bookingCreatedRef.current) return;
        const elapsed = Math.floor(
          (Date.now() - new Date(bookingCreatedRef.current).getTime()) / 1000
        );
        const remaining = Math.max(0, 120 - elapsed);
        setCancelCountdown(remaining);
        if (remaining <= 0) {
          setCanCancelFree(false);
          if (interval) { clearInterval(interval); interval = null; }
        }
      };

      updateCountdown();
      if (!cancelled) {
        interval = setInterval(updateCountdown, 1000);
      }
    };

    initTimer();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [state, bookingId]);

  // 30-minute search timeout
  useEffect(() => {
    if (state !== "searching" || !bookingId) return;
    const timeout = setTimeout(async () => {
      Alert.alert(
        t("booking.noArtisanTitle"),
        t("booking.noArtisanDesc"),
        [{
          text: "OK",
          onPress: async () => {
            await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
            navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
          },
        }]
      );
    }, 30 * 60 * 1000); // 30 minutes
    return () => clearTimeout(timeout);
  }, [state, bookingId]);

  // 45-minute no-show timer after artisan matched
  useEffect(() => {
    if ((state !== "matched" && state !== "arriving") || !bookingId) return;
    const noShowTimeout = setTimeout(() => {
      Alert.alert(
        t("booking.noShowTitle"),
        t("booking.noShowDesc"),
        [
          {
            text: t("booking.noShowResearch"),
            onPress: async () => {
              await reportNoShow(bookingId);
              // Re-create a new booking with same params
              navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
            },
          },
          {
            text: t("booking.noShowCancel"),
            style: "cancel",
            onPress: async () => {
              await reportNoShow(bookingId);
              navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
            },
          },
        ]
      );
    }, 45 * 60 * 1000); // 45 minutes
    return () => clearTimeout(noShowTimeout);
  }, [state, bookingId]);

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

      // No more simulation - wait for real artisan match via realtime subscription

      return () => {
        pulse.stop();
        pulse2.stop();
      };
    }
  }, [state, pulseAnim, pulse2Anim]);

  // When matched: get real artisan position and calculate ETA
  useEffect(() => {
    if (state === "matched" && bookingId) {
      // Fetch artisan's real position
      (async () => {
        const { data } = await getBookingWithArtisan(bookingId);
        if (data?.artisan) {
          const artLat = data.artisan.latitude || displayLocation.latitude;
          const artLng = data.artisan.longitude || displayLocation.longitude;
          const artisanPos = { latitude: artLat, longitude: artLng };

          setArtisanPosition(artisanPos);

          // Calculate real distance (km) and ETA (assuming 40km/h average in city)
          const R = 6371;
          const dLat = ((displayLocation.latitude - artLat) * Math.PI) / 180;
          const dLng = ((displayLocation.longitude - artLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((artLat * Math.PI) / 180) *
              Math.cos((displayLocation.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = R * c;
          const etaMin = Math.max(1, Math.round((distanceKm / 40) * 60 * 1.3)); // 1.3x for road factor
          setEtaMinutes(etaMin);

          // Fit map to show both user and artisan
          if (distanceKm > 0.1) {
            setTimeout(() => {
              mapRef.current?.fitToCoordinates(
                [displayLocation, artisanPos],
                { edgePadding: { top: 100, right: 60, bottom: 300, left: 60 }, animated: true }
              );
            }, 500);
          }
        }

        // Switch to arriving state
        setState("arriving");
      })();
    }
  }, [state, bookingId]);

  // Subscribe to booking realtime updates (detect price_proposed)
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = subscribeToBooking(bookingId, async (updatedBooking: Booking) => {
      // Update ETA if artisan sent one
      if (updatedBooking.estimated_arrival) {
        const remaining = Math.max(0, Math.round(
          (new Date(updatedBooking.estimated_arrival).getTime() - Date.now()) / 60000
        ));
        setEtaMinutes(remaining);
      }

      // Artisan accepted the booking
      if (updatedBooking.status === "matched" && updatedBooking.artisan_id) {
        const { data: fullBooking } = await getBookingWithArtisan(bookingId);
        if (fullBooking?.artisan) {
          const artisanDetails = await fetchFullArtisanDetails(fullBooking.artisan, fullBooking.artisan.id);
          setMatchedArtisan(artisanDetails);
        }
        setState("matched");
      }

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

  // Subscribe to artisan proposals (multi-artisan)
  useEffect(() => {
    if (!bookingId || (state !== "searching" && state !== "choosing")) return;

    const channel = supabase
      .channel(`proposals-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_proposals",
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload: any) => {
          const proposal = payload.new;
          // Fetch artisan details + last review
          const { data: artisan } = await supabase
            .from("artisans")
            .select("id, full_name, rating, review_count, phone, avatar_url")
            .eq("id", proposal.artisan_id)
            .single();

          let lastComment: string | null = null;
          if (artisan) {
            const { data: lastReview } = await supabase
              .from("reviews")
              .select("comment")
              .eq("artisan_id", artisan.id)
              .not("comment", "is", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastComment = lastReview?.comment || null;
          }

          if (artisan) {
            setProposals((prev) => {
              if (prev.find((p) => p.artisan_id === artisan.id)) return prev;
              return [...prev, {
                id: proposal.id,
                artisan_id: artisan.id,
                name: artisan.full_name,
                rating: artisan.rating || 0,
                reviews: artisan.review_count || 0,
                phone: artisan.phone || "",
                avatarUrl: artisan.avatar_url || null,
                lastComment,
              }];
            });
            if (state === "searching") {
              setState("choosing");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, state]);

  // Select an artisan from proposals
  const handleSelectArtisan = async (artisanId: string) => {
    if (!bookingId || selectingArtisan) return;
    setSelectingArtisan(true);

    const { error } = await supabase.rpc("client_select_artisan", {
      p_booking_id: bookingId,
      p_artisan_id: artisanId,
    });

    if (!error) {
      const selected = proposals.find((p) => p.artisan_id === artisanId);
      if (selected) {
        setMatchedArtisan({
          id: selected.artisan_id,
          name: selected.name,
          rating: selected.rating,
          reviews: selected.reviews,
          phone: selected.phone,
          isAvailable: true,
          lastReviewComment: null,
          isFavorited: false,
        });
      }

      // Notify selected artisan
      await supabase.from("notification_queue").insert({
        user_id: artisanId,
        title: t("notifications.artisanSelected"),
        body: t("notifications.artisanSelectedBody", { service: serviceName }),
        data: JSON.stringify({ type: "selected", booking_id: bookingId }),
        sent: false,
      });

      // Notify non-selected artisans
      const nonSelected = proposals.filter((p) => p.artisan_id !== artisanId);
      for (const p of nonSelected) {
        await supabase.from("notification_queue").insert({
          user_id: p.artisan_id,
          title: t("notifications.artisanNotSelected"),
          body: t("notifications.artisanNotSelectedBody", { service: serviceName }),
          data: JSON.stringify({ type: "not_selected", booking_id: bookingId }),
          sent: false,
        });
      }

      setState("matched");
    }
    setSelectingArtisan(false);
  };

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

      Alert.alert(t("diagnostic.error"), e.message || t("diagnostic.analysisFailed"));
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleConfirm = async () => {
    if (submitting) return;
    if (locationFailed && !manualAddress.trim()) {
      Alert.alert("", t("booking.addressRequired"));
      return;
    }
    setSubmitting(true);

    // Build description with address if manual
    const fullDescription = locationFailed && manualAddress.trim()
      ? `[Adresse: ${manualAddress.trim()}] ${description.trim() || ""}`
      : description.trim() || undefined;

    // 1. Create booking in Supabase (status: searching)
    const { data: booking } = await createBooking({
      categoryId,
      serviceId: route.params.serviceId,
      serviceName: serviceName,
      priceRange,
      type: "emergency",
      latitude: displayLocation.latitude,
      longitude: displayLocation.longitude,
      description: fullDescription,
    });

    if (!booking) {
      Alert.alert(t("common.error"), t("booking.createError"));
      setSubmitting(false);
      return;
    }

    // 2. Create PaymentIntent (pre-auth for max_price)
    const maxPrice = booking.max_price || 150;
    const piResult = await createPaymentIntent({
      bookingId: booking.id,
      amount: Math.round(maxPrice * 100), // cents
      currency: "eur",
    });

    if (!piResult) {
      // Payment setup failed — cancel the booking
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      Alert.alert(t("common.error"), t("payment.setupError"));
      setSubmitting(false);
      return;
    }

    // 3. Show PaymentSheet for card input
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: piResult.clientSecret,
      merchantDisplayName: "CasaFix",
      style: "automatic",
      applePay: {
        merchantCountryCode: "ES",
      },
    });

    if (initError) {
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      Alert.alert(t("common.error"), initError.message);
      setSubmitting(false);
      return;
    }

    const { error: sheetError } = await presentPaymentSheet();

    if (sheetError) {
      // User cancelled the payment sheet
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      setSubmitting(false);
      return;
    }

    // 4. Payment authorized — now switch to searching (triggers artisan notifications)
    setState("searching");
    setBookingId(booking.id);

    // Generate arrival code and activate the booking
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    setArrivalCode(code);
    await supabase
      .from("bookings")
      .update({ arrival_code: code, deposit_amount: maxPrice, status: "searching" })
      .eq("id", booking.id);

    // Upload media if any
    if (media.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await uploadAllMedia(booking.id, user.id, media);
      }
    }

    // Trigger push notifications to nearest artisans (max 5)
    supabase.functions.invoke("process-notifications").catch(() => {});

    setSubmitting(false);
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


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={{
          ...displayLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Artisan marker */}
        {(state === "matched" || state === "arriving") && artisanPosition.latitude !== 0 && (
          <Marker
            coordinate={artisanPosition}
            title={matchedArtisan?.name || "Artisan"}
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
          <Marker coordinate={displayLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDestMarker}>
              <Icon name="home" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Navigation buttons overlay */}
      <TouchableOpacity
        style={styles.backBtnOverlay}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.homeBtnOverlay}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] })}
      >
        <Icon name="home" size={20} color={COLORS.text} />
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
      <ScrollView
        style={[
          styles.bottomCard,
          (state === "matched" || state === "arriving") && styles.bottomCardCompact,
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={state !== "matched" && state !== "arriving"}
      >
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

            {/* Payment info - trust badge */}
            <View style={styles.trustBadge}>
              <View style={styles.trustBadgeHeader}>
                <Icon name="shield-checkmark" size={20} color="#16a34a" />
                <Text style={styles.trustBadgeTitle}>{t("payment.secure")}</Text>
              </View>
              <Text style={styles.trustBadgeText}>{t("payment.explanation")}</Text>
            </View>

            {/* Manual address fallback */}
            {locationFailed && (
              <View style={styles.addressContainer}>
                <View style={styles.addressHeader}>
                  <Icon name="location-outline" size={18} color="#d97706" />
                  <Text style={styles.addressLabel}>{t("booking.enterAddress")}</Text>
                </View>
                <TextInput
                  style={styles.addressInput}
                  placeholder={t("booking.addressPlaceholder")}
                  placeholderTextColor="#9ca3af"
                  value={manualAddress}
                  onChangeText={setManualAddress}
                />
              </View>
            )}

            {/* Photos / Videos */}
            <MediaPicker media={media} onMediaChange={setMedia} maxItems={5} description={description} onDescriptionChange={setDescription} />

            {/* Photo help text */}
            <View style={styles.photoHelpRow}>
              <Icon name="camera-outline" size={16} color="#6b7280" />
              <Text style={styles.photoHelpText}>{t("booking.photoHelp")}</Text>
            </View>

            {/* Confirm button */}
            <TouchableOpacity style={[styles.confirmBtn, submitting && { opacity: 0.4 }]} onPress={handleConfirm} activeOpacity={0.85} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="flash" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>{t("booking.confirmEmergency")}</Text>
                </>
              )}
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

            {/* Free cancellation countdown */}
            {canCancelFree && (
              <TouchableOpacity
                style={styles.freeCancelBtn}
                onPress={() => {
                  Alert.alert(
                    t("booking.cancelTitle"),
                    t("booking.cancelFreeDesc"),
                    [
                      { text: t("priceConfirm.no"), style: "cancel" },
                      {
                        text: t("booking.yesCancel"),
                        style: "destructive",
                        onPress: async () => {
                          if (bookingId) {
                            await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
                          }
                          navigation.goBack();
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.freeCancelText}>
                  {t("booking.cancelFree")} ({Math.floor(cancelCountdown / 60)}:{String(cancelCountdown % 60).padStart(2, "0")})
                </Text>
              </TouchableOpacity>
            )}

            {!canCancelFree && (
              <Text style={styles.cancelExpired}>{t("booking.cancelFeeWarning")}</Text>
            )}
          </View>
        )}

        {state === "choosing" && (
          <View style={styles.choosingCard}>
            <Text style={styles.choosingTitle}>{proposals.length} {t("booking.artisansAvailable")}</Text>
            <Text style={styles.choosingSubtitle}>{t("booking.chooseArtisan")}</Text>

            {proposals.map((p) => (
              <View key={p.artisan_id} style={styles.proposalCard}>
                <TouchableOpacity
                  style={styles.proposalRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelectArtisan(p.artisan_id)}
                  disabled={selectingArtisan}
                >
                  {p.avatarUrl ? (
                    <Image source={{ uri: p.avatarUrl }} style={styles.proposalAvatarImg} />
                  ) : (
                    <View style={styles.proposalAvatar}>
                      <Icon name="person" size={20} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.proposalInfo}>
                    <Text style={styles.proposalName}>{p.name}</Text>
                    <View style={styles.proposalStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name={star <= Math.round(p.rating) ? "star" : "star-outline"}
                          size={14}
                          color="#f59e0b"
                        />
                      ))}
                      <Text style={styles.proposalRatingText}>
                        {p.rating.toFixed(1)} ({p.reviews})
                      </Text>
                    </View>
                    {p.lastComment && (
                      <Text style={styles.proposalComment} numberOfLines={2}>
                        "{p.lastComment}"
                      </Text>
                    )}
                  </View>
                  <View style={styles.proposalSelectBtn}>
                    <Text style={styles.proposalSelectText}>{t("booking.select")}</Text>
                  </View>
                </TouchableOpacity>
                <ArtisanPortfolio artisanId={p.artisan_id} />
              </View>
            ))}

            <Text style={styles.choosingWait}>{t("booking.waitingMore")}</Text>
          </View>
        )}

        {(state === "matched" || state === "arriving") && (
          <>
            {/* Compact status + ETA */}
            <View style={styles.trackingHeader}>
              <View style={styles.trackingStatus}>
                <Icon name="checkmark-circle" size={20} color="#16a34a" />
                <Text style={styles.trackingStatusText}>
                  {state === "arriving" ? t("booking.artisanOnWay") : t("booking.artisanFound")}
                </Text>
              </View>
              {etaMinutes > 0 && (
                <View style={styles.trackingEta}>
                  <Icon name="car" size={14} color={COLORS.primary} />
                  <Text style={styles.trackingEtaText}>{etaMinutes} min</Text>
                </View>
              )}
            </View>

            {/* Artisan info row */}
            <View style={styles.trackingArtisan}>
              <View style={styles.trackingArtisanAvatar}>
                <Icon name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.trackingArtisanInfo}>
                <Text style={styles.trackingArtisanName}>{matchedArtisan?.name || "Artisan"}</Text>
                <View style={styles.trackingRating}>
                  <Icon name="star" size={12} color="#f59e0b" />
                  <Text style={styles.trackingRatingText}>
                    {matchedArtisan?.rating?.toFixed(1) || "0.0"} ({matchedArtisan?.reviews || 0})
                  </Text>
                  <Text style={styles.trackingServiceText}> · {serviceName}</Text>
                </View>
              </View>
              <Text style={styles.trackingPrice}>{priceRange}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.trackingActions}>
              <TouchableOpacity
                style={styles.trackingCallBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const phone = `tel:${matchedArtisan?.phone || ""}`;
                  Linking.canOpenURL(phone).then((supported) => {
                    if (supported) {
                      Linking.openURL(phone);
                    } else {
                      Alert.alert(t("common.error"), t("booking.callUnavailable"));
                    }
                  });
                }}
              >
                <Icon name="call" size={18} color={COLORS.primary} />
                <Text style={styles.trackingCallText}>{t("booking.call")}</Text>
              </TouchableOpacity>

              {arrivalCode && bookingId && (
                <TouchableOpacity
                  style={styles.trackingQRBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowQRModal(true)}
                >
                  <Icon name="qr-code" size={18} color="#FFFFFF" />
                  <Text style={styles.trackingQRText}>QR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.trackingChatBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (bookingId) {
                    navigation.navigate("Chat", {
                      bookingId,
                      artisanName: matchedArtisan?.name || "Artisan",
                    });
                  }
                }}
              >
                <Icon name="chatbubble" size={18} color="#FFFFFF" />
                <Text style={styles.trackingChatText}>{t("booking.chat")}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity
              style={styles.qrModalClose}
              onPress={() => setShowQRModal(false)}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.qrModalTitle}>{t("booking.showQrToArtisan")}</Text>
            {qrMatrix.length > 0 && (
              <View style={{ backgroundColor: "#FFFFFF", padding: 8 }}>
                {qrMatrix.map((row, rowIdx) => (
                  <View key={rowIdx} style={{ flexDirection: "row" }}>
                    {row.map((cell, colIdx) => (
                      <View
                        key={colIdx}
                        style={{
                          width: Math.floor(200 / qrMatrix.length),
                          height: Math.floor(200 / qrMatrix.length),
                          backgroundColor: cell ? "#1f2937" : "#FFFFFF",
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.qrModalCode}>{arrivalCode}</Text>
          </View>
        </View>
      </Modal>
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
  homeBtnOverlay: {
    position: "absolute", top: 60, left: SPACING.md + 52,
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
  bottomCardCompact: {
    maxHeight: 220,
    paddingTop: SPACING.md, paddingBottom: SPACING.lg,
  },
  trackingHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10,
  },
  trackingStatus: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  trackingStatusText: {
    fontSize: 15, fontWeight: "700", color: "#16a34a",
  },
  trackingEta: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f0f9ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  trackingEtaText: {
    fontSize: 14, fontWeight: "700", color: COLORS.primary,
  },
  trackingArtisan: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 12,
  },
  trackingArtisanAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  trackingArtisanInfo: { flex: 1 },
  trackingArtisanName: {
    fontSize: 15, fontWeight: "600", color: "#1f2937",
  },
  trackingRating: {
    flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2,
  },
  trackingRatingText: { fontSize: 12, color: "#6b7280" },
  trackingServiceText: { fontSize: 12, color: "#9ca3af" },
  trackingPrice: {
    fontSize: 15, fontWeight: "700", color: COLORS.primary,
  },
  trackingActions: {
    flexDirection: "row", gap: 10,
  },
  trackingCallBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  trackingCallText: {
    fontSize: 14, fontWeight: "600", color: COLORS.primary,
  },
  trackingChatBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  trackingChatText: {
    fontSize: 14, fontWeight: "600", color: "#FFFFFF",
  },
  trackingQRBtn: {
    width: 48, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: "#1f2937",
  },
  trackingQRText: {
    fontSize: 12, fontWeight: "700", color: "#FFFFFF",
  },
  qrModalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  qrModalContent: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32,
    alignItems: "center", width: "85%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  qrModalClose: {
    position: "absolute", top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  qrModalTitle: {
    fontSize: 16, fontWeight: "600", color: "#1f2937",
    marginBottom: 20, textAlign: "center",
  },
  qrModalCode: {
    fontSize: 20, fontWeight: "700", color: COLORS.primary,
    marginTop: 16, letterSpacing: 4,
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
  trustBadge: {
    backgroundColor: "#f0fdf4", padding: 14, borderRadius: RADIUS.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: "#bbf7d0",
  },
  trustBadgeHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6,
  },
  trustBadgeTitle: {
    fontSize: 13, fontWeight: "700", color: "#16a34a",
  },
  trustBadgeText: {
    fontSize: 12, color: "#166534", lineHeight: 18,
  },
  photoHelpRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: SPACING.md, marginTop: 4,
  },
  photoHelpText: { fontSize: 12, color: "#6b7280", flex: 1, lineHeight: 17 },
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
  choosingCard: { paddingVertical: SPACING.sm },
  choosingTitle: { fontSize: 18, fontWeight: "700", color: "#16a34a", marginBottom: 4 },
  choosingSubtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: SPACING.md },
  proposalCard: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  proposalRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  proposalAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  proposalAvatarImg: {
    width: 48, height: 48, borderRadius: 24,
  },
  proposalInfo: { flex: 1 },
  proposalName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  proposalStars: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3 },
  proposalRatingText: { fontSize: 12, color: "#6b7280", marginLeft: 4 },
  proposalComment: {
    fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 4, lineHeight: 16,
  },
  proposalSelectBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  proposalSelectText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  choosingWait: { fontSize: 12, color: COLORS.textLight, textAlign: "center", marginTop: 8 },
  matchedHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md,
  },
  matchedTitle: { fontSize: 17, fontWeight: "700", color: "#16a34a" },
  etaBoxRow: {
    flexDirection: "row", justifyContent: "center", marginBottom: SPACING.sm,
  },
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
  addressContainer: {
    backgroundColor: "#FEF3C7", borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: "#FDE68A",
  },
  addressHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8,
  },
  addressLabel: { fontSize: 13, fontWeight: "600", color: "#92400e" },
  addressInput: {
    backgroundColor: "#FFFFFF", borderRadius: RADIUS.sm, padding: 12,
    fontSize: 14, color: "#1f2937", borderWidth: 1, borderColor: "#e5e7eb",
  },
  freeCancelBtn: {
    marginTop: SPACING.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  freeCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  cancelExpired: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  qrCard: {
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    padding: SPACING.lg, borderRadius: RADIUS.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  qrLabel: {
    fontSize: 14, fontWeight: "600", color: "#4b5563", marginTop: SPACING.sm,
    textAlign: "center",
  },
  reportLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: SPACING.sm, paddingVertical: 10,
  },
  reportLinkText: { fontSize: 13, color: "#6b7280", textDecorationLine: "underline" },
});
