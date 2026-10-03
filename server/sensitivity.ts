import { classifySSCI, SSCI_PILLAR_WEIGHTS, type SSCIClassification } from "@shared/ssciMethodology";
import type { Application } from "../drizzle/schema";
import { calculateSSCI } from "./scoring";

export const SENSITIVITY_INPUTS = [
  { key: "monthlyRevenue", label: "Pendapatan bulanan" },
  { key: "monthlyExpenses", label: "Pengeluaran bulanan" },
  { key: "existingDebt", label: "Angsuran existing" },
  { key: "requestedAmount", label: "Jumlah pembiayaan" },
  { key: "collateralValue", label: "Nilai agunan" },
  { key: "financingTenor", label: "Tenor" },
  { key: "marginRate", label: "Margin" },
  { key: "businessAge", label: "Lama usaha" },
] as const;

export const SENSITIVITY_STEPS = [-20, -10, 10, 20] as const;
const FLIP_SEARCH_LIMIT = 50;

type InputKey = (typeof SENSITIVITY_INPUTS)[number]["key"];

export type InputSensitivity = {
  key: InputKey;
  label: string;
  baseValue: number;
  points: Array<{ changePct: number; totalScore: number; delta: number; classification: SSCIClassification }>;
  maxAbsDelta: number;
  /** Smallest change (in %) that flips the classification, searched within ±50%. */
  flipAtPct: { down: number | null; up: number | null };
};

export type WeightScenario = { label: string; weights: { sustainableFinance: number; sharia: number; legal: number }; totalScore: number; delta: number; classification: SSCIClassification };

export type SensitivityResult = {
  base: { totalScore: number; classification: SSCIClassification };
  inputs: InputSensitivity[];
  weights: WeightScenario[];
  mostSensitive: string | null;
  stable: boolean;
};

function scoreWith(application: Application, key: InputKey, changePct: number) {
  const base = Number(application[key]);
  let value = base * (1 + changePct / 100);
  if (key === "financingTenor" || key === "businessAge") value = Math.max(1, Math.round(value));
  const variant = { ...application, [key]: typeof application[key] === "number" ? value : String(value) } as Application;
  try {
    return calculateSSCI(variant);
  } catch {
    return null;
  }
}

function findFlip(application: Application, key: InputKey, baseClass: SSCIClassification, direction: 1 | -1): number | null {
  for (let pct = 1; pct <= FLIP_SEARCH_LIMIT; pct++) {
    const result = scoreWith(application, key, pct * direction);
    if (result && result.classification !== baseClass) return pct * direction;
  }
  return null;
}

export function runSensitivity(application: Application): SensitivityResult {
  const base = calculateSSCI(application);
  const round = (n: number) => Math.round(n * 100) / 100;

  const inputs: InputSensitivity[] = SENSITIVITY_INPUTS.map(({ key, label }) => {
    const points = SENSITIVITY_STEPS.flatMap(changePct => {
      const result = scoreWith(application, key, changePct);
      return result ? [{ changePct, totalScore: result.totalScore, delta: round(result.totalScore - base.totalScore), classification: result.classification }] : [];
    });
    return {
      key,
      label,
      baseValue: Number(application[key]),
      points,
      maxAbsDelta: Math.max(0, ...points.map(p => Math.abs(p.delta))),
      flipAtPct: {
        down: findFlip(application, key, base.classification, -1),
        up: findFlip(application, key, base.classification, 1),
      },
    };
  });

  const raw = {
    sustainableFinance: (base.sustainableFinanceScore / SSCI_PILLAR_WEIGHTS.sustainableFinance) * 100,
    sharia: (base.shariaScore / SSCI_PILLAR_WEIGHTS.sharia) * 100,
    legal: (base.legalScore / SSCI_PILLAR_WEIGHTS.legal) * 100,
  };
  const names = { sustainableFinance: "Keuangan", sharia: "Syariah", legal: "Legal" } as const;
  const pillars = Object.keys(names) as Array<keyof typeof names>;
  const weights: WeightScenario[] = [];
  for (const from of pillars) {
    for (const to of pillars) {
      if (from === to) continue;
      const w = { ...SSCI_PILLAR_WEIGHTS } as { sustainableFinance: number; sharia: number; legal: number };
      w[from] -= 5;
      w[to] += 5;
      const total = round(pillars.reduce((sum, p) => sum + (raw[p] * w[p]) / 100, 0));
      weights.push({
        label: `${names[from]} -5, ${names[to]} +5`,
        weights: w,
        totalScore: total,
        delta: round(total - base.totalScore),
        classification: classifySSCI(total),
      });
    }
  }

  const ranked = [...inputs].sort((a, b) => b.maxAbsDelta - a.maxAbsDelta);
  const anyFlip = inputs.some(i => i.points.some(p => p.classification !== base.classification)) ||
    weights.some(w => w.classification !== base.classification);

  return {
    base: { totalScore: base.totalScore, classification: base.classification },
    inputs,
    weights,
    mostSensitive: ranked[0] && ranked[0].maxAbsDelta > 0 ? ranked[0].label : null,
    stable: !anyFlip,
  };
}
