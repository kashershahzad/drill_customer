import Button from "@/components/button";
import Header from "@/components/header";
import ServiceDetailsCard from "@/components/service_details_card";
import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "~/constants/Fonts";
import { useAuth } from "~/contexts/AuthContext";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

// Order type definition
export type Order = {
  id: string;
  order_no: string;
  created_at: string;
  status: string;
  payment_method: string;
  address: string;
  description: string;
  image_url?: string;
  images?: string;
  cat_id: string;
  to_id?: string;
  provider?: any;
  title?: string;
  amount?: string;
  discount?: string;
  rating?: string;
  tip?: string;
  service_type?: string;
  schedule_date?: string;
  schedule_time?: string;
  category?: {
    name: string;
    image: string;
  };
};

export default function Orders() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dropdown state
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [items, setItems] = useState([
    { label: t("status_all"), value: "All" },
    { label: t("status_pending"), value: "pending" },
    { label: t("status_completed"), value: "completed" },
  ]);

  useEffect(() => {
    if (isLoggedIn) fetchOrders();
  }, [isLoggedIn]);

  const fetchOrders = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "orders");
    formData.append("user_id", userId);

    try {
      const response = await apiCall(formData);
      if (response && response.data && response.data.length > 0) {
        const orders = response.data;
        setOrders(orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
      Alert.alert(t("error"), t("add.somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderScreen = (order: Order) => {
    if (order.status?.toLowerCase() === "cancelled") {
      return; // or showToast("This order was cancelled")
    }
  
    AsyncStorage.setItem("order_id", order.id).then(() => {
      router.push("/order/order_place");
    });
  };

  // Filter orders based on selected status
  const filteredOrders =
    filterStatus === "All"
      ? orders
      : orders.filter(
          (order) => order.status.toLowerCase() === filterStatus.toLowerCase(),
        );

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.innerContainer}>
          <Header title={t("tabs.orders")} icon={true} />
          <View style={styles.guestContainer}>
            <Text style={styles.guestText}>{t("orders.loginRequired")}</Text>
            <Button
              title={t("orders.loginButton")}
              onPress={() => router.push("/auth/login")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Header title={t("tabs.orders")} icon={true} />

        {/* Dropdown Picker */}
        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={open}
            value={filterStatus}
            items={items}
            setOpen={setOpen}
            setValue={setFilterStatus}
            setItems={setItems}
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownList}
            listItemContainerStyle={styles.dropdownItem}
            placeholder={t("orders.filterByStatus")}
            zIndex={3000}
            zIndexInverse={1000}
          />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            open && { paddingTop: 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <ServiceDetailsCard
                  key={`order-${order.id}`}
                  order={order}
                  orderScreen={true}
                  onPress={() => handleOrderScreen(order)}
                />
              ))
            ) : (
              <View style={styles.noOrdersContainer}>
                <Text>{t("no_order")}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  innerContainer: {
    paddingHorizontal: s(16),
    paddingTop: vs(12),
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: vs(120),
  },
  dropdownContainer: {
    marginVertical: vs(14),
    zIndex: 5000,
  },
  dropdown: {
    backgroundColor: Colors.primary300,
    borderWidth: 0,
    borderRadius: ms(16),
    minHeight: vs(50),
  },
  dropdownText: {
    fontSize: ms(15),
    color: Colors.secondary,
    fontFamily: FONTS.medium,
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderColor: Colors.gray200,
    borderRadius: ms(12),
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    height: vs(50),
    justifyContent: "center",
  },
  loadingContainer: {
    padding: s(20),
    alignItems: "center",
  },
  noOrdersContainer: {
    flex: 1,
    paddingTop: vs(80),
    alignItems: "center",
    justifyContent: "center",
  },
  guestContainer: {
    flex: 1,
    paddingTop: vs(80),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: s(24),
  },
  guestText: {
    fontSize: ms(16),
    fontFamily: FONTS.medium,
    color: Colors.secondary,
    textAlign: "center",
    marginBottom: vs(24),
  },
});
