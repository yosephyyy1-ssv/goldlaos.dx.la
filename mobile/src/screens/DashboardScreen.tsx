import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { C, fmtGram, fmtLak } from "../theme";

type Prices = {
  xauUsd: number; usdLak: number;
  sellLakPerGram: number; buyLakPerGram: number;
  markupPct: number; buybackDiscountPct: number;
};
type Me = { user: { name: string; lakBalance: number; goldGram: number } };

export default function DashboardScreen() {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [p, m] = await Promise.all([api<Prices>("/api/prices"), api<Me>("/api/me")]);
      setPrices(p); setMe(m);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(() => api<Prices>("/api/prices").then(setPrices).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  const holding = me && prices ? me.user.goldGram * prices.buyLakPerGram : 0;

  return (
    <ScrollView
      style={s.root}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.gold}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
      }
    >
      <View style={[s.card, s.hero]}>
        <Text style={s.muteSm}>ຄຳທີ່ທ່ານຖືຄອງ</Text>
        <Text style={s.heroValue}>{me ? fmtGram(me.user.goldGram) : "—"} g</Text>
        <Text style={s.muteSm}>ມູນຄ່າ ₭ {fmtLak(holding)}</Text>
      </View>

      <Row label="ລາຄາຄຳໂລກ (XAU/USD)" value={prices ? `$ ${prices.xauUsd.toFixed(2)}` : "…"} />
      <Row label="ອັດຕາແລກປ່ຽນ USD/LAK" value={prices ? `₭ ${fmtLak(prices.usdLak)}` : "…"} />
      <Row label={`ລາຄາຂາຍ (+${prices?.markupPct ?? "…"}%)`}
        value={prices ? `₭ ${fmtLak(prices.sellLakPerGram)}/g` : "…"} color={C.up} />
      <Row label={`ລາຄາຮັບຊື້ຄືນ (−${prices?.buybackDiscountPct ?? "…"}%)`}
        value={prices ? `₭ ${fmtLak(prices.buyLakPerGram)}/g` : "…"} color={C.down} />
    </ScrollView>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.card}>
      <Text style={s.muteSm}>{label}</Text>
      <Text style={[s.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 16 },
  card: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
    padding: 16, marginBottom: 12,
  },
  hero: { borderColor: "rgba(245,197,66,0.4)", alignItems: "center", paddingVertical: 24 },
  heroValue: { color: C.gold, fontSize: 40, fontWeight: "800", marginVertical: 6 },
  muteSm: { color: C.mute, fontSize: 12 },
  value: { color: C.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
});
