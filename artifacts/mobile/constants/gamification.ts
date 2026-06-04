export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  {
    id: "first_recycle",
    name: "First Step",
    description: "Completed your first recycling session",
    icon: "star",
    color: "#FFB300",
  },
  {
    id: "ten_items",
    name: "Getting Warmed Up",
    description: "Recycled 10 items total",
    icon: "award",
    color: "#43A047",
  },
  {
    id: "fifty_items",
    name: "Green Warrior",
    description: "Recycled 50 items total",
    icon: "shield",
    color: "#1E88E5",
  },
  {
    id: "hundred_items",
    name: "Eco Champion",
    description: "Recycled 100 items total",
    icon: "zap",
    color: "#8E24AA",
  },
  {
    id: "week_streak",
    name: "7-Day Streak",
    description: "Recycled 7 days in a row",
    icon: "trending-up",
    color: "#E53935",
  },
  {
    id: "month_streak",
    name: "Consistency King",
    description: "Recycled 30 days in a row",
    icon: "clock",
    color: "#F4511E",
  },
  {
    id: "points_1k",
    name: "1K Club",
    description: "Earned 1,000 binGO points",
    icon: "activity",
    color: "#00ACC1",
  },
  {
    id: "points_5k",
    name: "Elite Recycler",
    description: "Earned 5,000 binGO points",
    icon: "target",
    color: "#FFB300",
  },
  {
    id: "combo_master",
    name: "Combo Master",
    description: "Recycled 10+ items in a single session",
    icon: "layers",
    color: "#FB8C00",
  },
  {
    id: "can_king",
    name: "Can King",
    description: "Recycled 25 cans total",
    icon: "box",
    color: "#6D4C41",
  },
  {
    id: "bottle_boss",
    name: "Bottle Boss",
    description: "Recycled 25 bottles total",
    icon: "droplet",
    color: "#1565C0",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Recycled before 9 AM",
    icon: "sunrise",
    color: "#FFD54F",
  },
  {
    id: "campus_hero",
    name: "Campus Hero",
    description: "Reached the Top 3 on the leaderboard",
    icon: "flag",
    color: "#43A047",
  },
];

const LEVEL_THRESHOLDS = [
  0, 200, 500, 1000, 2000, 3500, 5000, 8000, 12000, 20000,
];
const LEVEL_TITLES = [
  "Newbie",
  "Starter",
  "Recycler",
  "Green Buddy",
  "Eco Warrior",
  "Earth Guardian",
  "Planet Protector",
  "Green Legend",
  "Eco Master",
  "binGO Champion",
];

export function getLevelInfo(points: number): {
  level: number;
  title: string;
  nextLevelPoints: number;
  currentLevelPoints: number;
  progress: number;
} {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  const isMax = level >= LEVEL_THRESHOLDS.length - 1;
  const currentLevelPoints = LEVEL_THRESHOLDS[level];
  const nextLevelPoints = isMax
    ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
    : LEVEL_THRESHOLDS[level + 1];
  const progress = isMax
    ? 1
    : (points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints);

  return {
    level: level + 1,
    title: LEVEL_TITLES[level],
    nextLevelPoints,
    currentLevelPoints,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

export interface MultiplierResult {
  total: number;
  breakdown: { label: string; value: number; color: string }[];
}

export function getMultiplier(streak: number, quantity: number): MultiplierResult {
  const breakdown: { label: string; value: number; color: string }[] = [];
  let total = 1;

  if (streak >= 14) {
    breakdown.push({ label: "14-day streak", value: 2, color: "#E53935" });
    total *= 2;
  } else if (streak >= 7) {
    breakdown.push({ label: "7-day streak", value: 1.5, color: "#F4511E" });
    total *= 1.5;
  } else if (streak >= 3) {
    breakdown.push({ label: "3-day streak", value: 1.2, color: "#FB8C00" });
    total *= 1.2;
  }

  const hour = new Date().getHours();
  if (hour >= 12 && hour < 14) {
    breakdown.push({ label: "Lunch Hour", value: 1.3, color: "#FFB300" });
    total *= 1.3;
  }

  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    breakdown.push({ label: "Weekend Bonus", value: 1.25, color: "#8E24AA" });
    total *= 1.25;
  }

  if (quantity >= 5) {
    breakdown.push({ label: "Combo Bonus", value: 1.5, color: "#00ACC1" });
    total *= 1.5;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}

export interface DailyChallengeTemplate {
  id: string;
  type: "cans" | "bottles" | "points" | "session" | "any";
  target: number;
  bonusPoints: number;
  description: string;
  emoji: string;
}

export const DAILY_CHALLENGES: DailyChallengeTemplate[] = [
  {
    id: "session_1",
    type: "session",
    target: 1,
    bonusPoints: 20,
    description: "Complete any recycling session",
    emoji: "♻",
  },
  {
    id: "cans_3",
    type: "cans",
    target: 3,
    bonusPoints: 30,
    description: "Recycle 3 cans today",
    emoji: "🥤",
  },
  {
    id: "bottles_2",
    type: "bottles",
    target: 2,
    bonusPoints: 30,
    description: "Recycle 2 bottles today",
    emoji: "💧",
  },
  {
    id: "cans_5",
    type: "cans",
    target: 5,
    bonusPoints: 50,
    description: "Recycle 5 cans today",
    emoji: "🎯",
  },
  {
    id: "bottles_3",
    type: "bottles",
    target: 3,
    bonusPoints: 45,
    description: "Recycle 3 bottles today",
    emoji: "💧",
  },
  {
    id: "any_7",
    type: "any",
    target: 7,
    bonusPoints: 70,
    description: "Recycle 7 items in total",
    emoji: "🏆",
  },
  {
    id: "any_10",
    type: "any",
    target: 10,
    bonusPoints: 100,
    description: "Recycle 10 items — big day!",
    emoji: "🌟",
  },
];

export function getTodaysChallenge(): DailyChallengeTemplate {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

export function computeChallengeProgress(
  challenge: DailyChallengeTemplate,
  todaySessions: { itemType: "can" | "bottle"; quantity: number; pointsEarned: number }[]
): number {
  switch (challenge.type) {
    case "cans":
      return todaySessions
        .filter((s) => s.itemType === "can")
        .reduce((sum, s) => sum + s.quantity, 0);
    case "bottles":
      return todaySessions
        .filter((s) => s.itemType === "bottle")
        .reduce((sum, s) => sum + s.quantity, 0);
    case "any":
      return todaySessions.reduce((sum, s) => sum + s.quantity, 0);
    case "session":
      return todaySessions.length;
    case "points":
      return todaySessions.reduce((sum, s) => sum + s.pointsEarned, 0);
    default:
      return 0;
  }
}

export const POINTS_PER_CAN = 10;
export const POINTS_PER_BOTTLE = 10;
export const CO2_PER_CAN = 0.08;
export const CO2_PER_BOTTLE = 0.12;
