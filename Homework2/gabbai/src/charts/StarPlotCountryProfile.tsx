import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { CountryProfile } from "../data/loadParis2024";
import { useResizeObserver } from "../hooks/useResizeObserver";

type DimKey = "gold" | "silver" | "bronze" | "total" | "medalists" | "disciplines";

const DIMS: { key: DimKey; label: string }[] = [
  { key: "gold", label: "Gold" },
  { key: "silver", label: "Silver" },
  { key: "bronze", label: "Bronze" },
  { key: "total", label: "Total" },
  { key: "medalists", label: "Medalists" },
  { key: "disciplines", label: "Disciplines" }
];

export function StarPlotCountryProfile({ data }: { data: CountryProfile[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { width, height } = useResizeObserver(wrapRef);

  const topList = useMemo(() => data.slice(0, 20), [data]); // 下拉只放前 20，够用且不太长
  const [selectedCode, setSelectedCode] = useState<string>(() => topList[0]?.country_code ?? "");

  useEffect(() => {
    if (!selectedCode && topList.length > 0) setSelectedCode(topList[0].country_code);
  }, [selectedCode, topList]);

  const selected = useMemo(() => {
    return data.find((d) => d.country_code === selectedCode) ?? data[0];
  }, [data, selectedCode]);

  // 每个维度的全局 max，用于归一化
  const maxByDim = useMemo(() => {
    const m = new Map<DimKey, number>();
    for (const dim of DIMS) {
      m.set(dim.key, d3.max(data, (d) => d[dim.key]) ?? 1);
    }
    return m;
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!selected) return;
    if (width < 120 || height < 180) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // 布局
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const iw = Math.max(10, width - margin.left - margin.right);
    const ih = Math.max(10, height - margin.top - margin.bottom);

    const cx = margin.left + iw * 0.52;
    const cy = margin.top + ih * 0.52;
    const R = Math.min(iw, ih) * 0.32;

    const g = svg.append("g");

    // 角度：从 -90° 开始（正上方），顺时针
    const n = DIMS.length;
    const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;

    // 取归一化值
    const norm = (key: DimKey) => {
      const maxV = maxByDim.get(key) ?? 1;
      const v = selected[key];
      return maxV <= 0 ? 0 : v / maxV;
    };

    // 画网格（3 层：0.33/0.66/1.0）
    const levels = [0.33, 0.66, 1.0];
    levels.forEach((lv) => {
      const pts = DIMS.map((_, i) => {
        const a = angle(i);
        return [cx + Math.cos(a) * R * lv, cy + Math.sin(a) * R * lv] as [number, number];
      });
      g.append("path")
        .attr("d", d3.line()(pts.concat([pts[0]]))!)
        .attr("fill", "none")
        .attr("stroke", "#bbb")
        .attr("stroke-width", 1)
        .attr("opacity", 0.6);
    });

    // 轴线 + 标签
    DIMS.forEach((dim, i) => {
      const a = angle(i);
      const x2 = cx + Math.cos(a) * R;
      const y2 = cy + Math.sin(a) * R;

      g.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", x2).attr("y2", y2)
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1);

      // 标签稍微外扩一点
      const lx = cx + Math.cos(a) * (R + 18);
      const ly = cy + Math.sin(a) * (R + 18);

      g.append("text")
        .attr("x", lx)
        .attr("y", ly)
        .style("font-size", 12)
        .style("text-anchor", Math.cos(a) > 0.2 ? "start" : Math.cos(a) < -0.2 ? "end" : "middle")
        .style("dominant-baseline", Math.sin(a) > 0.2 ? "hanging" : Math.sin(a) < -0.2 ? "baseline" : "middle")
        .text(dim.label);
    });

    // star polygon
    const polyPts = DIMS.map((dim, i) => {
      const a = angle(i);
      const r = R * norm(dim.key);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
    });

    g.append("path")
      .attr("d", d3.line()(polyPts.concat([polyPts[0]]))!)
      .attr("fill", "#4C78A8")
      .attr("opacity", 0.25)
      .attr("stroke", "#4C78A8")
      .attr("stroke-width", 2);

    // 每个顶点画点（增强可读性）
    g.selectAll("circle.v")
      .data(polyPts)
      .join("circle")
      .attr("class", "v")
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1])
      .attr("r", 3.2)
      .attr("fill", "#4C78A8");

    // 在右下角给一个原始数值小表（不用太大，避免挤）
    const tableX = margin.left + iw * 0.73;
    const tableY = margin.top + ih * 0.70;

    const lines = DIMS.map((dim) => {
      const v = selected[dim.key];
      const maxV = maxByDim.get(dim.key) ?? 1;
      const p = maxV ? (v / maxV) : 0;
      return `${dim.label}: ${v}  (${(p * 100).toFixed(1)}%)`;
    });

    const box = g.append("g").attr("transform", `translate(${tableX},${tableY})`);
    box.append("rect")
      .attr("x", -6).attr("y", -14)
      .attr("width", 190).attr("height", 14 + lines.length * 14 + 8)
      .attr("fill", "white")
      .attr("stroke", "#ddd");

    box.append("text")
      .attr("x", 0).attr("y", 0)
      .style("font-size", 12)
      .style("font-weight", "600")
      .text("Normalized vs global max");

    lines.forEach((t, i) => {
      box.append("text")
        .attr("x", 0)
        .attr("y", 16 + i * 14)
        .style("font-size", 11)
        .text(t);
    });

  }, [selected, width, height, maxByDim]);

  return (
    <div ref={wrapRef} style={{ height: "100%", width: "100%" }}>
      <p className="chartTitle">Advanced: Star Plot (Country Performance Profile)</p>
      <p className="chartSubtitle">
        Select a country; axes are normalized per-dimension (value / global max).
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "#333" }}>Country:</label>
        <select
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          style={{ fontSize: 12, padding: "4px 6px" }}
        >
          {topList.map((d) => (
            <option key={d.country_code} value={d.country_code}>
              {d.country_code} — {d.country_long || d.country_code}
            </option>
          ))}
        </select>
      </div>

      <svg ref={svgRef} width="100%" height="78%" />
    </div>
  );
}
