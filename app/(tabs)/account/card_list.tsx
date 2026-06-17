import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "~/components/header";

export default function Cards() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t("account.cardListTitle")} backBtn />
      <View style={styles.content}>
        <Text style={styles.placeholder}>{t("account.cardListTitle")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholder: { fontSize: 16 },
});
