import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { BADGES } from "@/constants/gamification";

interface ShareCardProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  usn: string;
  points: number;
  rank: number;
  streak: number;
  totalSessions: number;
  carbonReduced: number;
  badges: string[];
  level?: number;
  levelTitle?: string;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function ShareCard({
  visible,
  onClose,
  name,
  usn,
  points,
  rank,
  streak,
  totalSessions,
  carbonReduced,
  badges,
  level,
  levelTitle,
}: ShareCardProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const earnedBadges = BADGES.filter((b) => badges.includes(b.id)).slice(0, 4);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 10,
        useNativeDriver: false,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Your share card 📸</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
            Screenshot this and post it — flex responsibly.
          </Text>

          {/* The Card Itself */}
          <LinearGradient
            colors={["#09090B", "#1E1B4B", "#4C1D95"]}
            style={styles.card}
          >
            {/* Decorative blobs */}
            <View style={[styles.blob, styles.blob1]} />
            <View style={[styles.blob, styles.blob2]} />

            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.logoRow}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>♻</Text>
                </View>
                <Text style={styles.logoLabel}>binGO.</Text>
              </View>
              <Text style={styles.cardTagline}>made for bmsce.</Text>
            </View>

            {/* Avatar + Name */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(name)}</Text>
                </View>
              </View>
              <Text style={styles.cardName}>{name}</Text>
              <Text style={styles.cardUsn}>{usn}</Text>
              <View style={styles.levelRow}>
                <View style={styles.levelPill}>
                 <Text style={styles.levelPillText}>
  Lv.{level || 1} · {levelTitle || "Newbie"}
</Text>
                </View>
                {streak > 0 && (
                  <View style={styles.streakPill}>
                    <Text style={styles.streakPillText}>🔥 {streak}d streak</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{points.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{rankEmoji}</Text>
                <Text style={styles.statLabel}>Campus Rank</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{totalSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
            </View>

            {/* CO2 Bar */}
            <View style={styles.co2Row}>
              <Text style={styles.co2Icon}>🌿</Text>
              <Text style={styles.co2Text}>
                {carbonReduced.toFixed(2)} kg CO2 saved from the atmosphere
              </Text>
            </View>

            {/* Badges */}
            {earnedBadges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>badges earned</Text>
                <View style={styles.badgesRow}>
                  {earnedBadges.map((b) => (
                    <View key={b.id} style={styles.badgePill}>
                      <Text style={styles.badgePillText}>{b.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>join me on binGO @ bmsce.ac.in</Text>
              <View style={styles.footerDots}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.footerDot} />
                ))}
              </View>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E4E4E7",
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  sheetSub: { fontSize: 13, fontFamily: "Outfit_400Regular", marginBottom: 4 },

  // Card
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    gap: 18,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(109,99,255,0.25)",
  },
  blob1: { width: 200, height: 200, top: -60, right: -60 },
  blob2: { width: 140, height: 140, bottom: 20, left: -40, backgroundColor: "rgba(249,115,22,0.15)" },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 16 },
  logoLabel: { fontSize: 18, fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
  cardTagline: { fontSize: 11, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.5)" },

  avatarSection: { alignItems: "center", gap: 6 },
  avatarRing: {
    padding: 3,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
  cardName: { fontSize: 22, fontFamily: "Outfit_700Bold", color: "#FFFFFF", marginTop: 6 },
  cardUsn: { fontSize: 13, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.6)" },
  levelRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  levelPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelPillText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  streakPill: {
    backgroundColor: "rgba(255,165,0,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  streakPillText: { color: "#FFB300", fontSize: 12, fontFamily: "Outfit_700Bold" },

  statsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 16,
  },
  statBox: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 22, fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.6)" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },

  co2Row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  co2Icon: { fontSize: 18 },
  co2Text: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium", color: "rgba(255,255,255,0.85)", lineHeight: 19 },

  badgesSection: { gap: 8 },
  badgesTitle: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, textTransform: "uppercase" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badgePill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePillText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: "#FFFFFF" },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  footerText: { fontSize: 11, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.4)" },
  footerDots: { flexDirection: "row", gap: 4 },
  footerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.25)" },

  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  doneBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Outfit_700Bold" },
});
