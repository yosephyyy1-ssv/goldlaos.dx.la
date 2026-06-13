import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { C, fmtGram, fmtLak } from "../theme";

type Tx = {
  id: string; type: string; lak: number; gram: number;
  status: string; createdAt: string;
};
type Me = { user: { lakBalance: number; goldGram: number }; txs: Tx[] };

const TX_LABEL: Record<string, string> = {
  buy: "ຊື້ຄຳ", sell: "ຂາຍຄຳ", deposit: "ເຕີມເງິນ",
  withdraw_cash: "ຖອນເງິນສົດ", withdraw_gold: "ຖອນຄຳແທ່ງ",
};

export default function WalletScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => api<Me>("/api/me").then(setMe).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      style={s.root}
      data={me?.txs ?? []}
      keyExtractor={(t) => t.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.gold}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
      }
      ListHeaderComponent={
        <View style={s.balances}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.mute}>ກະເປົາເງິນກີບ</Text>
            <Text style={s.balance}>₭ {me ? fmtLak(me.user.lakBalance) : "—"}</Text>
          </View>
          <View style={[s.card, { flex: 1, borderColor: "rgba(245,197,66,0.4)" }]}>
            <Text style={s.mute}>ກະເປົາຄຳ</Text>
            <Text style={[s.balance, { color: C.gold }]}>
              {me ? fmtGram(me.user.goldGram) : "—"} g
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.tx}>
          <View style={{ flex: 1 }}>
            <Text style={s.txType}>{TX_LABEL[item.type] ?? item.type}</Text>
            <Text style={s.mute}>{new Date(item.createdAt).toLocaleString("en-GB")}</Text>
          </View>
          <Text style={s.txAmount}>
            {item.gram > 0 ? `${fmtGram(item.gram)} g` : `₭ ${fmtLak(item.lak)}`}
          </Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 16 },
  balances: { flexDirection: "row", gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14,
  },
  mute: { color: C.mute, fontSize: 11 },
  balance: { color: C.text, fontSize: 18, fontWeight: "800", marginTop: 4 },
  tx: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 8,
  },
  txType: { color: C.text, fontWeight: "600", fontSize: 14 },
  txAmount: { color: C.text, fontWeight: "800", fontSize: 14 },
});
