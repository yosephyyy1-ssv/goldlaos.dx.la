import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { api, setToken } from "../api";
import { C } from "../theme";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+8562055551234");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true); setError(null);
    try {
      const d = await api<{ demoHint?: string }>("/api/auth/request-otp", {
        method: "POST", body: { phone },
      });
      setHint(d.demoHint ?? null);
      setStep("otp");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function verify() {
    setBusy(true); setError(null);
    try {
      const d = await api<{ token: string }>("/api/auth/verify", {
        method: "POST", body: { phone, code },
      });
      setToken(d.token);
      onLogin();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={s.logo}>🏆</Text>
      <Text style={s.title}>GoldSave Laos</Text>
      <Text style={s.sub}>ອອມຄຳງ່າຍໆ ເລີ່ມຕົ້ນພຽງ 10,000 ກີບ</Text>

      <View style={s.card}>
        {step === "phone" ? (
          <>
            <Text style={s.label}>ເບີໂທລະສັບ</Text>
            <TextInput
              style={s.input} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" placeholderTextColor={C.mute}
            />
            <TouchableOpacity style={s.btn} onPress={sendOtp} disabled={busy}>
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>ສົ່ງລະຫັດ OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {hint && (
              <View style={s.hintBox}>
                <Text style={s.hintLabel}>Demo OTP</Text>
                <Text style={s.hintCode}>{hint}</Text>
              </View>
            )}
            <Text style={s.label}>ໃສ່ລະຫັດ OTP 6 ຫຼັກ</Text>
            <TextInput
              style={[s.input, s.otp]} value={code} onChangeText={setCode}
              keyboardType="number-pad" maxLength={6} placeholder="••••••"
              placeholderTextColor={C.mute}
            />
            <TouchableOpacity style={s.btn} onPress={verify} disabled={busy || code.length !== 6}>
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>ຢືນຢັນ</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("phone")}>
              <Text style={s.link}>← ປ່ຽນເບີໂທ</Text>
            </TouchableOpacity>
          </>
        )}
        {error && <Text style={s.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 24 },
  logo: { fontSize: 56, textAlign: "center" },
  title: { fontSize: 28, fontWeight: "800", color: C.gold, textAlign: "center", marginTop: 8 },
  sub: { color: C.mute, textAlign: "center", marginTop: 4, marginBottom: 28, fontSize: 13 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 20 },
  label: { color: C.mute, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#0d1320", borderWidth: 1, borderColor: C.line, borderRadius: 12,
    color: C.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: "600",
  },
  otp: { textAlign: "center", letterSpacing: 12, fontSize: 24 },
  btn: {
    backgroundColor: C.gold, borderRadius: 12, paddingVertical: 15,
    alignItems: "center", marginTop: 14,
  },
  btnText: { fontWeight: "800", fontSize: 15, color: "#1a1303" },
  link: { color: C.mute, textAlign: "center", marginTop: 14, fontSize: 13 },
  hintBox: {
    borderWidth: 1, borderColor: C.gold, backgroundColor: "rgba(245,197,66,0.1)",
    borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 14,
  },
  hintLabel: { color: C.mute, fontSize: 10 },
  hintCode: { color: C.gold, fontSize: 26, fontWeight: "800", letterSpacing: 8 },
  error: { color: C.down, marginTop: 12, fontSize: 13, textAlign: "center" },
});
