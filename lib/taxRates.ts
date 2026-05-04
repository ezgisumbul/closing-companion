// Grunderwerbsteuer rates by German federal state.
// Source: current legislation as of 2025.
// Update this file when rates change — it is the single source of truth
// used by the landing page estimator and the timeline API route.

export interface StateRate {
  name: string;
  rate: number; // decimal, e.g. 0.065 for 6.5%
}

export const STATE_TAX_RATES: StateRate[] = [
  { name: "Baden-Württemberg", rate: 0.05 },
  { name: "Bayern", rate: 0.035 },
  { name: "Berlin", rate: 0.06 },
  { name: "Brandenburg", rate: 0.065 },
  { name: "Bremen", rate: 0.05 },
  { name: "Hamburg", rate: 0.055 },
  { name: "Hessen", rate: 0.06 },
  { name: "Mecklenburg-Vorpommern", rate: 0.06 },
  { name: "Niedersachsen", rate: 0.05 },
  { name: "Nordrhein-Westfalen", rate: 0.065 },
  { name: "Rheinland-Pfalz", rate: 0.05 },
  { name: "Saarland", rate: 0.065 },
  { name: "Sachsen", rate: 0.045 },
  { name: "Sachsen-Anhalt", rate: 0.06 },
  { name: "Schleswig-Holstein", rate: 0.065 },
  { name: "Thüringen", rate: 0.065 },
];

// Default state shown on load
export const DEFAULT_STATE = "Berlin";

// Other closing cost rates (approximate, used in estimator)
export const NOTARKOSTEN_RATE = 0.015; // ~1.5%
export const GRUNDBUCH_RATE = 0.005;   // ~0.5%
export const MAKLER_RATE = 0.0357;     // 3.57% (buyer's share)
