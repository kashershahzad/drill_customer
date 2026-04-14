import Flag from "@/assets/svgs/saudiarabia.svg";
import Button from "@/components/button";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalSelector from "react-native-modal-selector";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "~/contexts/AuthContext";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
import { apiCall } from "~/utils/api";

type CountryCode = { key: number; label: string; value: string };

const countryCodes: CountryCode[] = [
  { key: 1, label: "Kingdom Saudi Arabia (+966)", value: "+966" },
];

const PENDING_BOOKING_KEY = "pending_booking";

export default function Login() {
  const [countryCode, setCountryCode] = useState<CountryCode>(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [error, setError] = useState<string>("");
  const modalRef = useRef<any>(null);
  const { t } = useTranslation();
  const { setUser } = useAuth();

  const handleContinue = async () => {
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    if (cleanedNumber.length < 9 || cleanedNumber.length > 10) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    try {
      const pendingBooking = await AsyncStorage.getItem(PENDING_BOOKING_KEY);
      await AsyncStorage.clear();
      if (pendingBooking) await AsyncStorage.setItem(PENDING_BOOKING_KEY, pendingBooking);

      const formData = new FormData();
      formData.append("type", "register_phone");
      formData.append("phone", `${countryCode.value}${cleanedNumber}`);
      formData.append("user_type", "user");
      const response = await apiCall(formData);
      if (response.result) {
        await AsyncStorage.setItem("user_id", response.user_id);
        await AsyncStorage.setItem("user_type", response.user_type);
        await setUser(response.user_id);
        router.push("/auth/verify");
      } else {
        setError(response.message || "Login failed.");
      }
    } catch (e) {
      setError(t("login.invalidPhone"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t("welcome")}</Text>
      <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

      <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
        <TouchableOpacity
          onPress={() => modalRef.current.open()}
          style={styles.countrySelector}
        >
          <Flag width={s(25)} height={s(25)} />
          <Text style={styles.countryText}>{countryCode.label}</Text>
          <Ionicons name="chevron-down" size={s(20)} />
        </TouchableOpacity>

        <ModalSelector
          ref={modalRef}
          data={countryCodes}
          onChange={(option: CountryCode) => setCountryCode(option)}
          style={{ borderWidth: 0, backgroundColor: "transparent" }}
          selectStyle={{ display: "none" }}
        />

        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholderTextColor={Colors.secondary300}
          placeholder={t("login.phonePlaceholder")}
          value={phoneNumber}
          maxLength={10}
          onChangeText={(text) => {
            setPhoneNumber(text.replace(/\D/g, ""));
            if (error) setError("");
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.consentText}>
        {t("login.consentPrefix")}{" "}
        <Text style={styles.privacyLink} onPress={() => router.push("/auth/privacy")}>
          {t("login.privacy")}
        </Text>
        {t("login.consentSuffix")}
      </Text>

      <Button title={t("continue")} onPress={handleContinue} />

      <TouchableOpacity
        style={styles.guestButton}
        onPress={() => router.replace("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel={t("login.continueAsGuest")}
      >
        <Text style={styles.guestButtonText}>{t("login.continueAsGuest")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: vs(60),
    paddingHorizontal: s(16),
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: ms(32),
    fontFamily: FONTS.bold,
    marginBottom: vs(6),
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: ms(22),
    color: Colors.secondary100,
    marginBottom: vs(28),
    fontFamily: FONTS.regular,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: ms(12),
    marginBottom: vs(20),
    overflow: "hidden",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
  },
  countryText: {
    flex: 1,
    marginLeft: s(10),
    fontSize: ms(15),
    color: Colors.secondary,
    fontFamily: FONTS.regular,
  },
  divider: {
    borderTopWidth: 1,
    borderColor: Colors.gray,
  },
  input: {
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    fontSize: ms(17),
  },
  consentText: {
    textAlign: "center",
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    color: Colors.secondary100,
    marginBottom: vs(20),
    paddingHorizontal: s(8),
  },
  privacyLink: {
    fontFamily: FONTS.semiBold,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  inputContainerError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: ms(13),
    marginTop: vs(-14),
    marginBottom: vs(12),
    paddingLeft: s(12),
    fontFamily: FONTS.regular,
  },
  guestButton: {
    marginTop: vs(16),
    paddingVertical: vs(12),
    paddingHorizontal: s(24),
    alignSelf: "center",
  },
  guestButtonText: {
    fontSize: ms(15),
    fontFamily: FONTS.medium,
    color: Colors.secondary100,
    textDecorationLine: "underline",
  },
});
