import Arrived from "@/assets/svgs/arrived.svg";
import EmptyStarIcon from "@/assets/svgs/emptyStar.svg";
import OrderComplete from "@/assets/svgs/orderComplete.svg";
import StarIcon from "@/assets/svgs/Star.svg";
import Timeup from "@/assets/svgs/timeup.svg";
import Tipup from "@/assets/svgs/tipup.svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";
import Button from "./button";
import { getInputFontSize, inputFieldStyles } from "./inputfield";

type PopupType =
  | "timeup"
  | "tipup"
  | "orderComplete"
  | "review"
  | "accepted"
  | "arrived"
  | "on-way"
  | "completed"
  | "time-up";

type PopupProps = {
  setShowPopup: React.Dispatch<React.SetStateAction<PopupType | null>>;
  type: PopupType;
  orderId: string;
  onCompleted?: () => void;
  onTipForPayment?: (tipAmount: string) => void | Promise<void>;
  onCompleteToReview?: () => void;
  onOrderUpdated?: () => void | Promise<void>;
};

export default function Popup({
  setShowPopup,
  type,
  orderId,
  onCompleted,
  onTipForPayment,
  onCompleteToReview,
  onOrderUpdated,
}: PopupProps) {
  const { t } = useTranslation();
  const [tipAmount, setTipAmount] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    if (type !== "orderComplete") return;

    const timer = setTimeout(() => {
      setShowPopup("review");
    }, 1000);

    return () => clearTimeout(timer);
  }, [type, setShowPopup]);

  console.log("type", type);
  const handleNext = () => {
    setShowPopup(null);
  };

  const handleHide = () => {
    setShowPopup(null);
  };

  const handleStartService = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    const latitude = await AsyncStorage.getItem("latitude");
    const longitude = await AsyncStorage.getItem("longitude");
    try {
      if (!orderId) {
        Alert.alert(t("error"), t("popup.orderInfoNotFound"));
        return;
      }

      const parsedOrderId = orderId.startsWith('"')
        ? JSON.parse(orderId)
        : orderId;

      const formData = new FormData();
      formData.append("type", "add_data");
      formData.append("table_name", "order_history");
      formData.append("user_id", userId || "");
      formData.append("lat", latitude || "");
      formData.append("lng", longitude || "");
      formData.append("order_id", String(parsedOrderId));
      formData.append("status", "started");

      const response = await apiCall(formData);
      if (response && response.result === true) {
        setShowPopup(null);
        if (onOrderUpdated) {
          await onOrderUpdated();
        }
      } else {
        Alert.alert(t("error"), t("popup.failedToStartService"));
      }
    } catch (error) {
      console.error("Error starting service:", error);
      Alert.alert(t("error"), t("popup.errorStartingService"));
    }
  };

  const submitTip = async (amount: string, tipStatus: "0" | "1") => {
    const userId = await AsyncStorage.getItem("user_id");

    if (!userId || !orderId) {
      throw new Error("user_or_order_not_found");
    }

    const parsedOrderId = orderId.startsWith('"')
      ? JSON.parse(orderId)
      : orderId;

    const formData = new FormData();
    formData.append("type", "paytip");
    formData.append("tipamount", amount || "0");
    formData.append("order_id", String(parsedOrderId));
    formData.append("user_id", userId);
    formData.append("tipStatus", tipStatus);

    console.log("submitTip formData", formData);

    const response = await apiCall(formData);
    console.log("submitTip response", response);
    return response;
  };

  const handleTipSubmit = async () => {
    try {
      const response = await submitTip(tipAmount || "0", "1");

      if (response && response.result === true) {
        setShowPopup("review");
      } else {
        Alert.alert(t("error"), t("popup.failedToSubmitTip"));
      }
    } catch (error) {
      console.error("Error submitting tip:", error);
      Alert.alert(t("error"), t("popup.errorSubmittingTip"));
    }
  };

  const handleTipSkip = async () => {
    try {
      await submitTip("0", "0");
    } catch (error) {
      console.warn("[Tip] skip save failed:", error);
    }

    if (onTipForPayment) {
      setShowPopup(null);
      await onTipForPayment("0");
      return;
    }

    setShowPopup("review");
  };

  const handleTipContinue = async () => {
    if (onTipForPayment) {
      const tipValue = tipAmount || "0";
      setShowPopup(null);

      try {
        await submitTip(tipValue, "1");
      } catch (error) {
        console.warn("[Tip] save failed, continuing payment:", error);
      }

      await onTipForPayment(tipValue);
      return;
    }

    await handleTipSubmit();
  };

  const handleAddReview = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId || !orderId) {
        Alert.alert(t("error"), t("popup.userOrOrderNotFound"));
        return;
      }

      const parsedOrderId = orderId.startsWith('"')
        ? JSON.parse(orderId)
        : orderId;

      const formData = new FormData();
      formData.append("type", "add_data");
      formData.append("table_name", "reviews");
      formData.append("order_id", String(parsedOrderId));
      formData.append("user_id", userId);
      formData.append("rating", rating.toString());
      formData.append("review", review);
      formData.append("review_by", "customer");

      const response = await apiCall(formData);

      console.log("review response", response);
      console.log("review formData", formData);
      if (response && response.result === true) {
        if (onCompleted) {
          await onCompleted();
        } else {
          setShowPopup(null);
        }
      } else {
        Alert.alert(t("error"), t("popup.failedToSubmitReview"));
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert(t("error"), t("popup.errorSubmittingReview"));
    }
  };

  const handleComplete = () => {
    if (type === "orderComplete") {
      setShowPopup("review");
      return;
    }

    if (onCompleted) {
      onCompleted();
    } else {
      setShowPopup(null);
    }
  };

  const handleMoveHigher = () => {
    // Just hide the popup
    setShowPopup(null);
  };

  const ratingText = [
    t("popup.poor"),
    t("popup.fair"),
    t("popup.good"),
    t("popup.veryGood"),
    t("popup.excellent"),
  ];

  // Render arrived popup content
  if (type === "arrived") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.dateTime}>21 July 2023, 10:35 AM</Text>
          <View style={styles.arrivedImageContainer}>
            <Arrived />
          </View>
          <Text style={styles.title}>{t("popup.serviceProviderArrived")}</Text>
          <Text style={styles.description}>
            {t("popup.arrivedDescription")}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          <Button
            title={t("popup.notYet")}
            variant="secondary"
            fullWidth={false}
            width="34%"
            onPress={handleHide}
          />
          <Button
            title={t("popup.arrived")}
            variant="primary"
            fullWidth={false}
            width="64%"
            onPress={handleStartService}
          />
        </View>
      </View>
    );
  }

  // Render time-up popup content
  if (type === "time-up") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Timeup style={styles.image} />
          <Text style={styles.title}>{t("popup.timeUp")}</Text>
          <Text style={styles.description}>{t("popup.timeUpDescription")}</Text>
        </View>
        <View style={styles.footerButtons}>
          <Button
            title={t("popup.complete")}
            variant="secondary"
            fullWidth={false}
            width="34%"
            onPress={() => {
              if (onCompleteToReview) {
                onCompleteToReview();
              } else {
                handleComplete();
              }
            }}
          />
          <Button
            title={t("popup.moveHigher")}
            variant="primary"
            fullWidth={false}
            width="64%"
            onPress={handleMoveHigher}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {type === "timeup" ? (
          <>
            <Timeup style={styles.image} />
            <Text style={styles.title}>{t("popup.timeUp")}</Text>
            <Text style={styles.description}>
              {t("popup.timeUpDescription")}
            </Text>
          </>
        ) : type === "tipup" ? (
          <>
            <Tipup style={styles.image} />
            <Text style={styles.title}>{t("popup.addTip")}</Text>
            <Text style={styles.description}>{t("popup.tipDescription")}</Text>
            <TextInput
              style={[styles.input, { fontSize: getInputFontSize(tipAmount) }]}
              placeholder={t("popup.enterTipAmount")}
              placeholderTextColor={Colors.secondary300}
              keyboardType="numeric"
              value={tipAmount}
              onChangeText={setTipAmount}
            />
          </>
        ) : type === "orderComplete" ? (
          <>
            <OrderComplete style={styles.image} />
            <Text style={styles.title}>{t("popup.orderCompleted")}</Text>
            <Text style={styles.description}>
              {t("popup.orderCompletedDescription")}
            </Text>
          </>
        ) : type === "review" ? (
          <>
            <Text style={styles.title}>{t("popup.rateExperience")}</Text>
            <Text style={styles.description}>{t("popup.howWasService")}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  {star <= rating ? (
                    <StarIcon height={24} width={24} />
                  ) : (
                    <EmptyStarIcon height={24} width={24} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <>
                <Text style={styles.ratingText}>{ratingText[rating - 1]}</Text>
                <Text style={styles.description}>
                  {t("popup.youGaveStars", {
                    count: rating,
                    stars: rating === 1 ? t("popup.star") : t("popup.stars"),
                  })}
                </Text>
                <TextInput
                  style={[
                    styles.textarea,
                    { fontSize: getInputFontSize(review) },
                  ]}
                  placeholder={t("popup.writeReview")}
                  placeholderTextColor={Colors.secondary300}
                  multiline
                  value={review}
                  onChangeText={setReview}
                />
              </>
            )}
          </>
        ) : null}
      </View>
      <View style={styles.footerButtons}>
        {type === "timeup" ? (
          <>
            <Button
              title={t("popup.complete")}
              variant="secondary"
              fullWidth={false}
              width="34%"
              onPress={handleComplete}
            />
            <Button
              title={t("popup.moveHigher")}
              variant="primary"
              fullWidth={false}
              width="64%"
              onPress={handleMoveHigher}
            />
          </>
        ) : type === "tipup" ? (
          <>
            <Button
              title={t("skip")}
              variant="secondary"
              fullWidth={false}
              width="34%"
              onPress={handleTipSkip}
            />
            <Button
              title={t("continue")}
              variant="primary"
              fullWidth={false}
              width="64%"
              onPress={handleTipContinue}
            />
          </>
        ) : type === "orderComplete" ? (
          <Button
            title={t("continue")}
            variant="primary"
            fullWidth={true}
            width="100%"
            onPress={handleComplete}
          />
        ) : type === "review" ? (
          <Button
            title={t("submit")}
            variant="primary"
            fullWidth={true}
            width="100%"
            onPress={handleAddReview}
            disabled={rating === 0}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: ms(20),
    width: "100%",
    elevation: 1,
    shadowColor: Colors.gray100,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 99,
    paddingVertical: vs(18),
    paddingHorizontal: s(16),
    alignItems: "center",
  },
  content: { alignItems: "center", marginBottom: vs(14), width: "100%" },
  dateTime: {
    color: Colors.secondary300,
    fontSize: ms(12),
    marginBottom: vs(9),
  },
  arrivedImageContainer: {
    backgroundColor: Colors.primary300,
    borderRadius: ms(16),
    padding: s(10),
    marginBottom: vs(13),
    width: "90%",
    alignItems: "center",
  },
  arrivedImage: { width: s(180), height: vs(150) },
  image: { marginBottom: vs(10) },
  title: {
    color: Colors.secondary,
    fontSize: ms(21),
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: vs(7),
  },
  description: {
    color: Colors.secondary300,
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    textAlign: "center",
    marginBottom: vs(14),
    paddingHorizontal: s(10),
  },
  input: {
    ...inputFieldStyles.field,
    marginTop: vs(9),
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: vs(9),
    gap: s(7),
  },
  ratingText: {
    fontSize: ms(15),
    fontFamily: FONTS.bold,
    color: Colors.black,
    textAlign: "center",
    marginTop: vs(5),
  },
  textarea: {
    ...inputFieldStyles.field,
    marginTop: vs(9),
    textAlignVertical: "top",
    minHeight: vs(90),
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: s(6),
  },
});
