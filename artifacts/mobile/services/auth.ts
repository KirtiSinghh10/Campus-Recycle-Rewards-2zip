// mobile/services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from './api';

export interface RegisterData {
  name: string;
  email: string;
  usn: string; // 🌟 FIXED: Added usn to the request type interface
  password?: string;
}

export interface LoginData {
  email: string;
  password?: string;
}

// REPLACE the existing AuthResponse interface with this:
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    points: number;
    level: number;
    levelTitle: string;
    levelProgressPercent: number;
    nextLevelPoints: number;
    avatarUrl?: string;
    usn?: string;
    role?: string;
  };
}

// 🌟 Cross-platform storage key helper variables
const TOKEN_KEY = 'user_token';
const PROFILE_KEY = 'user_profile';

export const authService = {
  /**
   * Smart Registration - Auto-resolves /api/ prefix mismatches
   */
  register: async (data: RegisterData): Promise<void> => {
    try {
      // Try with /api prefix (since BASE_URL in api.ts ends with /api)
      await api.post('/auth/register', data);
    } catch (error: any) {
      // If server returns a 404, it means the backend controllers don't use /api/
      if (error.response?.status === 404) {
        console.warn("Got 404 on /api/auth/register. Retrying without global prefix...");

        // Use full path to override the default baseURL configuration
        const rawBaseUrl = api.defaults.baseURL?.replace('/api', '') || '';
        await api.post(`${rawBaseUrl}/auth/register`, data);
        return;
      }
      throw error;
    }
  },

  /**
   * Smart Login - Auto-resolves /api/ prefix mismatches
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);

      if (response.data && response.data.token) {
        await authService._saveSession(response.data.token, response.data.user);
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn("Got 404 on /api/auth/login. Retrying without global prefix...");

        const rawBaseUrl = api.defaults.baseURL?.replace('/api', '') || '';
        const fallbackResponse = await api.post<AuthResponse>(`${rawBaseUrl}/auth/login`, data);

        if (fallbackResponse.data && fallbackResponse.data.token) {
          await authService._saveSession(fallbackResponse.data.token, fallbackResponse.data.user);
        }
        return fallbackResponse.data;
      }
      throw error;
    }
  },

  /**
   * Pulls profile data, auto-handling prefix stripping if necessary
   */
  getCurrentUser: async (): Promise<AuthResponse['user']> => {
    try {
      const response = await api.get<AuthResponse['user']>('/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        const rawBaseUrl = api.defaults.baseURL?.replace('/api', '') || '';
        const fallback = await api.get<AuthResponse['user']>(`${rawBaseUrl}/auth/me`);
        return fallback.data;
      }
      throw error;
    }
  },

  /**
   * Native-Safe Session Token Wipe
   */
  logout: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
        window.location.reload();
      }
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(PROFILE_KEY);
    }
  },

  /**
   * Platform-agnostic Authentication Token Check
   */
  isAuthenticated: async (): Promise<boolean> => {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        return !!localStorage.getItem(TOKEN_KEY);
      }
      return false;
    }

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  } catch {
    return false;
  }
},
  /**
   * Internal Helper to handle persistent key storage across Native Mobile and Web safely
   */
  _saveSession: async (token: string, user: AuthResponse['user']): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
      }
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    }
  }
};