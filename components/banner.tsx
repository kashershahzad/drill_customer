import { Image, StyleSheet, View } from "react-native";
import { s, vs } from "~/utils/responsive";

const BANNER_ASPECT_RATIO = 2.1;
const BANNER_WIDTH = s(370);
const BANNER_HEIGHT = BANNER_WIDTH / BANNER_ASPECT_RATIO;

export default function Banner() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/banner.png")}
        style={styles.image}
        resizeMode="cover"
      />
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
    height: 172,
    borderRadius: s(8),
  },
});
