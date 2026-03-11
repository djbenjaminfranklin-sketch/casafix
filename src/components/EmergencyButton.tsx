import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

type Props = {
  onPress: () => void;
};

export default function EmergencyButton({ onPress }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.outerRing}>
          <View style={styles.innerCircle}>
            <Icon name="flash" size={32} color="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>
      <Text style={styles.label}>{t("emergency")}</Text>
      <Text style={styles.subtitle}>{t("emergencySubtitle")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  outerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#dc2626",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 2,
  },
});
