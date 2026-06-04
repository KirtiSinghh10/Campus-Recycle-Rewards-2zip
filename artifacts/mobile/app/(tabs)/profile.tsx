import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { api } from "@/services/api";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RecyclingSession, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { RecyclingHeatmap } from "@/components/RecyclingHeatmap";
import { ShareCard } from "@/components/ShareCard";

function initials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: string;
  label: string;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={20} color={accent ?? colors.primary} />
      <Text style={[styles.statVal, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function SessionItem({ session }: { session: RecyclingSession }) {
  const colors = useColors();
  if (!session || !session.timestamp) return null;

  const date = new Date(session.timestamp);
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.sessionRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.sessionIcon,
          {
            backgroundColor: session.itemType === "can" ? "#E8F5E9" : "#E0F2F1",
          },
        ]}
      >
        <Feather
          name={session.itemType === "can" ? "box" : "droplet"}
          size={18}
          color={session.itemType === "can" ? "#43A047" : "#00ACC1"}
        />
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionType, { color: colors.foreground }]}>
          {session.quantity || 0}x{" "}
          {session.itemType === "can" ? "Can" : "Bottle"}
          {(session.quantity || 0) > 1 ? "s" : ""}
        </Text>
        <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>
          {dateStr}
        </Text>
      </View>
      <View style={styles.sessionRight}>
        <Text style={[styles.sessionPts, { color: "#43A047" }]}>
          +{session.pointsEarned || 0}
        </Text>
        <Text
          style={[styles.sessionPtsLabel, { color: colors.mutedForeground }]}
        >
          pts
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, allUsers, logout } = useAuth();
  const [showShare, setShowShare] = React.useState(false);
  const [backendBadges, setBackendBadges] = React.useState<any[]>([]);

React.useEffect(() => {
  async function loadBadges() {
    try {
      const res =
        await api.get("/users/me/badges");

      console.log(
        "BADGES RESPONSE",
        res.data
      );

      setBackendBadges(
        res.data || []
      );
    } catch (err) {
      console.error(
        "Failed loading badges",
        err
      );
    }
  }

  loadBadges();
}, []);

if (!user) return null;

  // 🛡️ CRASH GUARDS: Secure safe array structure fallbacks
  const safeSessions = user.sessions || [];

  const safeAllUsers = allUsers || [];

  const activityPoints = Math.floor((user.points || 0) / 10);
 
  const sorted = [...safeAllUsers].sort(
    (a, b) => (b.points || 0) - (a.points || 0),
  );
  const userRank = sorted.findIndex((u) => u.id === user.id) + 1;

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <React.Fragment>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#09090B", "#1E1B4B"]}
          style={[styles.header, { paddingTop: topPad }]}
        >
          <View style={styles.headerRow}>
            {/* Avatar: Google profile picture or initials */}
            {user.profilePicture ? (
              <Image
                source={{ uri: user.profilePicture }}
                style={styles.avatarLgImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarLg}>
                <Text style={styles.avatarText}>
                  {initials(user.name || "Student")}
                </Text>
              </View>
            )}

            <View style={styles.headerActions}>
              {user.isGoogleUser && (
                <View style={styles.googleBadge}>
                  <Text style={styles.googleBadgeG}>G</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowShare(true)}
                activeOpacity={0.7}
              >
                <Feather
                  name="share-2"
                  size={18}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Feather
                  name="log-out"
                  size={18}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.userName}>{user.name || "Eco Supporter"}</Text>
          <Text style={styles.userMeta}>
            {user.isGoogleUser ? "Google Account" : user.usn || "No USN Found"}{" "}
            · {user.email}
          </Text>

          {/* Level & Points */}
          <View style={styles.pointsRow}>
            <View style={styles.pointsBig}>
              <Text style={styles.pointsValue}>
                {(user.points || 0).toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>points</Text>
            </View>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: "rgba(255,255,255,0.18)" },
              ]}
            >
              <Text style={styles.levelText}>
  Lv.{user.level || 1}
</Text>
            </View>
            <View
              style={[
                styles.titleBadge,
                { backgroundColor: "rgba(108,99,255,0.35)" },
              ]}
            >
            <Text style={styles.titleText}>
  {user.levelTitle || "Newbie"}
</Text>
            </View>
            {(user.streak || 0) > 0 && (
              <View
                style={[
                  styles.streakBadge,
                  { backgroundColor: "rgba(255,165,0,0.25)" },
                ]}
              >
                <Feather name="zap" size={13} color="#FFB300" />
                <Text style={styles.streakText}>{user.streak}d</Text>
              </View>
            )}
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(user.levelProgressPercent || 0)}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
           <Text style={styles.progressLabel}>
  Lv.{user.level || 1}
</Text>
            <Text style={styles.progressLabel}>
              {Math.max(
  0,
  (user.nextLevelPoints || 200) - (user.points || 0),
).toLocaleString()} pts to Lv.{(user.level || 1) + 1}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard
            icon="star"
            value={(user.points || 0).toLocaleString()}
            label="Total Points"
          />
          <StatCard
            icon="activity"
            value={activityPoints.toLocaleString()}
            label="Activity Points"
            accent={colors.accent}
          />
          {/* 🌟 FIXED: Safe native fallback check added directly right here */}
          <StatCard
            icon="refresh-cw"
            value={
              user.totalSessions !== undefined && user.totalSessions !== null
                ? user.totalSessions.toString()
                : "0"
            }
            label="Sessions"
          />
          <StatCard
            icon="wind"
            value={`${(user.carbonReduced || 0).toFixed(2)} kg`}
            label="CO2 Saved"
            accent="#22C55E"
          />
        </View>

        {/* Badges */}
        {backendBadges.some(
  (badge) => badge.unlocked
) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Badges
              </Text>
              <Text
  style={[
    styles.sectionCount,
    {
      color:
        colors.mutedForeground,
    },
  ]}
>
  {
    backendBadges.filter(
      (badge) =>
        badge.unlocked
    ).length
  }
  /
  {backendBadges.length}
</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
             {backendBadges
  .filter((badge) => badge.unlocked)
  .map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                 <View
  style={[
    styles.badgeIcon,
    {
      backgroundColor:
        "#22C55E22",
    },
  ]}
>
                    <Feather
  name={
    (({
      leaf: "tag",
      water: "droplet",
      trophy: "award",
      star: "star",
      award: "award",
    } as Record<string, React.ComponentProps<typeof Feather>["name"]>)[badge.icon]) || "award"
  }
  size={20}
  color="#22C55E"
/>
                  </View>
                  <Text
                    style={[styles.badgeName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {badge.title}
                  </Text>
                  <Text
                    style={[
                      styles.badgeDesc,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Locked badges preview */}
       {backendBadges.some(
  (badge) => !badge.unlocked
) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Locked Achievements
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {backendBadges
  .filter(
    (badge) =>
      !badge.unlocked
  )
                .slice(0, 5)
                .map((badge) => (
                  <View
                    key={badge.id}
                    style={[
                      styles.badgeCard,
                      styles.badgeCardLocked,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeIcon,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Feather
                        name="lock"
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </View>
                    <Text
                      style={[
                        styles.badgeName,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {badge.title}
                    </Text>
                    <Text
                      style={[
                        styles.badgeDesc,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={2}
                    >
                      {badge.description}
                    </Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Activity */}
        {safeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Recycling
            </Text>
            {safeSessions.slice(0, 10).map((s) => (
              <SessionItem
                key={s?.id || Math.random().toString()}
                session={s}
              />
            ))}
          </View>
        )}

        {safeSessions.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No recycling sessions yet. Tap Scan to get started!
            </Text>
          </View>
        )}

        <RecyclingHeatmap sessions={safeSessions} />
      </ScrollView>

      <ShareCard
        visible={showShare}
        onClose={() => setShowShare(false)}
        name={user.name || "Student"}
        usn={user.usn || "N/A"}
        points={user.points || 0}
        rank={userRank}
        streak={user.streak || 0}
        totalSessions={user.totalSessions || 0}
        carbonReduced={user.carbonReduced || 0}
        badges={
  backendBadges
    .filter((b) => b.unlocked)
    .map((b) => b.id)
}
      />
    </React.Fragment>
  );
}

// Stylesheet configurations remain untouched and valid
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 8 },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarLgImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 26,
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
  },
  googleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  googleBadgeG: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
  },
  logoutBtn: { padding: 8 },
  userName: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    color: "#FFFFFF",
  },
  userMeta: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    marginBottom: 14,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  pointsBig: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginRight: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontFamily: "Outfit_800ExtraBold",
    color: "#FFFFFF",
  },
  pointsLabel: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
  },
  titleBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakText: {
    color: "#FFB300",
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  statVal: {
    fontSize: 22,
    fontFamily: "Outfit_700Bold",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  badgesRow: {
    gap: 12,
    paddingBottom: 4,
  },
  badgeCard: {
    width: 130,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  badgeCardLocked: { opacity: 0.55 },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
  },
  badgeDesc: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: { flex: 1 },
  sessionType: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    marginTop: 2,
  },
  sessionRight: { alignItems: "flex-end" },
  sessionPts: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  sessionPtsLabel: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
