import Banner from "@/components/banner";
import Header from "@/components/header";
import Search from "@/components/search";
import Categories from "@/sections/categories";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PopularServices from "~/components/popular_services";
import { useAuth } from "~/contexts/AuthContext";
import { Colors } from "~/constants/Colors";
import { s, vs } from "~/utils/responsive";

export default function Home() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const getUserName = async () => {
        if (!isLoggedIn) return;
        try {
          const storedUserName = await AsyncStorage.getItem("user_name");
          setUserName(storedUserName);
        } catch (error) {
          console.error("Failed to fetch AsyncStorage data:", error);
        }
      };
      getUserName();
      const onBackPress = () => {
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [isLoggedIn])
  );

  const headerTitle = isLoggedIn && userName ? userName : t("defaultGreeting");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Header userName={headerTitle} homeScreen icon />
        <Banner />
        <Search />
        <Categories />
        <PopularServices />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
    paddingTop: vs(8),
  },
  contentContainer: {
    paddingHorizontal: s(14),
    paddingBottom: vs(120),
  },
});
