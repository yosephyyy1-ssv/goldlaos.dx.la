import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import TradeScreen from "./src/screens/TradeScreen";
import WalletScreen from "./src/screens/WalletScreen";
import { C } from "./src/theme";

const TABS = [
  { key: "home", label: "ໜ້າຫຼັກ", icon: "🏠" },
  { key: "trade", label: "ຊື້/ຂາຍ", icon: "📈" },
  { key: "wallet", label: "ກະເປົາ", icon: "💰" },
] as const;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("home");

  if (!loggedIn) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      </>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text style={s.headerTitle}>GoldSave Laos</Text>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "home" && <DashboardScreen />}
        {tab === "trade" && <TradeScreen />}
        {tab === "wallet" && <WalletScreen />}
      </View>
      <View style={s.tabBar}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.key} style={s.tabItem} onPress={() => setTab(item.key)}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={[s.tabLabel, tab === item.key && { color: C.gold }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  headerTitle: { color: C.gold, fontWeight: "800", fontSize: 18 },
  tabBar: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line,
    backgroundColor: C.bg, paddingBottom: 4,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabLabel: { color: C.mute, fontSize: 10, marginTop: 2, fontWeight: "600" },
});
