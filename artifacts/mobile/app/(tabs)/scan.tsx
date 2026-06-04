import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementData, AchievementModal } from "@/components/AchievementModal";
import { ConfettiOverlay } from "@/components/ConfettiOverlay";
import { PenaltyModal } from "@/components/PenaltyModal";
import { RecyclingInstructionsModal } from "@/components/RecyclingInstructionsModal";
import { TriviaModal } from "@/components/TriviaModal";
import { BADGES, getMultiplier, POINTS_PER_BOTTLE, POINTS_PER_CAN, CO2_PER_CAN, CO2_PER_BOTTLE } from "@/constants/gamification";
import { getDailyTrivia, TriviaQuestion } from "@/constants/trivia";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { sendBadgeNotification, sendLevelUpNotification, sendStreakNotification, sendChallengeCompleteNotification } from "@/hooks/useNotifications";
import { useColors } from "@/hooks/useColors";
import { playSuccessPing } from "@/utils/sound";

type ItemType = "can" | "bottle";
type BinType = "can" | "bottle" | "any";
type FlowStep = "idle" | "instructions" | "scanned" | "success" | "invalid";

const PENALTY_POINTS = 10;

function parseQRData(data: string): { valid: boolean; binType: BinType; binId: string } {
  const parts = data.trim().split(":");
  if (parts.length >= 3 && parts[0].toUpperCase() === "BINGO") {
    const rawType = parts[1].toLowerCase();
    const binId = parts[2];
    if (rawType === "can" || rawType === "bottle" || rawType === "any") {
      return { valid: true, binType: rawType as BinType, binId };
    }
  }
  if (data.toUpperCase().startsWith("BINGO_BIN_CAN")) return { valid: true, binType: "can", binId: data };
  if (data.toUpperCase().startsWith("BINGO_BIN_BOTTLE")) return { valid: true, binType: "bottle", binId: data };
  if (data.toUpperCase().startsWith("BINGO_BIN")) return { valid: true, binType: "any", binId: data };
  return { valid: false, binType: "any", binId: "" };
}

function ScanLine() {
  const translateY = useSharedValue(-80);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(80, { duration: 1400 }),
        withTiming(-80, { duration: 1400 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Reanimated.View style={[styles.scanLine, style]}>
      <View style={styles.scanLineInner} />
    </Reanimated.View>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
  deductPoints,
  user,
  refreshLeaderboard,
  refreshUser,
} = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<FlowStep>("idle");
  const [itemType, setItemType] = useState<ItemType>("can");
  const [quantity, setQuantity] = useState(1);
  const [binType, setBinType] = useState<BinType>("any");
  const [binId, setBinId] = useState("");
  const [sessionResult, setSessionResult] =
  useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState<AchievementData | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementData[]>([]);
  const [showTrivia, setShowTrivia] = useState(false);
  const [triviaQuestion] = useState<TriviaQuestion>(getDailyTrivia);
  const [showPenalty, setShowPenalty] = useState(false);
  const scannedRef = useRef(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const pointsBounce = useRef(new Animated.Value(0)).current;

  const multiplierInfo = user ? getMultiplier(user.streak, quantity) : { total: 1, breakdown: [] };
  const basePoints = itemType === "can" ? POINTS_PER_CAN * quantity : POINTS_PER_BOTTLE * quantity;
  const previewPoints = Math.round(basePoints * multiplierInfo.total);
  const co2Preview = itemType === "can" ? CO2_PER_CAN * quantity : CO2_PER_BOTTLE * quantity;
  const isCombo = quantity >= 5;

  const isWrongItem =
    binType !== "any" &&
    ((binType === "can" && itemType === "bottle") ||
      (binType === "bottle" && itemType === "can"));

 const handleBarCodeScanned =
  useCallback(
    ({
      data,
    }: {
      data: string;
    }) => {
      if (
        scannedRef.current
      )
        return;

      scannedRef.current =
        true;

      Haptics.impactAsync(
        Haptics
          .ImpactFeedbackStyle
          .Medium
      );

      // backend validates QR now
      setBinId(data);
      setBinType("any");
      setStep(
        "instructions"
      );
    },
    []
  );

  const handleStartManual = () => {
    scannedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBinType("any");
    setBinId("MANUAL");
    setStep("instructions");
  };

  const handleInstructionsDone = () => {
    setStep("scanned");
  };

const handleConfirm = async () => {
  if (isWrongItem) {
    await deductPoints(PENALTY_POINTS);
    setShowPenalty(true);
    return;
  }

  // Manual entry bypass: skip backend, go straight to success with local points
  if (binId === "MANUAL") {
    await refreshUser();
    await refreshLeaderboard();
    setSessionResult({
      pointsEarned: previewPoints,
      basePoints,
      multiplier: multiplierInfo.total,
      carbonReduced: co2Preview,
      newBadges: [],
      leveledUp: false,
      newLevel: user?.level || 1,
      newTitle: user?.levelTitle || "Newbie",
      challengeCompleted: false,
      challengeBonus: 0,
    });
    setStep("success");
    setShowConfetti(true);
    playSuccessPing();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setShowConfetti(false), 3200);
    return;
  }

  setSaving(true);

  try {
    const response = await api.post(
      "/recycling/scan-qr",
      {
        sessionId: binId,
      }
    );

    const result = response.data;

    setSaving(false);

    if (result.status !== "SUCCESS") {
      setStep("invalid");
      return;
    }

    await refreshUser();
    await refreshLeaderboard();

    setSessionResult({
      pointsEarned: previewPoints,
      basePoints,
      multiplier:
        multiplierInfo.total,
      carbonReduced:
        co2Preview,
      newBadges: [],
      leveledUp: false,
      newLevel:
        user?.level || 1,
      newTitle:
        user?.levelTitle ||
        "Newbie",
      challengeCompleted:
        false,
      challengeBonus: 0,
    });

    setStep("success");
    setShowConfetti(true);
    playSuccessPing();

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    Animated.spring(
      successScale,
      {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver:
          false,
      }
    ).start();

    Animated.sequence([
      Animated.timing(
        pointsBounce,
        {
          toValue: -12,
          duration: 150,
          useNativeDriver:
            false,
        }
      ),
      Animated.spring(
        pointsBounce,
        {
          toValue: 0,
          tension: 100,
          friction: 5,
          useNativeDriver:
            false,
        }
      ),
    ]).start();

    setTimeout(
      () =>
        setShowConfetti(
          false
        ),
      3200
    );
  } catch (error: any) {
    console.error(
      "QR scan failed:",
      error.response?.data ||
        error
    );

    setStep("invalid");
  } finally {
    setSaving(false);
  }
};

  const handleAchievementCloseWithTrivia = () => {
    const remaining = achievementQueue.slice(1);
    setAchievementQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => setAchievement(remaining[0]), 300);
    } else {
      setAchievement(null);
      setTimeout(() => setShowTrivia(true), 600);
    }
  };

  const handleReset = () => {
    scannedRef.current = false;
    setStep("idle");
    setQuantity(1);
    setItemType("can");
    setBinType("any");
    setBinId("");
    setSessionResult(null);
    setShowConfetti(false);
    setAchievement(null);
    setAchievementQueue([]);
    setShowTrivia(false);
    setShowPenalty(false);
    successScale.setValue(0);
    pointsBounce.setValue(0);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.permText, { color: colors.mutedForeground }]}>
          Checking camera permissions…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.permCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.permIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="camera-off" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.permTitle, { color: colors.foreground }]}>
            Camera Access Needed
          </Text>
          <Text style={[styles.permBody, { color: colors.mutedForeground }]}>
            binGO uses your camera to scan the recycling bin's QR code and start a session.
          </Text>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Feather name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#000000" }]}>
      {/* ── IDLE: CAMERA VIEW ── */}
      {step === "idle" && (
        <>
          {Platform.OS !== "web" ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.webCamPlaceholder]}>
              <Feather name="camera" size={60} color="rgba(255,255,255,0.25)" />
              <Text style={styles.webCamText}>Camera preview (native only)</Text>
            </View>
          )}

          <View style={[styles.overlay, { paddingTop: topPad + 20 }]}>
            <Text style={styles.scanTitle}>Scan Bin QR Code</Text>
            <Text style={styles.scanSub}>Point your camera at the QR code on any campus recycling bin</Text>
          </View>

          <View style={styles.frameCont}>
            <View style={styles.frameOuter}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <ScanLine />
            </View>
            <Text style={styles.qrHint}>QR codes only</Text>
          </View>

          <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 }]}>
            <TouchableOpacity style={styles.manualBtn} onPress={handleStartManual} activeOpacity={0.8}>
              <Feather name="edit-3" size={16} color="#FFFFFF" />
              <Text style={styles.manualBtnText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── INVALID QR ── */}
      {step === "invalid" && (
        <View style={[styles.logSheet, { backgroundColor: colors.background, paddingTop: topPad + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.logHandle} />
          <View style={styles.invalidCenter}>
            <View style={[styles.invalidIconBg, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="x-circle" size={44} color="#DC2626" />
            </View>
            <Text style={[styles.invalidTitle, { color: colors.foreground }]}>Invalid QR Code</Text>
            <Text style={[styles.invalidBody, { color: colors.mutedForeground }]}>
              This QR code is not from a binGO recycling bin. Please scan the QR code printed on the green recycling bins on campus.
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
              onPress={handleReset}
            >
              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── SCANNED: LOG ITEMS ── */}
      {step === "scanned" && (
        <View style={[styles.logSheet, { backgroundColor: colors.background, paddingTop: topPad + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.logHandle} />

          <View style={styles.logHeader}>
            <View style={[styles.successDot, { backgroundColor: "#43A047" }]}>
              <Feather name="check" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.logTitle, { color: colors.foreground }]}>
                Bin Verified {binId !== "MANUAL" ? `· ${binId}` : ""}
              </Text>
              <Text style={[styles.logSub, { color: colors.mutedForeground }]}>
                {binType !== "any"
                  ? `This bin accepts ${binType === "can" ? "🥤 cans" : "💧 bottles"} only`
                  : "Choose what you're recycling"}
              </Text>
            </View>
          </View>

          {/* Item type toggle */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Item Type</Text>
          <View style={[styles.toggleRow, { backgroundColor: colors.secondary }]}>
            {(["can", "bottle"] as ItemType[]).map((t) => {
              const isSelected = itemType === t;
              const isWrong = binType !== "any" && binType !== t && isSelected;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.toggleOpt,
                    isSelected && { backgroundColor: isWrong ? "#DC2626" : colors.primary },
                  ]}
                  onPress={() => { setItemType(t); Haptics.selectionAsync(); }}
                >
                  <Feather
                    name={t === "can" ? "box" : "droplet"}
                    size={20}
                    color={isSelected ? "#FFFFFF" : colors.mutedForeground}
                  />
                  <Text style={[styles.toggleText, { color: isSelected ? "#FFFFFF" : colors.mutedForeground }]}>
                    {t === "can" ? "Can" : "Bottle"}
                  </Text>
                  <Text style={[styles.togglePts, { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                    {t === "can" ? POINTS_PER_CAN : POINTS_PER_BOTTLE} base pts
                  </Text>
                  {binType !== "any" && binType !== t && (
                    <View style={styles.wrongBadge}>
                      <Text style={styles.wrongBadgeText}>✗ wrong</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isWrongItem && (
            <View style={[styles.penaltyWarn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-triangle" size={14} color="#DC2626" />
              <Text style={styles.penaltyWarnText}>
                Wrong item! Confirming will deduct <Text style={{ fontFamily: "Outfit_700Bold" }}>-{PENALTY_POINTS} points</Text>.
              </Text>
            </View>
          )}

          {/* Quantity */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quantity</Text>
          <View style={[styles.quantityRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: colors.card }]}
              onPress={() => { if (quantity > 1) { setQuantity((q) => q - 1); Haptics.selectionAsync(); } }}
            >
              <Feather name="minus" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.qtyCenter}>
              <Text style={[styles.qtyVal, { color: colors.foreground }]}>{quantity}</Text>
              {isCombo && (
                <View style={[styles.comboBadge, { backgroundColor: "#FF6B00" }]}>
                  <Text style={styles.comboText}>COMBO!</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: colors.card }]}
              onPress={() => { if (quantity < 50) { setQuantity((q) => q + 1); Haptics.selectionAsync(); } }}
            >
              <Feather name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Multiplier breakdown */}
          {multiplierInfo.breakdown.length > 0 && !isWrongItem && (
            <View style={[styles.multiplierBox, { backgroundColor: "#FFF8E1", borderColor: "#FFE082" }]}>
              <View style={styles.multiplierHeader}>
                <Feather name="zap" size={14} color="#FF8F00" />
                <Text style={styles.multiplierTitle}>Active Bonuses</Text>
                <Text style={styles.multiplierTotal}>{multiplierInfo.total}x</Text>
              </View>
              {multiplierInfo.breakdown.map((b, i) => (
                <View key={i} style={styles.multiplierRow}>
                  <View style={[styles.multiplierDot, { backgroundColor: b.color }]} />
                  <Text style={styles.multiplierLabel}>{b.label}</Text>
                  <Text style={[styles.multiplierVal, { color: b.color }]}>{b.value}x</Text>
                </View>
              ))}
            </View>
          )}

          {/* Preview card */}
          {!isWrongItem && (
            <LinearGradient colors={["#E8F5E9", "#C8E6C9"]} style={styles.previewCard}>
              <View style={styles.previewRow}>
                <View style={styles.previewItem}>
                  <Text style={[styles.previewVal, { color: colors.primary }]}>+{previewPoints}</Text>
                  {multiplierInfo.total > 1 && (
                    <Text style={[styles.previewBase, { color: colors.mutedForeground }]}>
                      base {basePoints}
                    </Text>
                  )}
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Points</Text>
                </View>
                <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                <View style={styles.previewItem}>
                  <Text style={[styles.previewVal, { color: colors.accent }]}>{co2Preview.toFixed(2)} kg</Text>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>CO2 Saved</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: isWrongItem ? "#DC2626" : colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Feather name={isWrongItem ? "alert-triangle" : "check-circle"} size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              {saving ? "Saving…" : isWrongItem ? `Confirm Anyway (-${PENALTY_POINTS} pts)` : "Confirm Session"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── SUCCESS ── */}
      {step === "success" && sessionResult && (
        <View style={[styles.successScreen, { backgroundColor: colors.background }]}>
          <ConfettiOverlay visible={showConfetti} />

          <Animated.View style={[styles.successBubble, { transform: [{ scale: successScale }, { translateY: pointsBounce }] }]}>
            <LinearGradient colors={["#4C1D95", "#6C63FF"]} style={styles.successCircle}>
              <Feather name="check" size={56} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.successTitle, { color: colors.foreground }]}>Session Logged!</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            {quantity} {itemType}{quantity > 1 ? "s" : ""} recycled on campus
          </Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardCard, { backgroundColor: "#E8F5E9" }]}>
              <Feather name="star" size={22} color={colors.primary} />
              <Text style={[styles.rewardVal, { color: colors.primary }]}>+{sessionResult.pointsEarned}</Text>
              {sessionResult.multiplier > 1 && (
                <Text style={[styles.rewardMult, { color: colors.primary }]}>
                  {sessionResult.multiplier}x bonus!
                </Text>
              )}
              <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>Points Earned</Text>
            </View>
            <View style={[styles.rewardCard, { backgroundColor: "#E0F2F1" }]}>
              <Feather name="wind" size={22} color={colors.accent} />
              <Text style={[styles.rewardVal, { color: colors.accent }]}>
                {sessionResult.carbonReduced.toFixed(2)} kg
              </Text>
              <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>CO2 Reduced</Text>
            </View>
          </View>

          {sessionResult.challengeCompleted && (
            <View style={[styles.challengeToast, { backgroundColor: "#FF6D00" }]}>
              <Feather name="target" size={16} color="#FFFFFF" />
              <Text style={styles.challengeToastText}>
                Daily Challenge Complete! +{sessionResult.challengeBonus} bonus pts
              </Text>
            </View>
          )}

          {sessionResult.leveledUp && (
            <View style={[styles.challengeToast, { backgroundColor: "#6C63FF", marginTop: 8 }]}>
              <Feather name="trending-up" size={16} color="#FFFFFF" />
              <Text style={styles.challengeToastText}>
                Level Up! You're now Lv.{sessionResult.newLevel} — {sessionResult.newTitle}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}

      <RecyclingInstructionsModal
        visible={step === "instructions"}
        binType={binType}
        onGotIt={handleInstructionsDone}
      />

      <PenaltyModal
        visible={showPenalty}
        penaltyPoints={PENALTY_POINTS}
        wrongItem={itemType}
        expectedItem={binType === "can" ? "can" : "bottle"}
        onClose={handleReset}
      />

      <AchievementModal
        visible={!!achievement}
        data={achievement}
        onClose={handleAchievementCloseWithTrivia}
      />

      <TriviaModal
        visible={showTrivia}
        question={triviaQuestion}
        onClose={() => setShowTrivia(false)}
      />
    </View>
  );
}

const FRAME = 230;
const CORNER = 28;
const CW = 4;

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0,
    alignItems: "center", paddingHorizontal: 32,
  },
  scanTitle: {
    fontSize: 22, fontFamily: "Outfit_700Bold", color: "#FFFFFF", marginBottom: 8,
  },
  scanSub: {
    fontSize: 14, fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.8)", textAlign: "center",
  },
  frameCont: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  frameOuter: { width: FRAME, height: FRAME, position: "relative", overflow: "hidden" },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#FFFFFF" },
  cornerTL: { top: 0, left: 0, borderTopWidth: CW, borderLeftWidth: CW, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CW, borderRightWidth: CW, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CW, borderLeftWidth: CW, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CW, borderRightWidth: CW, borderBottomRightRadius: 4 },
  scanLine: { position: "absolute", left: 8, right: 8, alignItems: "center" },
  scanLineInner: { height: 2, width: "100%", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 1 },
  qrHint: {
    color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Outfit_400Regular",
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    alignItems: "center", paddingTop: 24,
  },
  manualBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 24,
    paddingHorizontal: 22, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  manualBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  webCamPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#111111", gap: 12 },
  webCamText: { color: "rgba(255,255,255,0.35)", fontSize: 14, fontFamily: "Outfit_400Regular" },
  permText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  permCard: {
    borderRadius: 24, padding: 28, alignItems: "center", gap: 16, borderWidth: 1,
    width: "100%",
  },
  permIconBg: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center",
  },
  permTitle: { fontSize: 20, fontFamily: "Outfit_700Bold", textAlign: "center" },
  permBody: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 22 },
  permBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
  },
  permBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Outfit_700Bold" },
  logSheet: { flex: 1, paddingHorizontal: 22 },
  logHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 24 },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  successDot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  logTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  logSub: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 1 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
  },
  toggleRow: { flexDirection: "row", borderRadius: 16, padding: 6, marginBottom: 12, gap: 6 },
  toggleOpt: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, gap: 4 },
  toggleText: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  togglePts: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  wrongBadge: {
    borderRadius: 6, backgroundColor: "rgba(220,38,38,0.15)", paddingHorizontal: 6, paddingVertical: 2,
  },
  wrongBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#DC2626" },
  penaltyWarn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12,
  },
  penaltyWarnText: {
    flex: 1, fontSize: 13, fontFamily: "Outfit_400Regular", color: "#DC2626",
  },
  quantityRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, padding: 8, marginBottom: 16, borderWidth: 1,
  },
  qtyBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qtyCenter: { alignItems: "center", gap: 4 },
  qtyVal: { fontSize: 32, fontFamily: "Outfit_700Bold", minWidth: 60, textAlign: "center" },
  comboBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  comboText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1 },
  multiplierBox: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5 },
  multiplierHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  multiplierTitle: { flex: 1, fontSize: 13, fontFamily: "Outfit_700Bold", color: "#FF8F00" },
  multiplierTotal: { fontSize: 18, fontFamily: "Outfit_700Bold", color: "#FF6D00" },
  multiplierRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  multiplierDot: { width: 8, height: 8, borderRadius: 4 },
  multiplierLabel: { flex: 1, fontSize: 12, fontFamily: "Outfit_400Regular", color: "#5D4037" },
  multiplierVal: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  previewCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  previewRow: { flexDirection: "row", alignItems: "center" },
  previewItem: { flex: 1, alignItems: "center" },
  previewVal: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  previewBase: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  previewLabel: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  previewDivider: { width: 1, height: 44, marginHorizontal: 16 },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 16, paddingVertical: 18, marginBottom: 12,
  },
  confirmBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Outfit_700Bold" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
  invalidCenter: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  invalidIconBg: {
    width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  invalidTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", marginBottom: 12 },
  invalidBody: {
    fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 22,
  },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successBubble: { marginBottom: 28 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontFamily: "Outfit_700Bold", marginBottom: 6 },
  successSub: { fontSize: 15, fontFamily: "Outfit_400Regular", marginBottom: 28, textAlign: "center" },
  rewardRow: { flexDirection: "row", gap: 14, marginBottom: 20, width: "100%" },
  rewardCard: {
    flex: 1, borderRadius: 20, padding: 18, alignItems: "center", gap: 6,
  },
  rewardVal: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  rewardMult: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  rewardLabel: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  challengeToast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, width: "100%",
  },
  challengeToastText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Outfit_600SemiBold", flex: 1 },
  doneBtn: {
    borderRadius: 16, paddingVertical: 17, paddingHorizontal: 48,
    alignItems: "center", marginTop: 24,
  },
  doneBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Outfit_700Bold" },
});
