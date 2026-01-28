import { useEffect, useMemo, useState } from "react";
import { loadParis2024, AthleteMedalAgg, CountryProfile } from "./data/loadParis2024";
import { BarMedalsByCountry } from "./charts/BarMedalsByCountry";
import { ScatterAgeVsMedals } from "./charts/ScatterAgeVsMedals";
import { StarPlotCountryProfile } from "./charts/StarPlotCountryProfile";

export default function App() {
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [athleteAgg, setAthleteAgg] = useState<AthleteMedalAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadParis2024()
      .then(({ countryProfiles, athleteAgg }) => {
        setCountryProfiles(countryProfiles);
        setAthleteAgg(athleteAgg);
        setLoading(false);
      })
      .catch((e) => {
        setErr(String(e));
        setLoading(false);
      });
  }, []);

  const topCountries = useMemo(() => countryProfiles.slice(0, 20), [countryProfiles]);

  if (loading) {
    return (
      <div className="page">
        <div className="header">
          <div className="title">Loading…</div>
          <div className="subtitle">Reading athletes.csv + medals.csv</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page">
        <div className="header">
          <div className="title">Error</div>
          <div className="subtitle">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="title">Olympics Paris 2024 — Static Visualization Dashboard</div>
        <div className="subtitle">
          Overview: Bar · Focus: Scatter · Advanced: Star Plot (React + D3)
        </div>
      </header>

      <main className="grid">
        <section className="card span2">
          <BarMedalsByCountry data={topCountries} />
        </section>

        <section className="card">
          <ScatterAgeVsMedals data={athleteAgg} />
        </section>

        <section className="card">
          <StarPlotCountryProfile data={countryProfiles} />
        </section>
      </main>
    </div>
  );
}
