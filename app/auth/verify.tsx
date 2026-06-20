import Arrow from "@/assets/svgs/arrowLeft.svg";
import Button from "@/components/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
import { apiCall } from "~/utils/api";
import { registerDeviceWithBackend } from "~/utils/notification";

const RESEND_COOLDOWN_SEC = 60;

export default function Verify() {
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const isVerifyingRef = useRef(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      setError(t("verify.userNotFound"));
      return;
    }
    try {
      const formData = new FormData();
      formData.append("type", "resend_otp");
      formData.append("user_id", userId);
      await apiCall(formData);
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setError("");
    } catch {
      setError(t("verify.errorFallback"));
    }
  }, [resendCooldown, t]);

  const handleChangeText = (text: string) => {
    setCode(text);
    if (error) setError("");
  };

  const handleVerify = useCallback(
    async (otpCode?: string) => {
      if (isVerifyingRef.current) return;

      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        setError(t("verify.userNotFound"));
        return;
      }

      const verificationCode = otpCode ?? code;

      if (verificationCode.length !== 4) {
        setError(t("verify.invalidCode"));
        return;
      }

      isVerifyingRef.current = true;
      setIsVerifying(true);

      try {
        const formData = new FormData();
        formData.append("type", "verify_otp");
        formData.append("code", verificationCode);
        formData.append("user_id", userId);
        const response = await apiCall(formData);

        if (response.result) {
          await AsyncStorage.setItem("user_num_id", response?.user?.id);
          await AsyncStorage.setItem("user_name", response?.user?.name);
          registerDeviceWithBackend(userId);
          setTimeout(() => router.push("/auth/verified"), 500);
        } else {
          setError(t("verify.verificationFailed"));
        }
      } catch (error) {
        console.error("Verification Error:", error);
        setError(t("verify.errorFallback"));
      } finally {
        isVerifyingRef.current = false;
        setIsVerifying(false);
      }
    },
    [code, t],
  );

  const handleOtpFilled = useCallback(
    (text: string) => {
      setCode(text);
      void handleVerify(text);
    },
    [handleVerify],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/auth/login")}>
          <Arrow />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("verify.headerTitle")} </Text>
        <Text></Text>
      </View>

      <Text style={styles.title}>{t("verify.title")}</Text>
      <Text style={styles.subtitle}>{t("verify.subtitle")}</Text>

      <View
        style={[styles.otpContainer, error ? styles.otpContainerError : null]}
      >
        <OtpInput
          numberOfDigits={4}
          onTextChange={handleChangeText}
          onFilled={handleOtpFilled}
          focusColor={Colors.primary}
          disabled={isVerifying}
          theme={{
            containerStyle: styles.otpInputs,
            pinCodeContainerStyle: error
              ? { ...styles.otpInput, ...styles.otpInputError }
              : styles.otpInput,
            pinCodeTextStyle: styles.otpInputText,
            focusedPinCodeContainerStyle: styles.otpInputFocused,
          }}
          autoFocus
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCooldown > 0}
          style={resendCooldown > 0 ? styles.resendDisabled : undefined}
        >
          <Text style={styles.resendText}>
            {t("verify.resendPrefix")}{" "}
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
              {resendCooldown > 0 ? t("verify.resendIn", { count: resendCooldown }) : t("verify.resendLink")}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Verify Button */}
      <Button
        title={isVerifying ? `${t("verify.button")}...` : t("verify.button")}
        onPress={() => handleVerify()}
        disabled={isVerifying}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(20),
    paddingVertical: vs(20),
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(32),
  },
  headerTitle: {
    fontSize: ms(18),
    fontFamily: FONTS.bold,
    textAlign: "center",
    color: Colors.secondary,
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
    marginBottom: vs(20),
    fontFamily: FONTS.medium,
  },
  otpContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray100,
    paddingVertical: vs(24),
    borderRadius: ms(16),
    marginBottom: vs(20),
  },
  otpContainerError: {
    borderWidth: 1,
    borderColor: "red",
  },
  otpInputs: {
    flexDirection: "row",
    gap: s(12),
    marginBottom: vs(16),
    justifyContent: "center",
  },
  otpInput: {
    width: s(46),
    height: s(46),
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  otpInputFocused: {
    borderColor: Colors.primary,
  },
  otpInputText: {
    fontSize: ms(20),
    fontFamily: FONTS.regular,
    color: Colors.secondary,
  },
  otpInputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: ms(13),
    marginBottom: vs(14),
    paddingHorizontal: s(12),
    textAlign: "center",
    fontFamily: FONTS.medium,
  },
  resendText: {
    fontSize: ms(15),
    color: Colors.secondary100,
    fontFamily: FONTS.medium,
  },
  resendLink: {
    color: Colors.primary,
    fontFamily: FONTS.medium,
  },
  resendLinkDisabled: {
    color: Colors.gray300,
  },
  resendDisabled: {
    opacity: 0.7,
  },
});
