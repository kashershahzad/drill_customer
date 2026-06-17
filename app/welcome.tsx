import Button from "@/components/button";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function Welcome() {
  const { t, ready } = useTranslation();

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <Image
          source={require("../assets/images/onboarding.png")}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t("welcome")}</Text>
          <Text style={styles.subtitle}>{t("tagline")}</Text>
          <Text style={styles.description}>{t("intro")}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title={t("welcomeScreen.browse")}
          onPress={() => router.replace("/(tabs)")}
        />
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/auth/login")}
          accessibilityRole="button"
          accessibilityLabel={t("login.title")}
        >
          <Text style={styles.loginButtonText}>{t("welcomeScreen.login")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/auth/privacy")}
          style={styles.privacyLinkWrap}
          accessibilityRole="link"
          accessibilityLabel={t("privacy.title")}
        >
          <Text style={styles.privacyLink}>{t("privacy.title")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(16),
    paddingBottom: vs(16),
    justifyContent: "space-between",
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: ms(18),
    color: Colors.secondary,
    fontFamily: FONTS.medium,
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    marginBottom: vs(8),
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: s(12),
  },
  title: {
    fontSize: ms(32),
    marginBottom: vs(6),
    color: Colors.secondary,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: ms(20),
    fontFamily: FONTS.bold,
    marginBottom: vs(10),
    color: Colors.secondary,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    fontSize: ms(16),
    color: Colors.secondary100,
    paddingHorizontal: s(20),
    fontFamily: FONTS.medium,
  },
  footer: {
    alignItems: "center",
    paddingTop: vs(16),
  },
  privacyLinkWrap: {
    marginTop: vs(12),
    paddingVertical: vs(8),
    paddingHorizontal: s(16),
  },
  privacyLink: {
    fontSize: ms(13),
    fontFamily: FONTS.medium,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  loginButton: {
    marginTop: vs(10),
    paddingVertical: vs(12),
    paddingHorizontal: s(24),
  },
  loginButtonText: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.primary,
  },
});
