import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const MOCK_GOOGLE_PROFILES = [
  { name: "Alex Johnson", email: "alex.j@gmail.com" },
  { name: "Sam Rivera", email: "sam.r@gmail.com" },
  { name: "Jordan Lee", email: "jordan.l@gmail.com" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, googleLogin } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError("fill in both fields first.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "login failed. try again?");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    await new Promise((r) => setTimeout(r, 1600));
    const profile = MOCK_GOOGLE_PROFILES[Math.floor(Math.random() * MOCK_GOOGLE_PROFILES.length)];
    const nameParts = profile.name.split(" ");
    const picUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameParts.join("+"))}&background=6C63FF&color=fff&size=128&bold=true`;
    const result = await googleLogin(profile.name, profile.email, picUrl);
    setGoogleLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Google sign-in failed.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#09090B", "#1E1B4B"]}
        style={[styles.header, { paddingTop: insets.top + 28 }]}
      >
        <View style={styles.logoMark}>
          <Text style={styles.logoEmoji}>♻</Text>
        </View>
        <Text style={styles.appName}>binGO</Text>
        <Text style={styles.tagline}>welcome back 👋</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.formContainer,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            sign in
          </Text>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <>
                <View style={styles.googleIconWrap}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or sign in with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>email</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="yourname@bmsce.ac.in"
              placeholderTextColor={colors.mutedForeground}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.input }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="your password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              new here?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                create account →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.25)",
  },
  logoEmoji: { fontSize: 34 },
  appName: {
    fontSize: 44,
    fontFamily: "Outfit_800ExtraBold",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },
  formContainer: { paddingHorizontal: 28, paddingTop: 32 },
  formTitle: {
    fontSize: 30,
    fontFamily: "Outfit_700Bold",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    flex: 1,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    minHeight: 56,
  },
  googleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  label: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 8,
    marginTop: 6,
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
});
