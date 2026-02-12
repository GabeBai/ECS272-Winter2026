import { useEffect, useMemo, useState } from "react";
import { loadParis2024, AthleteMedalAgg, CountryProfile } from "./data/loadParis2024";
import { BarMedalsByCountry } from "./charts/BarMedalsByCountry";
import { ScatterAgeVsMedals } from "./charts/ScatterAgeVsMedals";
import { StarPlotCountryProfile } from "./charts/StarPlotCountryProfile";

export default function App() {
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [athleteAgg, setAthleteAgg] = useState<AthleteMedalAgg[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
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
        <div className="title">Olympics Paris 2024 — Interactive Visualization Dashboard</div>
        <div className="subtitle">
          Click a bar to filter all views by country. Click again to clear.
        </div>
        {selectedCountry && (
          <div className="activeFilterRow">
            <span className="activeFilter">Active country filter: {selectedCountry}</span>
            <button className="clearBtn" onClick={() => setSelectedCountry(null)}>
              Clear filter
            </button>
          </div>
        )}
      </header>

      <main className="grid">
        <section className="card span2">
          <BarMedalsByCountry
            data={topCountries}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </section>

        <section className="card">
          <ScatterAgeVsMedals data={athleteAgg} selectedCountry={selectedCountry} />
        </section>

        <section className="card">
          <StarPlotCountryProfile
            data={countryProfiles}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </section>
      </main>
    </div>
  );
}
