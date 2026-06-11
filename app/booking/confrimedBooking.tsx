import Tick from "@/assets/svgs/doubletick.svg";
import Button from "@/components/button";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function ConfirmedBooking() {
  const { t } = useTranslation();

  const handleNext = () => {
    router.push("/order/order_place");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section */}
      <View style={styles.imageContainer}>
        <Tick style={{ marginBottom: vs(30) }}/>
        <View style={styles.textContainer}>
          <Text style={styles.heading}>{t("booking.heading")}</Text>
          <Text style={styles.paragraph}>{t("booking.paragraph")}</Text>
        </View>
      </View>

      {/* Note and Button */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          <Text style={styles.boldText}>{t("booking.note")}</Text>
        </Text>
        <Button title={t("booking.button")} onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: s(16), paddingVertical: vs(16), backgroundColor: Colors.white },
  imageContainer: { alignItems: "center", paddingTop: vs(100) },
  textContainer: { alignItems: "center", paddingHorizontal: s(40) },
  heading: { fontSize: ms(28), fontFamily: FONTS.bold, marginBottom: vs(8), color: Colors.secondary, textAlign: "center" },
  paragraph: { fontSize: ms(15), fontFamily: FONTS.regular, textAlign: "center", color: Colors.secondary300, marginBottom: vs(24) },
  noteContainer: { backgroundColor: Colors.primary200, padding: s(18), borderRadius: ms(20), gap: vs(14) },
  noteText: { color: Colors.secondary, fontSize: ms(14) },
  boldText: { fontFamily: FONTS.bold, textAlign: "center" },
});
