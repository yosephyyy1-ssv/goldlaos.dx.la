import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { api } from "../api";
import { C, fmtGram, fmtLak } from "../theme";

type Prices = { sellLakPerGram: number; buyLakPerGram: number };

export default function TradeScreen() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [prices, setPrices] = useState<Prices | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Prices>("/api/prices").then(setPrices).catch(() => {});
    const id = setInterval(() => api<Prices>("/api/prices").then(setPrices).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  const n = parseFloat(amount) || 0;
  const receive = prices
    ? side === "buy"
      ? `${fmtGram(Math.floor((n / prices.sellLakPerGram) * 10000) / 10000)} g`
      : `₭ ${fmtLak(Math.floor(n * prices.buyLakPerGram))}`
    : "…";

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      const body = side === "buy" ? { side, lak: n } : { side, gram: n };
      await api("/api/trade", { method: "POST", body });
      setMsg({ ok: true, text: "ສຳເລັດແລ້ວ!" });
      setAmount("");
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.root}>
      <View style={s.tabs}>
        {(["buy", "sell"] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, side === t && (t === "buy" ? s.tabBuy : s.tabSell)]}
            onPress={() => { setSide(t); setAmount(""); setMsg(null); }}>
            <Text style={[s.tabText, side === t && { color: t === "buy" ? C.up : C.down }]}>
              {t === "buy" ? "ຊື້ / ອອມຄຳ" : "ຂາຍຄືນ"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.mute}>ລາຄາຕອນນີ້</Text>
        <Text style={[s.price, { color: side === "buy" ? C.up : C.down }]}>
          ₭ {prices ? fmtLak(side === "buy" ? prices.sellLakPerGram : prices.buyLakPerGram) : "…"}/g
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.mute}>{side === "buy" ? "ຈຳນວນເງິນ (ກີບ)" : "ຈຳນວນຄຳ (ກຣາມ)"}</Text>
        <TextInput
          style={s.input} value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" placeholder={side === "buy" ? "10,000" : "0.0001"}
          placeholderTextColor={C.mute}
        />
        <View style={s.receiveRow}>
          <Text style={s.mute}>ທ່ານຈະໄດ້ຮັບ</Text>
          <Text style={s.receive}>{receive}</Text>
        </View>
      </View>

      {msg && (
        <Text style={[s.msg, { color: msg.ok ? C.up : C.down }]}>{msg.text}</Text>
      )}

      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy || n <= 0}>
        <Text style={s.btnText}>{side === "buy" ? "ຢືນຢັນການຊື້" : "ຢືນຢັນການຂາຍ"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 16 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tab: {
    flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
    borderColor: C.line, alignItems: "center",
  },
  tabBuy: { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.4)" },
  tabSell: { backgroundColor: "rgba(248,113,113,0.12)", borderColor: "rgba(248,113,113,0.4)" },
  tabText: { color: C.mute, fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
    padding: 16, marginBottom: 12,
  },
  mute: { color: C.mute, fontSize: 12 },
  price: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  input: {
    backgroundColor: "#0d1320", borderWidth: 1, borderColor: C.line, borderRadius: 12,
    color: C.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22,
    fontWeight: "700", marginTop: 8,
  },
  receiveRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line,
  },
  receive: { color: C.gold, fontSize: 20, fontWeight: "800" },
  msg: { textAlign: "center", marginBottom: 10, fontWeight: "600" },
  btn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  btnText: { fontWeight: "800", fontSize: 15, color: "#1a1303" },
});
