// demo/components/ui.tsx — presentational helpers lifted VERBATIM from spikes/components/ui.tsx.
// Only change vs the spike: import Decision from ../lib/abac (demo path) and add MockTag.
// Do NOT fork DecisionTrace — its verdict/rows/override line are the UI-SPEC visual contract.
import type { ReactNode } from "react";
import type { Decision } from "../lib/abac";

export function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "red" | "blue" | "amber";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-900",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// MockTag — marks a simulated/external trust signal (e.g. clearance) as [MOCK].
// Amber caution treatment, deliberately DISTINCT from the green/red decision palette
// so a mock signal is never read as a real ALLOW/DENY (MODEL-03, UI-SPEC §Color).
export function MockTag({ children = "[MOCK]" }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
      {children}
    </span>
  );
}

export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DecisionTrace({ result }: { result: Decision }) {
  const allow = result.decision === "ALLOW";
  return (
    <div
      className={`rounded-lg border p-4 ${allow ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="text-lg font-bold">{allow ? "✓ ALLOW" : "✗ DENY"}</div>
      <ul className="mt-3 space-y-1.5">
        {result.rules.map((r) => (
          <li key={r.name} className="flex gap-2 text-sm">
            <span className={r.pass ? "text-green-600" : "text-red-600"}>
              {r.pass ? "✓" : "✗"}
            </span>
            <span className="w-28 shrink-0 font-medium">{r.name}</span>
            <span className="text-slate-600">{r.detail}</span>
          </li>
        ))}
        {result.overrides.map((o) => (
          <li key={o.name} className="flex gap-2 text-sm">
            <span className="text-red-600">⛔</span>
            <span className="w-28 shrink-0 font-medium text-red-700">
              {o.name}
            </span>
            <span className="text-red-700">{o.detail} (deny override)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
