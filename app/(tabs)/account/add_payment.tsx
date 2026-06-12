import Header from "@/components/header";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "~/components/button";
import { getInputFontSize, inputFieldStyles, INPUT_ICON_SIZE } from "~/components/inputfield";
import { useToast } from "~/components/ToastProvider";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

const { width } = Dimensions.get("window");

const cardData = [
  {
    id: 1,
    name: "TIM SMITH",
    number: "•••• •••• •••• 5318",
    balance: "$15,236.00",
  },
  {
    id: 2,
    name: "JANE DOE",
    number: "•••• •••• •••• 1245",
    balance: "$10,456.00",
  },
];

export default function AddPayment() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [scrollX] = useState(new Animated.Value(0));
  const [amount, setAmount] = useState(1500);

  const handleIncrease = () => setAmount((prev) => prev + 100);
  const handleDecrease = () =>
    setAmount((prev) => (prev > 100 ? prev - 100 : prev));

  const handleConfirm = () => {
    showToast(t("addPayment.fundAddedSuccess") || t("success"), "success");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Header title={t("addPayment.title")} backBtn={true} />

        <Text style={styles.infoText}>
          {t("addPayment.cardAddedSuccess")}
        </Text>

        {/* Credit Card Slider */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          style={styles.cardSlider}
        >
          {cardData.map((card) => (
            <ImageBackground
              key={card.id}
              source={require("@/assets/images/Cards.png")}
              style={[styles.card, { width: width * 0.9 }]}
              resizeMode="contain"
            >
              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardNumber}>{card.number}</Text>
              <Text style={styles.cardBalance}>{t("addPayment.balance")}: {card.balance}</Text>
            </ImageBackground>
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {cardData.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [width * i, width * (i + 1)],
              outputRange: [10, 20],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth }]}
              />
            );
          })}
        </View>

        {/* Add Money Section */}
        <Text style={styles.sectionTitle}>{t("addPayment.addMoney")}</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="wallet" size={INPUT_ICON_SIZE} color="gray" />
          <TextInput
            style={[styles.input, { fontSize: getInputFontSize(amount ? String(amount) : "") }]}
            keyboardType="numeric"
            placeholderTextColor={Colors.secondary300}
            value={amount.toString()}
            onChangeText={(text) => setAmount(Number(text) || 0)}
          />
          <View>
            <TouchableOpacity onPress={handleIncrease}>
              <Ionicons name="chevron-up" size={12} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDecrease}>
              <Ionicons name="chevron-down" size={12} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Button */}
        <Button title={t("addPayment.confirm")} onPress={handleConfirm} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContainer: { paddingHorizontal: s(20), paddingTop: vs(8), paddingBottom: vs(40) },
  infoText: { color: Colors.secondary300, textAlign: "center", marginVertical: vs(14), fontSize: ms(14) },
  cardSlider: { marginTop: vs(14) },
  card: { height: vs(180), justifyContent: "space-around", paddingHorizontal: s(16), paddingVertical: vs(16), marginRight: s(8) },
  cardName: { color: "white", fontSize: ms(17), fontFamily: FONTS.semiBold },
  cardNumber: { color: "white", fontSize: ms(15) },
  cardBalance: { color: "white", fontSize: ms(18), fontFamily: FONTS.semiBold },
  dotsContainer: { flexDirection: "row", justifyContent: "center", marginTop: vs(8) },
  dot: { height: vs(8), backgroundColor: "blue", borderRadius: ms(4), marginHorizontal: s(4) },
  sectionTitle: { fontSize: ms(17), fontFamily: FONTS.semiBold, marginTop: vs(20) },
  inputContainer: { ...inputFieldStyles.fieldContainer, marginVertical: vs(7) },
  input: { ...inputFieldStyles.fieldInput },
  confirmButton: { backgroundColor: "blue", padding: s(14), borderRadius: ms(8), alignItems: "center", marginTop: vs(20) },
  confirmText: { color: "white", fontSize: ms(17), fontFamily: FONTS.semiBold },
});
