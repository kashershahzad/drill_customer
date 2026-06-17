import Button from "@/components/button";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "~/components/header";
import { Colors } from "~/constants/Colors";
import { inputFieldStyles } from "~/components/inputfield";
import { useToast } from "~/components/ToastProvider";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function AddCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [saveInfo, setSaveInfo] = useState(false);

  const handleSave = () => {
    showToast(t("cardSavedSuccess") || t("success"), "success");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Header backBtn={true} title={t("addCard")} />
        <Image
          source={require("@/assets/images/card.png")}
          style={styles.cardImage}
          resizeMode="contain"
        />

        <Text style={styles.label}>{t("booking.cardHolderName")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("booking.cardHolderName")}
          placeholderTextColor={Colors.secondary300}
        />

        <Text style={styles.label}>{t("booking.cardNumber")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("booking.cardNumber")}
          placeholderTextColor={Colors.secondary300}
          keyboardType="numeric"
        />

        <View style={styles.rowBetween}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t("booking.expired")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("booking.cardExpiryPlaceholder")}
              placeholderTextColor={Colors.secondary300}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t("booking.cvv")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("booking.code")}
              placeholderTextColor={Colors.secondary300}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.label}>{t("booking.saveCardDetails")}</Text>
          <Switch value={saveInfo} onValueChange={setSaveInfo} />
        </View>

        {saveInfo && (
          <>
            <Text style={styles.label}>{t("booking.phoneNumber")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("booking.phonePlaceholderExample")}
              placeholderTextColor={Colors.secondary300}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t("booking.emailAddress")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("booking.emailPlaceholderExample")}
              placeholderTextColor={Colors.secondary300}
              keyboardType="email-address"
            />
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button title={t("save")} onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContainer: { paddingHorizontal: s(16), paddingTop: vs(8) },
  headerContainer: { flexDirection: "row", alignItems: "center", marginBottom: vs(20) },
  backButton: { backgroundColor: "#E5E7EB", padding: s(8), borderRadius: 50 },
  headerTitle: { fontSize: ms(22), fontFamily: FONTS.semiBold, marginLeft: s(14), color: "#374151" },
  cardImage: { width: "100%", marginBottom: vs(20) },
  label: { fontSize: ms(17), fontFamily: FONTS.bold, marginBottom: vs(7) },
  input: { ...inputFieldStyles.field, marginBottom: vs(14) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: vs(14) },
  inputContainer: { width: "48%" },
  toggleContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: vs(14) },
  footer: { paddingHorizontal: s(20), paddingVertical: vs(18) },
});
