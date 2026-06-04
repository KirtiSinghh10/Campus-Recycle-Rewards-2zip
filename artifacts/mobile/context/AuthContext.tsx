import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { api } from "@/services/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService } from "@/services/auth";

export interface RecyclingSession {
  id: string;
  itemType: "can" | "bottle";
  quantity: number;
  pointsEarned: number;
  carbonReduced: number;
  timestamp: string;
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  usn: string;
  points: number;
  totalSessions: number;
  carbonReduced: number;
  streak: number;
  lastSessionDate: string | null;
  badges: string[];
  joinedAt: string;
  level?: number;
  levelTitle?: string;
  levelProgressPercent?: number;
  nextLevelPoints?: number;
  sessions: RecyclingSession[];
}

export interface SessionResult {
  pointsEarned: number;
  basePoints: number;
  multiplier: number;
  carbonReduced: number;
  newBadges: string[];
  leveledUp: boolean;
  newLevel: number;
  newTitle: string;
  challengeCompleted: boolean;
  challengeBonus: number;
}

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (
    name: string,
    email: string,
    profilePicture?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    usn: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  addRecyclingSession: (
    itemType: "can" | "bottle",
    quantity: number,
  ) => Promise<SessionResult>;
  deductPoints: (amount: number) => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const KEYS = {
  HAS_SEEN_ONBOARDING: "@bingo:hasSeenOnboarding",
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync session check on app initial mounting
  useEffect(() => {
    async function init() {
      try {
        const seen = await AsyncStorage.getItem(KEYS.HAS_SEEN_ONBOARDING);
        setHasSeenOnboarding(seen === "true");

        // Use the native-safe authentication state check
        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          try {
            const profileRes = await api.get("/users/me");

setUser({
  ...profileRes.data,
  sessions: profileRes.data.sessions || [],
  badges: profileRes.data.badges || [],
} as User);
          } catch (apiError) {
            console.warn(
              "Session token expired or backend unreachable. Logging out cleanly.",
            );
            await authService.logout();
          }
        }
      } catch (e) {
        console.error("Failed to initialize Auth session context", e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(KEYS.HAS_SEEN_ONBOARDING, "true");
    setHasSeenOnboarding(true);
  };

  /**
   * Real production login passing credentials to Spring Boot
   */
  const login = async (
    identifier: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.login({
        email: identifier.toLowerCase().trim(),
        password: password,
      });

      // 🌟 FIXED: Apply collection fallbacks on active authentication responses too
     if (response?.user) {
  const profileRes = await api.get("/users/me");

  setUser({
    ...profileRes.data,
    sessions: profileRes.data.sessions || [],
    badges: profileRes.data.badges || [],
  } as User);
}

      return { success: true };
    } catch (error: any) {
      console.error("Login endpoint failed:", error);

      if (error.message === "Network Error") {
        return {
          success: false,
          error:
            "CORS Block or Server Offline. Please verify Spring Boot allowedOrigins.",
        };
      }

      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Invalid email or password combination.",
      };
    }
  };

  /**
   * Signup function pointing directly to the /auth/register backend endpoint
   */
  const signup = async (
    name: string,
    email: string,
    usn: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const emailLower = email.toLowerCase().trim();
    const usnUpper = usn.toUpperCase().trim();

    if (!emailLower.endsWith("@bmsce.ac.in")) {
      return {
        success: false,
        error: "Only @bmsce.ac.in student email addresses are allowed.",
      };
    }

    try {
      // 1. Submit registration request with ALL required fields
      await authService.register({
        name: name.trim(),
        email: emailLower,
        password: password,
        usn: usnUpper,
      });

      // 2. Automatically sign user into a new session upon successful registration
      return await login(emailLower, password);
    } catch (error: any) {
      console.error("Registration endpoint failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Registration failed. Email/USN may already be taken.",
      };
    }
  };

  const googleLogin = async (
    name: string,
    email: string,
    profilePicture?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // Left as stub fallback since backend uses a direct standard manual strategy
    return {
      success: false,
      error: "Google sign-in is not supported on this platform.",
    };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const addRecyclingSession = async (
    itemType: "can" | "bottle",
    quantity: number,
  ): Promise<SessionResult> => {
    if (!user) throw new Error("Not logged in");

    return {
      pointsEarned: 10,
      basePoints: 10,
      multiplier: 1,
      carbonReduced: 0.1,
      newBadges: [],
      leveledUp: false,
      newLevel: user.level || 1,
      newTitle: user.levelTitle || "Green Scout",
      challengeCompleted: false,
      challengeBonus: 0,
    };
  };

  const deductPoints = async (amount: number): Promise<void> => {
    if (!user) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

const refreshUser = useCallback(async () => {
  try {
    const profileRes = await api.get("/users/me");
    setUser({
      ...profileRes.data,
      sessions: profileRes.data.sessions || [],
      badges: profileRes.data.badges || [],
    } as User);
  } catch (error) {
    console.error("Failed to refresh user profile:", error);
  }
}, []);

const refreshLeaderboard = useCallback(async () => {
  try {
    const response = await api.get("/users/leaderboard");
    if (response.data) {
      const processedUsers = response.data.map((u: any) => ({
        ...u,
        sessions: [],
        badges: u.badges || [],
      }));
      setAllUsers(processedUsers);
    }
  } catch (error) {
    console.error("Failed to sync leaderboard:", error);
  }
}, []);

useEffect(() => {
  if (user) {
    refreshLeaderboard();
  }
}, [user, refreshLeaderboard]);

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        hasSeenOnboarding,
        isLoading,
        completeOnboarding,
        login,
        googleLogin,
        signup,
        logout,
        addRecyclingSession,
        deductPoints,
        refreshLeaderboard,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
