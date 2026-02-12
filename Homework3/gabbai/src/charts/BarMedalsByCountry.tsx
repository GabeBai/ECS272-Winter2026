import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { CountryProfile } from "../data/loadParis2024";
import { useResizeObserver } from "../hooks/useResizeObserver";

export function BarMedalsByCountry({
  data,
  selectedCountry,
  onSelectCountry
}: {
  data: CountryProfile[];
  selectedCountry: string | null;
  onSelectCountry: (countryCode: string | null) => void;
}) {
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

    const tip = d3
      .select(wrapRef.current)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("border-radius", "6px")
      .style("padding", "6px 8px")
      .style("font-size", "12px")
      .style("opacity", 0)
      .style("z-index", 5);

    const t = d3.transition().duration(700).ease(d3.easeCubicInOut);

    g.selectAll<SVGRectElement, CountryProfile>("rect")
      .data(rows, (d) => d.country_code)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (d) => x(d.country_code)!)
            .attr("y", ih)
            .attr("width", x.bandwidth())
            .attr("height", 0),
        (update) => update,
        (exit) => exit.transition(t).attr("y", ih).attr("height", 0).remove()
      )
      .attr("x", (d) => x(d.country_code)!)
      .attr("width", x.bandwidth())
      .attr("cursor", "pointer")
      .on("click", (_, d) => {
        onSelectCountry(selectedCountry === d.country_code ? null : d.country_code);
      })
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, wrapRef.current);
        tip
          .style("opacity", 1)
          .style("left", `${mx + 12}px`)
          .style("top", `${my + 12}px`)
          .html(
            `<div><b>${d.country_code}</b> · ${d.country_long || d.country_code}</div>
             <div>Total: ${d.total} (Gold: ${d.gold}, Silver: ${d.silver}, Bronze: ${d.bronze})</div>
             <div>Medalists: ${d.medalists} · Disciplines: ${d.disciplines}</div>`
          );
      })
      .on("mouseleave", () => tip.style("opacity", 0))
      .transition(t)
      .attr("y", (d) => y(d.total))
      .attr("height", (d) => ih - y(d.total))
      .attr("fill", (d) => (selectedCountry === d.country_code ? "#d62728" : "#4C78A8"))
      .attr("stroke", (d) => (selectedCountry === d.country_code ? "#7f1d1d" : "none"))
      .attr("stroke-width", (d) => (selectedCountry === d.country_code ? 1.5 : 0))
      .attr("opacity", (d) => (selectedCountry && selectedCountry !== d.country_code ? 0.25 : 0.9));

    return () => tip.remove();
  }, [rows, width, height, selectedCountry, onSelectCountry]);

  return (
    <div ref={wrapRef} style={{ height: "100%", width: "100%", position: "relative" }}>
      <p className="chartTitle">Overview: Top Countries by Total Medals</p>
      <p className="chartSubtitle">
        Click bars to cross-filter the scatter and star plot. Hover for country details.
      </p>
      <svg ref={svgRef} width="100%" height="85%" />
    </div>
  );
}
