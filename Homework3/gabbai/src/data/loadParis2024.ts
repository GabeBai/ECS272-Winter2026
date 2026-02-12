import * as d3 from "d3";

export type AthleteRow = {
  code: string;
  name: string;
  gender: string;
  country_code: string;
  country_long?: string;
  disciplines?: string;
  birth_date?: string;
};

export type MedalRow = {
  medal_type: string;
  medal_date?: string;
  name: string;
  gender?: string;
  discipline?: string;
  event?: string;
  code: string; // athlete id
  country_code: string;
  country_long?: string;
};

export type CountryProfile = {
  country_code: string;
  country_long: string;

  gold: number;
  silver: number;
  bronze: number;
  total: number;

  medalists: number;   // distinct athlete codes
  disciplines: number; // distinct disciplines
};

export type AthleteMedalAgg = {
  athlete_code: string;
  name: string;
  gender: string;
  country_code: string;
  country_long: string;
  discipline: string;
  age: number | null;
  medals: number;
};

function safeParseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function computeAgeYears(dob: Date, asOf: Date): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age;
}

function medalKind(medal_type: string): "gold" | "silver" | "bronze" | "other" {
  const s = (medal_type || "").toLowerCase();
  if (s.includes("gold")) return "gold";
  if (s.includes("silver")) return "silver";
  if (s.includes("bronze")) return "bronze";
  return "other";
}

export async function loadParis2024() {
  const [athRaw, medRaw] = await Promise.all([
    d3.csv<AthleteRow>("/data/athletes.csv", d3.autoType as any),
    d3.csv<MedalRow>("/data/medals.csv", d3.autoType as any)
  ]);

  const athletes: AthleteRow[] = athRaw.map((a: any) => ({
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    gender: String(a.gender ?? "Unknown"),
    country_code: String(a.country_code ?? ""),
    country_long: String(a.country_long ?? ""),
    disciplines: String(a.disciplines ?? "Unknown"),
    birth_date: a.birth_date ? String(a.birth_date) : ""
  }));

  const medals: MedalRow[] = medRaw.map((m: any) => ({
    medal_type: String(m.medal_type ?? ""),
    medal_date: m.medal_date ? String(m.medal_date) : "",
    name: String(m.name ?? ""),
    gender: m.gender ? String(m.gender) : "",
    discipline: m.discipline ? String(m.discipline) : "",
    event: m.event ? String(m.event) : "",
    code: String(m.code ?? ""),
    country_code: String(m.country_code ?? ""),
    country_long: String(m.country_long ?? "")
  }));

  // 更可靠的国家长名：从 medals.csv 优先取
  const countryLongByCode = d3.rollup(
    medals,
    (rows) => String(rows[0]?.country_long ?? rows[0]?.country_code ?? ""),
    (r) => r.country_code
  );

  // --- Country profile（Star plot 用）
  const countryRoll = d3.rollup(
    medals,
    (rows) => {
      let gold = 0, silver = 0, bronze = 0;
      const athleteSet = new Set<string>();
      const disciplineSet = new Set<string>();

      for (const r of rows) {
        const k = medalKind(r.medal_type);
        if (k === "gold") gold++;
        else if (k === "silver") silver++;
        else if (k === "bronze") bronze++;

        if (r.code) athleteSet.add(String(r.code));
        if (r.discipline) disciplineSet.add(String(r.discipline));
      }

      return {
        gold,
        silver,
        bronze,
        total: rows.length,
        medalists: athleteSet.size,
        disciplines: disciplineSet.size
      };
    },
    (r) => r.country_code
  );

  const countryProfiles: CountryProfile[] = Array.from(countryRoll, ([code, v]) => ({
    country_code: String(code),
    country_long: countryLongByCode.get(code) ?? String(code),
    gold: v.gold,
    silver: v.silver,
    bronze: v.bronze,
    total: v.total,
    medalists: v.medalists,
    disciplines: v.disciplines
  })).sort((a, b) => d3.descending(a.total, b.total));

  // --- Athlete aggregate（scatter 用）
  const medalsByAthlete = d3.rollup(
    medals,
    (rows) => rows.length,
    (r) => r.code
  );

  const medalCountryByAthlete = d3.rollup(
    medals,
    (rows) => ({
      country_code: String(rows[0]?.country_code ?? ""),
      country_long: String(rows[0]?.country_long ?? rows[0]?.country_code ?? "")
    }),
    (r) => r.code
  );

  const asOf = new Date("2024-08-11");

  const athleteAgg: AthleteMedalAgg[] = athletes.map((a) => {
    const dob = a.birth_date ? safeParseDate(a.birth_date) : null;
    const age = dob ? computeAgeYears(dob, asOf) : null;
    const medalCount = medalsByAthlete.get(a.code) ?? 0;

    const mc = medalCountryByAthlete.get(a.code);
    const cc = mc?.country_code || a.country_code || "";
    const cl = mc?.country_long || a.country_long || cc;

    return {
      athlete_code: a.code,
      name: a.name,
      gender: a.gender || "Unknown",
      country_code: cc,
      country_long: cl,
      discipline: a.disciplines || "Unknown",
      age,
      medals: medalCount
    };
  });

  return { countryProfiles, athleteAgg };
}
