import Button from "@/components/button";
import Header from "@/components/header";
import Seprator from "@/components/seprator";
import TransactionCard from "@/components/transaction_card";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

const { width } = Dimensions.get("window");

const Wallet = () => {
  const { t } = useTranslation();
  const [showTransactions, setShowTransactions] = useState(true);

  const transactionsData = [
    {
      id: 1,
      type: t("wallet.buying"),
      amount: 100,
      card: "***7999",
      positive: false,
      time: "May 10, 10:40 PM",
    },
    {
      id: 2,
      type: t("wallet.fundAdded"),
      amount: 500,
      positive: true,
      card: "***7999",
      time: "May 11, 02:30 PM",
    },
    {
      id: 3,
      type: t("wallet.fundAdded"),
      amount: 500,
      positive: true,
      card: "***7999",
      time: "May 11, 02:30 PM",
    },
    {
      id: 4,
      type: t("wallet.fundAdded"),
      amount: 500,
      positive: true,
      card: "***7999",
      time: "May 11, 02:30 PM",
    },
  ];

  const chartData = [
    { value: 20, label: "01 Jan" },
    { value: 5, label: "10 Jan" },
    { value: 59, label: "20 Jan" },
    { value: 10, label: "30 Jan" },
  ];

  const handleAdd = () => {
    router.push("/account/add_payment");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Header title={t("wallet.title")} backBtn={true} />

        {/* <View style={styles.chartSection}>
          <View style={styles.rowCenter}>
            <Ionicons name="calendar-outline" size={20} color="gray" />
            <Text style={styles.textSecondary}>{t("wallet.thisMonth")}</Text>
          </View>
          <View>
            <Text style={styles.totalExpense}>{t("wallet.sar")} 1500</Text>
            <Text style={styles.textGray}>{t("wallet.totalExpense")}</Text>
          </View>
        </View>

        <LineChart
          data={chartData}
          thickness={2}
          color="#4A90E2"
          hideYAxisText
          curved
          showVerticalLines
          verticalLinesColor="lightgray"
          xAxisLabelTexts={chartData.map((item) => item.label)}
          xAxisLabelTextStyle={{ color: "gray" }}
          maxValue={60}
          isAnimated
          spacing={(width - 40) / chartData.length}
        />

        <Seprator /> */}

        <View style={styles.balanceSection}>
          <View>
            <Text style={styles.textSecondary}>{t("wallet.availableBalance")}</Text>
            <Text style={styles.availableBalance}>{t("wallet.sar")} 13,455.23</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Button title={t("wallet.add")} onPress={handleAdd} variant="secondary" />
          </View>
        </View>

        <Seprator />

        <TouchableOpacity
          style={styles.transactionHeader}
          onPress={() => setShowTransactions(!showTransactions)}
        >
          <Text style={styles.transactionTitle}>{t("wallet.transactionsHistory")}</Text>
          <Ionicons
            name={showTransactions ? "chevron-up" : "chevron-down"}
            size={20}
            color="gray"
          />
        </TouchableOpacity>

        {showTransactions &&
          transactionsData.map((item) => (
            <TransactionCard
              key={item.id}
              type={item.type}
              amount={item.amount}
              positive={item.positive}
              card={item.card}
              time={item.time}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContainer: { paddingHorizontal: s(16), paddingTop: vs(8), paddingBottom: vs(80) },
  chartSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: vs(14) },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: s(7) },
  textSecondary: { color: "#6B7280", fontSize: ms(17), fontFamily: FONTS.semiBold },
  totalExpense: { color: "#6B7280", fontSize: ms(19), fontFamily: FONTS.medium },
  textGray: { color: "#9CA3AF", fontSize: ms(13), fontFamily: FONTS.semiBold },
  balanceSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  availableBalance: { color: "#6B7280", fontSize: ms(22), fontFamily: FONTS.semiBold },
  transactionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: vs(14) },
  transactionTitle: { fontFamily: FONTS.bold, fontSize: ms(17), color: "#6B7280" },
});

export default Wallet;
