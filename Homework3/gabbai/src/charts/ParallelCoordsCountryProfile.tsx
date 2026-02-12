import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { CountryMedalAgg } from "../data/loadParis2024";
import { useResizeObserver } from "../hooks/useResizeObserver";

export function ParallelCoordsCountryProfile({ data }: { data: CountryMedalAgg[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { width, height } = useResizeObserver(wrapRef);

  const rows = useMemo(() => data.slice(), [data]);
  const dims = ["gold", "silver", "bronze", "total"] as const;

  useEffect(() => {
    if (!svgRef.current) return;
    if (width < 80 || height < 120) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 24, right: 10, bottom: 10, left: 38 };
    const iw = Math.max(10, width - margin.left - margin.right);
    const ih = Math.max(10, height - margin.top - margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>()
      .domain(dims as unknown as string[])
      .range([0, iw])
      .padding(0.5);

    const y = new Map<string, d3.ScaleLinear<number, number>>();
    dims.forEach((k) => {
      const maxV = d3.max(rows, (d) => (d as any)[k] as number) ?? 0;
      y.set(k, d3.scaleLinear().domain([0, maxV]).nice().range([ih, 0]));
    });

    const color = d3.scaleOrdinal<string>()
      .domain(rows.map((d) => d.country_code))
      .range(d3.schemeTableau10);

    // Axes
    dims.forEach((k) => {
      const axisG = g.append("g").attr("transform", `translate(${x(k)},0)`);
      axisG.call(d3.axisLeft(y.get(k)!).ticks(5));
      axisG.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("font-size", 12)
        .text(k.toUpperCase());
    });

    const line = d3.line<[number, number]>();

    g.append("g")
      .selectAll("path.countryLine")
      .data(rows)
      .join("path")
      .attr("class", "countryLine")
      .attr("d", (d) => {
        const pts: [number, number][] = dims.map((k) => [x(k)!, y.get(k)!((d as any)[k] as number)]);
        return line(pts) ?? "";
      })
      .attr("fill", "none")
      .attr("stroke", (d) => String(color(d.country_code)))
      .attr("stroke-width", 1.6)
      .attr("opacity", 0.55);

    // Legend (top 10)
    const legendCodes = rows.slice(0, Math.min(10, rows.length)).map((d) => d.country_code);
    const legend = g.append("g").attr("transform", `translate(${iw - 150}, 0)`);
    legendCodes.forEach((code, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      row.append("line")
        .attr("x1", 0).attr("x2", 18).attr("y1", 7).attr("y2", 7)
        .attr("stroke", String(color(code))).attr("stroke-width", 3);
      row.append("text").attr("x", 24).attr("y", 10).style("font-size", 12).text(code);
    });

  }, [rows, width, height]);

  return (
    <div ref={wrapRef} style={{ height: "100%", width: "100%" }}>
      <p className="chartTitle">Advanced: Country Medal Profile (Parallel Coordinates)</p>
      <p className="chartSubtitle">Each polyline is a country_code across Gold/Silver/Bronze/Total.</p>
      <svg ref={svgRef} width="100%" height="85%" />
      <p className="smallNote">Legend shows first 10 countries (same set as bar chart input).</p>
    </div>
  );
}
