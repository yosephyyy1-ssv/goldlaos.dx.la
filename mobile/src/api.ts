// REST client — ใช้ API เดียวกับเว็บ 100%
// Android Emulator: http://10.0.2.2:3000 · iOS Simulator: http://localhost:3000
// เครื่องจริง: ใส่ IP ของเครื่องที่รัน server เช่น http://192.168.1.10:3000
import { Platform } from "react-native";

export const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

let token: string | null = null;
export function setToken(t: string | null) { token = t; }
export function getToken() { return token; }

export async function api<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}
