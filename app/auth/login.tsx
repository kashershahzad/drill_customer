import Flag from "@/assets/svgs/saudiarabia.svg";
import Button from "@/components/button";
import {
  getInputFontSize,
  INPUT_FIELD_BACKGROUND,
  INPUT_FIELD_PADDING,
  INPUT_ICON_SIZE,
} from "@/components/inputfield";
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
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { useAuth } from "~/contexts/AuthContext";
import { apiCall } from "~/utils/api";
import { registerDeviceWithBackend } from "~/utils/notification";
import { ms, s, vs } from "~/utils/responsive";

type CountryCode = { key: number; label: string; value: string };

const countryCodes: CountryCode[] = [
  { key: 1, label: "", value: "+966" },
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
      setError(t("login.invalidPhone"));
      return;
    }
    setError("");
    try {
      const pendingBooking = await AsyncStorage.getItem(PENDING_BOOKING_KEY);
      await AsyncStorage.clear();
      if (pendingBooking)
        await AsyncStorage.setItem(PENDING_BOOKING_KEY, pendingBooking);

      const formData = new FormData();
      formData.append("type", "register_phone");
      formData.append("phone", `${countryCode.value}${cleanedNumber}`);
      formData.append("user_type", "user");
      const response = await apiCall(formData);
      console.log("response", response);
      if (response.result) {
        await AsyncStorage.setItem("user_id", response.user_id);
        await AsyncStorage.setItem("user_type", response.user_type);
        await setUser(response.user_id);
        console.log(
          "📲 Login: sending update_noti for user_id:",
          response.user_id,
        );
        await registerDeviceWithBackend(response.user_id);
        console.log("📲 Login: update_noti request completed");
        router.push("/auth/verify");
      } else {
        setError(response.message || t("login.loginFailed"));
      }
    } catch (e) {
      setError(t("verify.errorFallback"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t("welcome")}</Text>
      <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

      <View
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : null,
        ]}
      >
        <TouchableOpacity
          onPress={() => modalRef.current.open()}
          style={styles.countrySelector}
        >
          <Flag width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
          <Text style={styles.countryText}>
            {countryCode.label || t("login.countrySaudi")}
          </Text>
          <Ionicons name="chevron-down" size={INPUT_ICON_SIZE} />
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
          style={[styles.input, { fontSize: getInputFontSize(phoneNumber) }]}
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
        <Text
          style={styles.privacyLink}
          onPress={() => router.push("/auth/privacy")}
        >
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
    width: "100%",
    backgroundColor: INPUT_FIELD_BACKGROUND,
    borderRadius: ms(12),
    marginBottom: vs(20),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: INPUT_FIELD_PADDING,
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
    width: "100%",
    minHeight: vs(48),
    padding: INPUT_FIELD_PADDING,
    fontSize: ms(17),
    fontFamily: FONTS.regular,
    color: Colors.secondary,
    textAlignVertical: "center",
  },
  consentText: {
    textAlign: "center",
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    color: Colors.secondary100,
    paddingHorizontal: s(8),
    height: 59,
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
