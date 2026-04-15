import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Geolocation from "@react-native-community/geolocation";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import {
  getSavedAddresses,
  saveAddress,
  deleteAddress,
  updateAddress,
  SavedAddress,
} from "../services/addresses";

type Props = {
  navigation: any;
};

export default function AddressBookScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  const fetchAddresses = async () => {
    setLoading(true);
    const { data } = await getSavedAddresses();
    setAddresses(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const parseAddressParts = (raw: string) => {
    const match = raw.match(/^(.+),\s*(\d{4,5})\s+(.+)$/);
    if (match) return { street: match[1], postalCode: match[2], city: match[3] };
    return { street: raw, postalCode: "", city: "" };
  };

  const resetForm = () => {
    setLabel("");
    setAddress("");
    setPostalCode("");
    setCity("");
    setLatitude(null);
    setLongitude(null);
    setIsDefault(false);
    setEditingAddress(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setLabel(addr.label);
    const parts = parseAddressParts(addr.address);
    setAddress(parts.street);
    setPostalCode(parts.postalCode);
    setCity(parts.city);
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setIsDefault(addr.is_default);
    setShowModal(true);
  };

  const handleUseCurrentLocation = () => {
    setGeolocating(true);
    Geolocation.requestAuthorization(
      () => {
        Geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setLatitude(lat);
            setLongitude(lng);

            // Reverse geocode
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
              );
              const data = await response.json();
              if (data.address) {
                const a = data.address;
                const street = [a.house_number, a.road].filter(Boolean).join(" ") || data.display_name || "";
                setAddress(street);
                setPostalCode(a.postcode || "");
                setCity(a.city || a.town || a.village || a.municipality || "");
              } else if (data.display_name) {
                const parts = parseAddressParts(data.display_name);
                setAddress(parts.street);
                setPostalCode(parts.postalCode);
                setCity(parts.city);
              }
            } catch (e) {

            }
            setGeolocating(false);
          },
          (err) => {

            Alert.alert(t("booking.locationError"), t("booking.locationErrorDesc"));
            setGeolocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      },
      () => {
        Alert.alert(t("booking.locationError"), t("booking.locationDenied"));
        setGeolocating(false);
      }
    );
  };

  const handleSave = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert(t("common.error"), t("auth.fillAllFields"));
      return;
    }

    setSaving(true);
    const lat = latitude || 0;
    const lng = longitude || 0;
    const combinedAddress = address.trim()
      ? `${address.trim()}, ${postalCode.trim()} ${city.trim()}`.trim()
      : "";

    if (editingAddress) {
      const { error } = await updateAddress(editingAddress.id, {
        label: label.trim(),
        address: combinedAddress,
        latitude: lat,
        longitude: lng,
        is_default: isDefault,
      });
      if (error) {
        Alert.alert(t("common.error"), t("account.saveError"));
      }
    } else {
      const { error } = await saveAddress(label.trim(), combinedAddress, lat, lng, isDefault);
      if (error) {
        Alert.alert(t("common.error"), t("account.saveError"));
      }
    }

    setSaving(false);
    setShowModal(false);
    resetForm();
    fetchAddresses();
  };

  const handleDelete = (addr: SavedAddress) => {
    Alert.alert(t("addresses.delete"), addr.label, [
      { text: t("admin.no"), style: "cancel" },
      {
        text: t("admin.yes"),
        style: "destructive",
        onPress: async () => {
          await deleteAddress(addr.id);
          fetchAddresses();
        },
      },
    ]);
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    await updateAddress(addr.id, { is_default: true });
    fetchAddresses();
  };

  const getLabelIcon = (lbl: string): string => {
    const lower = lbl.toLowerCase();
    if (lower.includes("maison") || lower.includes("casa") || lower.includes("home")) return "home-outline";
    if (lower.includes("bureau") || lower.includes("oficina") || lower.includes("work") || lower.includes("travail")) return "briefcase-outline";
    if (lower.includes("vacances") || lower.includes("vacation") || lower.includes("vacaciones")) return "sunny-outline";
    return "location-outline";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("addresses.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="location-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>{t("addresses.empty")}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addressCard}>
              <View style={styles.addressLeft}>
                <View style={[styles.iconCircle, addr.is_default && styles.iconCircleDefault]}>
                  <Icon
                    name={getLabelIcon(addr.label)}
                    size={20}
                    color={addr.is_default ? COLORS.white : COLORS.primary}
                  />
                </View>
                <View style={styles.addressInfo}>
                  <View style={styles.labelRow}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    {addr.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t("addresses.default")}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {addr.address}
                  </Text>
                </View>
              </View>

              <View style={styles.addressActions}>
                {!addr.is_default && (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(addr)}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="star-outline" size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleOpenEdit(addr)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Icon name="create-outline" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(addr)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Icon name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.85}>
          <Icon name="add" size={22} color={COLORS.white} />
          <Text style={styles.addBtnText}>{t("addresses.add")}</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? t("addresses.title") : t("addresses.add")}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Label */}
              <Text style={styles.fieldLabel}>{t("addresses.label")}</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder={`${t("addresses.home")}, ${t("addresses.work")}...`}
                placeholderTextColor={COLORS.textLight}
              />

              {/* Quick labels */}
              <View style={styles.quickLabels}>
                {[
                  { key: "home", icon: "home-outline" },
                  { key: "work", icon: "briefcase-outline" },
                  { key: "other", icon: "location-outline" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.quickLabel,
                      label === t(`addresses.${item.key}`) && styles.quickLabelActive,
                    ]}
                    onPress={() => setLabel(t(`addresses.${item.key}`))}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={item.icon}
                      size={16}
                      color={label === t(`addresses.${item.key}`) ? COLORS.white : COLORS.text}
                    />
                    <Text
                      style={[
                        styles.quickLabelText,
                        label === t(`addresses.${item.key}`) && styles.quickLabelTextActive,
                      ]}
                    >
                      {t(`addresses.${item.key}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address */}
              <Text style={styles.fieldLabel}>{t("address.street")}</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder={t("address.street")}
                placeholderTextColor={COLORS.textLight}
              />

              <View style={styles.addressRow}>
                <View style={{ width: "35%" }}>
                  <Text style={styles.fieldLabel}>{t("address.postalCode")}</Text>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder={t("address.postalCode")}
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fieldLabel}>{t("address.city")}</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder={t("address.city")}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              {/* Use current location */}
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={handleUseCurrentLocation}
                activeOpacity={0.7}
                disabled={geolocating}
              >
                {geolocating ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Icon name="navigate" size={18} color={COLORS.primary} />
                )}
                <Text style={styles.locationBtnText}>{t("addresses.useCurrentLocation")}</Text>
              </TouchableOpacity>

              {/* Default toggle */}
              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setIsDefault(!isDefault)}
                activeOpacity={0.7}
              >
                <Icon
                  name={isDefault ? "checkbox" : "square-outline"}
                  size={22}
                  color={isDefault ? COLORS.primary : COLORS.textLight}
                />
                <Text style={styles.defaultToggleText}>{t("addresses.setDefault")}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="checkmark" size={20} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>{t("account.save")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
    gap: 10,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  addressLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleDefault: {
    backgroundColor: COLORS.primary,
  },
  addressInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  quickLabels: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
  },
  quickLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: "#f5f5f5",
  },
  quickLabelActive: {
    backgroundColor: COLORS.primary,
  },
  quickLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  quickLabelTextActive: {
    color: COLORS.white,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  defaultToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: SPACING.lg,
    paddingVertical: 8,
  },
  defaultToggleText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    gap: 10,
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
});
