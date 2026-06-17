import Star from "@/assets/svgs/Star.svg";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

type ServiceCardProps = {
  item: {
    image: any;
    title: string;
    rating: string;
    reviews: string;
    price: number;
    provider: string;
    providerImage: any;
  };
};

const ServiceCard: React.FC<ServiceCardProps> = ({ item }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Image
        source={item.image}
        resizeMode="cover"
        style={styles.serviceImage}
      />
      <View style={styles.detailsContainer}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.price}>${item.price}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Star width={s(14)} height={s(14)} />
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.reviews}>({item.reviews})</Text>
        </View>
        <View style={styles.providerContainer}>
          <Image source={item.providerImage} style={styles.providerImage} />
          <View>
            <Text style={styles.providerName} numberOfLines={1}>{item.provider}</Text>
            <Text style={styles.providerLabel}>{t("provider")}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: s(230),
    backgroundColor: Colors.gray100,
    borderRadius: ms(16),
    marginRight: s(14),
  },
  serviceImage: {
    height: vs(140),
    width: "100%",
    borderTopLeftRadius: ms(16),
    borderTopRightRadius: ms(16),
  },
  detailsContainer: {
    padding: s(12),
    gap: vs(6),
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: ms(16),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
    flex: 1,
    marginRight: s(6),
    lineHeight: ms(20),
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(4),
  },
  rating: {
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    fontSize: ms(13),
  },
  reviews: {
    fontSize: ms(12),
    fontFamily: FONTS.regular,
    color: Colors.secondary300,
  },
  price: {
    paddingVertical: vs(5),
    paddingHorizontal: s(12),
    backgroundColor: Colors.primary,
    color: "white",
    fontSize: ms(14),
    borderRadius: ms(24),
    fontFamily: FONTS.semiBold,
  },
  providerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
  },
  providerImage: {
    height: s(30),
    width: s(30),
  },
  providerName: {
    fontSize: ms(13),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  providerLabel: {
    fontSize: ms(11),
    fontFamily: FONTS.regular,
    color: Colors.secondary300,
  },
});

export default ServiceCard;
