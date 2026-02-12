import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { AthleteMedalAgg } from "../data/loadParis2024";
import { useResizeObserver } from "../hooks/useResizeObserver";

type Row = AthleteMedalAgg & { country_group: string };

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return m[c] ?? c;
  });
}

export function ScatterAgeVsMedals({
  data,
  selectedCountry
}: {
  data: AthleteMedalAgg[];
  selectedCountry: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { width, height } = useResizeObserver(wrapRef);

  const rowsBase: AthleteMedalAgg[] = useMemo(() => {
    return data.filter((d) => d.age !== null && d.medals > 0);
  }, [data]);

  const { rows, legendDomain } = useMemo(() => {
    const countryTotals = d3
      .rollups(
        rowsBase,
        (v) => d3.sum(v, (d) => d.medals),
        (d) => d.country_code
      )
      .sort((a, b) => d3.descending(a[1], b[1]));

    const top = countryTotals.slice(0, 4).map(([k]) => k);
    const topSet = new Set(top);

    const rows2: Row[] = rowsBase.map((d) => ({
      ...d,
      country_group: topSet.has(d.country_code) ? d.country_code : "Other"
    }));

    return { rows: rows2, legendDomain: [...top, "Other"] };
  }, [rowsBase]);

  const shownRows = useMemo(() => {
    if (!selectedCountry) return rows;
    return rows.filter((d) => d.country_code === selectedCountry);
  }, [rows, selectedCountry]);

  useEffect(() => {
    if (!svgRef.current) return;
    if (width < 80 || height < 140) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 10, right: 10, bottom: 52, left: 60 };
    const iw = Math.max(10, width - margin.left - margin.right);
    const ih = Math.max(10, height - margin.top - margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const extentRows = shownRows.length > 0 ? shownRows : rows;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(extentRows, (d) => d.age as number) as [number, number])
      .nice()
      .range([0, iw]);

    const y = d3
      .scaleLinear()
      .domain([1, d3.max(extentRows, (d) => d.medals) ?? 1])
      .nice()
      .range([ih, 0]);

    const color = d3
      .scaleOrdinal<string>()
      .domain(legendDomain)
      .range(["#1f77b4", "#d62728", "#2ca02c", "#ff7f0e", "#7f7f7f"]);

    g.append("g").call(d3.axisLeft(y).ticks(5));
    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(8));

    g.append("text")
      .attr("x", iw / 2)
      .attr("y", ih + 42)
      .style("text-anchor", "middle")
      .style("font-size", 12)
      .text("Athlete age (years)");

    g.append("text")
      .attr("x", -ih / 2)
      .attr("y", -46)
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .style("font-size", 12)
      .text("Medals won (count)");

    const legend = g.append("g").attr("transform", `translate(${iw - 150}, 5)`);
    legendDomain.forEach((k, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      row.append("circle").attr("r", 5).attr("cx", 5).attr("cy", 5).attr("fill", String(color(k)));
      row.append("text").attr("x", 15).attr("y", 9).style("font-size", 12).text(k);
    });

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
      .style("opacity", 0);

    const t = d3.transition().duration(700).ease(d3.easeCubicInOut);

    g.selectAll("circle.pt")
      .data(shownRows, (d: any) => (d as Row).athlete_code)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "pt")
            .attr("cx", (d) => x(d.age as number))
            .attr("cy", ih)
            .attr("r", 0)
            .attr("fill", (d) => String(color(d.country_group)))
            .attr("opacity", 0)
            .call((sel) =>
              sel
                .transition(t)
                .attr("cy", (d) => y(d.medals))
                .attr("r", (d) => 4 + Math.min(6, d.medals))
                .attr("opacity", 0.75)
            ),
        (update) =>
          update.call((sel) =>
            sel
              .transition(t)
              .attr("cx", (d) => x(d.age as number))
              .attr("cy", (d) => y(d.medals))
              .attr("r", (d) => 4 + Math.min(6, d.medals))
              .attr("opacity", 0.75)
          ),
        (exit) =>
          exit.call((sel) => sel.transition(t).attr("opacity", 0).attr("r", 0).remove())
      )
      .attr("fill", (d) => String(color(d.country_group)))
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, wrapRef.current);
        tip
          .style("opacity", 1)
          .style("left", `${mx + 12}px`)
          .style("top", `${my + 12}px`)
          .html(
            `<div><b>${escapeHtml(d.name)}</b></div>
             <div>${escapeHtml(d.country_long || d.country_code)} · ${escapeHtml(d.country_group)}</div>
             <div>${escapeHtml(d.discipline)}</div>
             <div>Age: ${d.age} · Medals: ${d.medals}</div>`
          );
      })
      .on("mouseleave", () => tip.style("opacity", 0));

    return () => tip.remove();
  }, [rows, shownRows, legendDomain, width, height, selectedCountry]);

  return (
    <div ref={wrapRef} style={{ height: "100%", width: "100%", position: "relative" }}>
      <p className="chartTitle">Focus: Athlete Age vs Medals Won</p>
      <p className="chartSubtitle">
        {selectedCountry
          ? `Filtered by country: ${selectedCountry}.`
          : "Athletes with medals=0 are removed. Color encodes top countries; others grouped as Other."}
      </p>
      <svg ref={svgRef} width="100%" height="85%" />
      <p className="smallNote">Hover points for details.</p>
    </div>
  );
}
