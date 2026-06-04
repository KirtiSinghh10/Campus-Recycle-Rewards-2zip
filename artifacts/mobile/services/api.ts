// mobile/services/api.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "user_token";

export const api = axios.create({
  // Points cleanly to your active Spring Boot backend instance
  baseURL: "https://campus-rewards--vermajahnavi06.replit.app/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 🌟 NATIVE-SAFE INTERCEPTOR:
 * Securely extracts local state variable markers across physical device runs
 * without exposing raw web browser layout tokens.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      let token: string | null = null;

      if (Platform.OS === "web") {
        token =
          typeof window !== "undefined"
            ? localStorage.getItem(TOKEN_KEY)
            : null;
      } else {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (storageError) {
      console.warn(
        "Could not append authorization header tokens to request payload context:",
        storageError,
      );
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
