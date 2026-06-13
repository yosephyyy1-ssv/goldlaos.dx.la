export const C = {
  bg: "#0a0e1a",
  card: "#131b2b",
  line: "#1f2a3d",
  gold: "#f5c542",
  gold2: "#d4a017",
  up: "#34d399",
  down: "#f87171",
  mute: "#8294ab",
  text: "#e7edf5",
};

export const fmtLak = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const fmtGram = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
