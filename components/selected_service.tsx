import Edit from "@/assets/svgs/edit.svg";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

type Category = {
  image: any;
  name: any;
};
type Props = {
  category: Category;
  serviceType: "instant" | "schedule";
  scheduleDate: string;
  scheduleTime: string;
};

export default function SelectedService({
  category,
  serviceType,
  scheduleDate,
  scheduleTime,
}: Props) {
  const { t } = useTranslation();
  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const handleSelectService = () => {
    router.push("/add");
  };
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: category.image }} style={styles.image} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{category.name}</Text>
        <Text style={styles.date}>
          {t("date")}:{" "}
          <Text style={styles.dateValue}>
            {serviceType === "schedule"
              ? (() => {
                  // Parse date string safely to avoid timezone issues
                  const [year, month, day] = scheduleDate
                    .split("-")
                    .map(Number);
                  const localDate = new Date(year, month - 1, day);
                  return localDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                })()
              : currentDate}
          </Text>
        </Text>
      </View>
      <TouchableOpacity onPress={handleSelectService}>
        <Edit width={s(24)} height={s(24)}/>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  imageContainer: { padding: s(8), backgroundColor: Colors.primary200, borderRadius: ms(12) },
  image: { width: s(46), height: s(46), borderRadius: ms(8) },
  textContainer: { flex: 1, marginLeft: s(14), gap: vs(5) },
  title: { fontSize: ms(16), color: Colors.secondary, fontFamily: FONTS.semiBold },
  date: { fontSize: ms(12), fontFamily: FONTS.regular, color: Colors.secondary300 },
  dateValue: { fontSize: ms(13), fontFamily: FONTS.regular, color: Colors.secondary },
});
