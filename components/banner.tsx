import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";
import { apiCall } from "~/utils/api";
import { s, vs } from "~/utils/responsive";

const BANNER_HEIGHT = 172;
const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_HORIZONTAL_PADDING = s(14);
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_HORIZONTAL_PADDING * 2;

const BANNER_EN = require("@/assets/images/banner.png");
const BANNER_AR = require("@/assets/svgs/banner2.png");

type BannerItem = {
  id: string;
  title: string;
  imageUri: string;
};

export default function Banner() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const formData = new FormData();
        formData.append("type", "get_data");
        formData.append("table_name", "banners");
        formData.append("limit", "10");

        const response = await apiCall(formData);
        console.log("[Banner] response:", response);
        const rows = Array.isArray(response?.data) ? response.data : [];

        const mapped: BannerItem[] = rows
          .filter((item: any) => String(item?.status ?? "1") === "1")
          .map((item: any) => {
            const thumb = String(item?.thumb || "").trim();
            const imageName = String(item?.image || "").trim();
            const baseUrl = String(item?.image_url || "").trim();
            const imageUri =
              thumb || (baseUrl && imageName ? `${baseUrl}${imageName}` : "");

            return {
              id: String(item?.id ?? imageUri),
              title: String(item?.title || ""),
              imageUri,
            };
          })
          .filter((item: BannerItem) => !!item.imageUri);

        setBanners(mapped);
      } catch (error) {
        console.warn("[Banner] failed to load:", error);
        setBanners([]);
      }
    };

    fetchBanners();
  }, []);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
    if (index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (banners.length === 0) {
    return (
      <View style={styles.container}>
        <Image
          source={isArabic ? BANNER_AR : BANNER_EN}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.imageUri }}
            style={styles.apiImage}
            resizeMode="cover"
          />
        )}
      />
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: vs(10),
    marginBottom: vs(16),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: BANNER_HEIGHT,
    borderRadius: s(8),
  },
  apiImage: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: s(8),
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: vs(8),
    gap: s(6),
  },
  dot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: "#D0D5DD",
  },
  dotActive: {
    backgroundColor: "#023c69",
    width: s(14),
  },
});
