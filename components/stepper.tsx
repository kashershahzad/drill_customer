import Tick from "@/assets/svgs/tick.svg";
import DashedSeparator from "@/components/dashed_seprator";
import { Colors } from "@/constants/Colors";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
interface StepperProps {
  step?: boolean;
}

const Stepper: React.FC<StepperProps> = ({ step }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.stepContainer}>
        {/* Step 1 */}
        <View style={styles.step}>
          <View style={styles.stepIconContainer}>
            <Tick />
          </View>
          <Text style={styles.stepText}>{t("step1")}</Text>
        </View>

        {/* Separator */}
        <View style={styles.separator}>
          <DashedSeparator width={110} />
        </View>

                {/* Step 2 */}
                <View style={styles.step}>
          <View
            style={[
              styles.stepIconContainer,
              step ? styles.activeStep : styles.inactiveStep,
            ]}
          >
            {step ? (
              <Tick />
            ) : (
              <View style={styles.innerIconContainer}>
                <View style={{ height: 24, width: 24 }} />
              </View>
            )}
          </View>
          <Text style={styles.stepText}>{t("step2")}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: vs(20) },
  stepContainer: { flexDirection: "row", alignItems: "center" },
  step: { alignItems: "center" },
  stepIconContainer: { padding: s(8), borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary },
  activeStep: { backgroundColor: Colors.primary },
  inactiveStep: { backgroundColor: Colors.primary200 },
  innerIconContainer: { borderRadius: ms(25), borderColor: Colors.secondary300, borderWidth: 1 },
  stepText: { fontSize: ms(10), marginTop: vs(4), fontFamily: FONTS.regular },
  separator: { marginHorizontal: s(12), marginBottom: vs(8) },
});

export default Stepper;
