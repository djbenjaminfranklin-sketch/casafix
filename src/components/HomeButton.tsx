import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { COLORS } from "../constants/theme";

export default function HomeButton() {
  const navigation = useNavigation<any>();

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Tabs" }],
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={goHome}>
      <Icon name="home-outline" size={22} color={COLORS.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
