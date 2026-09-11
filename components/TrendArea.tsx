"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/data/types";
import { fmtUSD } from "@/lib/format";

// valueFormat is a serializable flag (not a function) so a Server Component
// can render this Client Component without passing a callback across the boundary.
export default function TrendArea({
  data,
  color = "var(--primary)",
  height = 56,
  valueFormat = "raw",
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  valueFormat?: "usd" | "raw";
}) {
  const gid = useId().replace(/:/g, "");
  const fmt = (n: number) => (valueFormat === "usd" ? fmtUSD(n, true) : String(n));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          cursor={{ stroke: "var(--line)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--ink)",
          }}
          labelStyle={{ color: "var(--muted)" }}
          formatter={(value) => [fmt(Number(value)), ""]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gid})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
