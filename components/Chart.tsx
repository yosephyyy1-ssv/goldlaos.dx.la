"use client";
// กราฟเส้น SVG น้ำหนักเบา พร้อม gradient และ tooltip ตามตำแหน่งเมาส์/นิ้ว
import { useMemo, useRef, useState } from "react";
import { fmtLak } from "@/lib/format";

type Point = { t: number; v: number };

export default function Chart({ points, range }: { points: Point[]; range: string }) {
  const W = 800, H = 260, PAD = 8;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { path, area, min, max, xy } = useMemo(() => {
    if (points.length < 2) return { path: "", area: "", min: 0, max: 0, xy: [] as [number, number][] };
    const vs = points.map((p) => p.v);
    const min = Math.min(...vs), max = Math.max(...vs);
    const span = max - min || 1;
    const xy: [number, number][] = points.map((p, i) => [
      PAD + (i / (points.length - 1)) * (W - PAD * 2),
      H - PAD - ((p.v - min) / span) * (H - PAD * 2 - 20),
    ]);
    const path = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
    const area = `${path}L${xy[xy.length - 1][0]},${H}L${xy[0][0]},${H}Z`;
    return { path, area, min, max, xy };
  }, [points]);

  const up = points.length > 1 && points[points.length - 1].v >= points[0].v;
  const color = up ? "#34d399" : "#f87171";

  function onMove(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || points.length < 2) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD) / (W - PAD * 2)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  const fmtT = (t: number) => {
    const d = new Date(t);
    return range === "1d"
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-48 lg:h-64 touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#1f2a3d" strokeDasharray="4 6" />
        ))}
        <path d={area} fill="url(#area)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {hover !== null && xy[hover] && (
          <g>
            <line x1={xy[hover][0]} x2={xy[hover][0]} y1={0} y2={H} stroke="#8294ab" strokeDasharray="3 4" />
            <circle cx={xy[hover][0]} cy={xy[hover][1]} r="5" fill={color} stroke="#0a0e1a" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && points[hover] && (
        <div className="absolute top-1 left-2 card px-3 py-1.5 text-xs">
          <span className="text-mute mr-2">{fmtT(points[hover].t)}</span>
          <span className="font-bold" style={{ color }}>{fmtLak(points[hover].v)} ₭</span>
        </div>
      )}
      <div className="flex justify-between text-[10px] text-mute px-1 mt-1">
        <span>{points.length ? fmtT(points[0].t) : ""}</span>
        <span>ຕ່ຳສຸດ {fmtLak(min)} · ສູງສຸດ {fmtLak(max)}</span>
        <span>{points.length ? fmtT(points[points.length - 1].t) : ""}</span>
      </div>
    </div>
  );
}
