import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { CountryProfile } from "../data/loadParis2024";
import { useResizeObserver } from "../hooks/useResizeObserver";

export function BarMedalsByCountry({ data }: { data: CountryProfile[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { width, height } = useResizeObserver(wrapRef);

  const rows = useMemo(
    () => data.slice().sort((a, b) => d3.descending(a.total, b.total)),
    [data]
  );

  useEffect(() => {
    if (!svgRef.current) return;
    if (width < 80 || height < 120) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 10, right: 10, bottom: 65, left: 55 };
    const iw = Math.max(10, width - margin.left - margin.right);
    const ih = Math.max(10, height - margin.top - margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(rows.map((d) => d.country_code))
      .range([0, iw])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(rows, (d) => d.total) ?? 0])
      .nice()
      .range([ih, 0]);

    g.append("g").call(d3.axisLeft(y));

    g.append("g")
      .attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end");

    g.append("text")
      .attr("x", -ih / 2)
      .attr("y", -42)
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .style("font-size", 12)
      .text("Total medals");

    g.append("text")
      .attr("x", iw / 2)
      .attr("y", ih + 52)
      .style("text-anchor", "middle")
      .style("font-size", 12)
      .text("Country code");

    g.selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (d) => x(d.country_code)!)
      .attr("y", (d) => y(d.total))
      .attr("width", x.bandwidth())
      .attr("height", (d) => ih - y(d.total))
      .attr("opacity", 0.85);

  }, [rows, width, height]);

  return (
    <div ref={wrapRef} style={{ height: "100%", width: "100%" }}>
      <p className="chartTitle">Overview: Top Countries by Total Medals</p>
      <p className="chartSubtitle">Aggregation from medals.csv (country_code → count).</p>
      <svg ref={svgRef} width="100%" height="85%" />
    </div>
  );
}
