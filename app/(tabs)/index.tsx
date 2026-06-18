import Banner from "@/components/banner";
import Header from "@/components/header";
import Search from "@/components/search";
import Categories from "@/sections/categories";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import PopularServices from "~/components/popular_services";
import { useAuth } from "~/contexts/AuthContext";
import { Colors } from "~/constants/Colors";
import { getTabBarContentPadding } from "~/utils/tabBar";
import { s, vs } from "~/utils/responsive";

export default function Home() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarPadding = getTabBarContentPadding(insets.bottom);
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
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: tabBarPadding },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header userName={headerTitle} homeScreen icon />
        <Banner />
        <Search value={searchQuery} onChangeText={setSearchQuery} />
        <Categories searchQuery={searchQuery} />
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
    flexGrow: 1,
  },
});
