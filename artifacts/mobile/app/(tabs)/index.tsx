import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { api } from "@/services/api";

import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { Mascot } from "@/components/Mascot";
import { useAuth, User } from "@/context/AuthContext";
import { getDailyFact } from "@/constants/recyclingFacts";
import {
  getMultiplier,
  getTodaysChallenge,
} from "@/constants/gamification";
import {
  requestNotificationPermissions,
  scheduleDailyReminders,
} from "@/hooks/useNotifications";
import { useColors } from "@/hooks/useColors";

function initials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AnimatedCounter({ value, style }: { value: number; style?: object }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const displayVal = useRef(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value ?? 0,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const [display, setDisplay] = React.useState(value ?? 0);

  useEffect(() => {
    const id = animVal.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== displayVal.current) {
        displayVal.current = rounded;
        setDisplay(rounded);
      }
    });
    return () => animVal.removeListener(id);
  }, [animVal]);

  return (
    <Animated.Text style={style}>
      {(display ?? 0).toLocaleString()}
    </Animated.Text>
  );
}

function MiniLeaderRow({
  user,
  rank,
  isCurrentUser,
}: {
  user: User;
  rank: number;
  isCurrentUser: boolean;
}) {
  const colors = useColors();
  const MEDAL = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <View
      style={[
        styles.miniRow,
        isCurrentUser && {
          backgroundColor: colors.secondary,
          borderRadius: 12,
        },
      ]}
    >
      <View style={styles.miniRank}>
        {rank <= 3 ? (
          <Feather name="award" size={16} color={MEDAL[rank - 1]} />
        ) : (
          <Text style={[styles.miniRankNum, { color: colors.mutedForeground }]}>
            {rank}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.miniAvatar,
          {
            backgroundColor: isCurrentUser ? colors.primary : colors.secondary,
          },
        ]}
      >
        <Text
          style={[
            styles.miniAvatarText,
            { color: isCurrentUser ? "#FFFFFF" : colors.primary },
          ]}
        >
          {initials(user?.name || "")}
        </Text>
      </View>
      <Text
        style={[
          styles.miniName,
          { color: colors.foreground },
          isCurrentUser && { fontFamily: "Outfit_700Bold" },
        ]}
        numberOfLines={1}
      >
        {user?.name || "Anonymous User"}
        {isCurrentUser ? " (you)" : ""}
      </Text>
      <Text style={[styles.miniPts, { color: colors.primary }]}>
        {(user?.points || 0).toLocaleString()}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, allUsers,  refreshLeaderboard } = useAuth();
   useEffect(() => {
  refreshLeaderboard();
}, []);
  const [campusStats, setCampusStats] = React.useState({
  totalSubmissions: 0,
  totalPoints: 0,
  totalBottles: 0,
  totalCans: 0,
  totalUsers: 0,
});

  useEffect(() => {
  requestNotificationPermissions().then((granted) => {
    if (granted) scheduleDailyReminders();
  });
}, []);

// 👇 ADD THIS HERE
useEffect(() => {
  async function loadCampusStats() {
  
    try {
      const res = await api.get("/recycling/stats");

      console.log("CAMPUS STATS", res.data);

      setCampusStats({
        totalSubmissions:
          res.data.totalSubmissions || 0,

        totalPoints:
          res.data.totalPoints || 0,

        totalBottles:
          res.data.totalBottles || 0,

        totalCans:
          res.data.totalCans || 0,

        totalUsers:
          res.data.totalUsers || 0,
      });
    } catch (err) {
      console.error(
        "Failed loading campus analytics:",
        err
      );
    }
  }

  loadCampusStats();
}, []);

if (!user) return null;

  // Safe Data Fallbacks
  const safeSessions = user.sessions || [];
  const safeAllUsers = allUsers || [];

  const activityPoints = Math.floor((user.points || 0) / 10);
  const sorted = [...safeAllUsers].sort(
    (a, b) => (b.points || 0) - (a.points || 0),
  );
  const top5 = sorted.slice(0, 5);
  const userRank = sorted.findIndex((u) => u.id === user.id) + 1;
  const firstName = (user.name || "Student").split(" ")[0];
  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 100;

  const today = new Date().toISOString().split("T")[0];
  // 🌟 FIXED: Added check to prevent filtering an undefined or null structure
  const todaySessions = safeSessions.filter(
    (s) => s && s.timestamp && s.timestamp.split("T")[0] === today,
  );
  const challenge = getTodaysChallenge();

  const multiplierInfo = getMultiplier(user.streak || 0, 1);
  const hasBonus =
    multiplierInfo?.breakdown && multiplierInfo.breakdown.length > 0;


  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={["#09090B", "#1E1B4B", "#312E81"]}
        style={[styles.hero, { paddingTop: topPad }]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>hey, {firstName} 👋</Text>
            <Text style={styles.greetingSub}>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          <View style={styles.heroRight}>
            <View
              style={[
                styles.levelChip,
                { backgroundColor: "rgba(255,255,255,0.18)" },
              ]}
            >
              <Text style={styles.levelChipText}>
                Lv.{user.level || 1} · {user.levelTitle || "Newbie"}
              </Text>
            </View>
            {userRank > 0 && (
              <View
                style={[
                  styles.rankChip,
                  { backgroundColor: "rgba(255,215,0,0.25)" },
                ]}
              >
                <Feather name="award" size={12} color="#FFD700" />
                <Text style={styles.rankChipText}>Rank #{userRank}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Total Points</Text>
          <AnimatedCounter value={user.points || 0} style={styles.pointsVal} />
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(user.levelProgressPercent || 0)}%` },
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={styles.progressText}>
              {Math.max(
                0,
                (user.nextLevelPoints || 200) - (user.points || 0),
              ).toLocaleString()}{" "}
              pts to Lv.{(user.level || 1) + 1}
            </Text>
            {(user.streak || 0) > 0 && (
              <View style={styles.streakPill}>
                <Feather name="zap" size={11} color="#FFB300" />
                <Text style={styles.streakPillText}>{user.streak}d streak</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Active Bonus Banner */}
      {hasBonus && (
        <LinearGradient
          colors={["#FF6D00", "#FF9800"]}
          style={styles.bonusBanner}
        >
          <Feather name="zap" size={16} color="#FFFFFF" />
          <Text style={styles.bonusBannerText}>
            {multiplierInfo.breakdown.map((b) => b.label).join(" + ")} active!
          </Text>
          <Text style={styles.bonusBannerMult}>{multiplierInfo.total}x</Text>
        </LinearGradient>
      )}

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="activity" size={20} color={colors.accent} />
          <AnimatedCounter
            value={activityPoints}
            style={[styles.metricVal, { color: colors.foreground }]}
          />
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
            Activity Points
          </Text>
        </View>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="wind" size={20} color="#00897B" />
          <Text style={[styles.metricVal, { color: colors.foreground }]}>
            {(user.carbonReduced || 0).toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
            kg CO2 Saved
          </Text>
        </View>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="refresh-cw" size={20} color={colors.primary} />
          <AnimatedCounter
            value={user.totalSessions || 0}
            style={[styles.metricVal, { color: colors.foreground }]}
          />
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
            Sessions
          </Text>
        </View>
      </View>

      {/* Daily Challenge */}
      <View style={styles.section}>
        <DailyChallengeCard
          challenge={challenge}
          todaySessions={safeSessions}
        />
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.scanCta, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/(tabs)/scan")}
        activeOpacity={0.85}
      >
        <View style={styles.scanCtaLeft}>
          <Feather name="camera" size={22} color="#FFFFFF" />
          <View>
            <Text style={styles.scanCtaTitle}>scan something 📦</Text>
            {hasBonus && (
              <Text style={styles.scanCtaSub}>
                {multiplierInfo.total}x points active
              </Text>
            )}
          </View>
        </View>
        <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Mascot */}
      <Mascot level={user.level || 1} streak={user.streak || 0} levelTitle={user.levelTitle || "Sapling"} />

      {/* Daily Fact */}
      {(() => {
        const fact = getDailyFact();
        return (
          <View
            style={[
              styles.factCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.factHeader}>
              <Text style={styles.factEmoji}>{fact.emoji}</Text>
              <View
                style={[
                  styles.factCategoryPill,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[styles.factCategoryText, { color: colors.primary }]}
                >
                  {fact.category}
                </Text>
              </View>
            </View>
            <Text style={[styles.factText, { color: colors.foreground }]}>
              {fact.text}
            </Text>
          </View>
        );
      })()}

      {/* Top 5 Leaderboard */}
      <View
        style={[
          styles.leaderSection,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.leaderHeader}>
          <Feather name="award" size={18} color="#FFD700" />
          <Text style={[styles.leaderTitle, { color: colors.foreground }]}>
            Top 5 on Campus
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/leaderboard")}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              See all
            </Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {top5.map((u, i) => (
          <MiniLeaderRow
            key={u.id || i}
            user={u}
            rank={i + 1}
            isCurrentUser={u.id === user.id}
          />
        ))}
      </View>

      {/* Campus Community Stats */}
     <View style={[styles.campusCard, { backgroundColor: "#1E1B4B" }]}>
  <View style={styles.campusHeader}>
    <Feather
      name="globe"
      size={16}
      color="rgba(255,255,255,0.8)"
    />
    <Text style={styles.campusTitle}>
      campus impact so far
    </Text>
  </View>

  {/* 👇 ADD THIS WRAPPER */}
      <View style={styles.campusStats}>
      <View style={styles.campusStat}>
        <Text style={styles.campusStatVal}>
          {campusStats.totalBottles}
        </Text>
        <Text style={styles.campusStatLabel}>
          Plastic Bottles
        </Text>
      </View>

      <View style={styles.campusStat}>
        <Text style={styles.campusStatVal}>
          {campusStats.totalCans}
        </Text>
        <Text style={styles.campusStatLabel}>
          Aluminum Cans
        </Text>
      </View>

      <View style={styles.campusStat}>
        <Text style={styles.campusStatVal}>
          {campusStats.totalUsers}
        </Text>
        <Text style={styles.campusStatLabel}>
          Students
        </Text>
      </View>
    </View>
  </View>

</ScrollView>
);
}

// ... Stylesheets remain completely identical and perfectly configured!
const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  heroLeft: { flex: 1 },
  heroRight: { alignItems: "flex-end", gap: 6 },
  greeting: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
    lineHeight: 34,
  },
  greetingSub: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  levelChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  levelChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  rankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankChipText: {
    color: "#FFD700",
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
  },
  pointsCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 22,
    padding: 20,
  },
  pointsLabel: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  pointsVal: {
    fontSize: 52,
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,179,0,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streakPillText: {
    color: "#FFB300",
    fontSize: 11,
    fontFamily: "Outfit_700Bold",
  },
  bonusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bonusBannerText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  bonusBannerMult: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  metricVal: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    marginTop: 4,
    textAlign: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
  section: { paddingHorizontal: 16, marginTop: 14 },
  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  scanCtaLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  scanCtaTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  scanCtaSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    marginTop: 1,
  },
  factCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  factEmoji: { fontSize: 20 },
  factCategoryPill: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  factCategoryText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  factText: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 23 },
  leaderSection: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  leaderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  leaderTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", flex: 1 },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    marginBottom: 4,
  },
  miniRank: { width: 22, alignItems: "center" },
  miniRankNum: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  miniName: { flex: 1, fontSize: 14, fontFamily: "Outfit_500Medium" },
  miniPts: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  campusCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
  },
  campusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  campusTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  campusStats: { flexDirection: "row", alignItems: "center" },
  campusStat: { flex: 1, alignItems: "center" },
  campusStatVal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
  },
  campusStatLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    marginTop: 2,
  },
  campusDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
