// Spike shell — tabs across the demos. Dev-only, mounted via /spikes.html.
import { useState } from "react";
import { Spike001Abac } from "./Spike001Abac";
import { Spike002Hub } from "./Spike002Hub";
import { Spike003Handshake } from "./Spike003Handshake";
import { Spike004Sod } from "./Spike004Sod";
import { Spike005Contract } from "./Spike005Contract";
import { Spike006Trust } from "./Spike006Trust";
import { Spike007Audit } from "./Spike007Audit";
import { Spike008Policy } from "./Spike008Policy";
import { Spike009Context } from "./Spike009Context";

const TABS = [
  { id: "001", label: "001 · ABAC engine", el: <Spike001Abac /> },
  { id: "002", label: "002 · Hub index", el: <Spike002Hub /> },
  { id: "003", label: "003 · Handshake", el: <Spike003Handshake /> },
  { id: "004", label: "004 · Role SoD", el: <Spike004Sod /> },
  { id: "005", label: "005 · Contract", el: <Spike005Contract /> },
  { id: "006", label: "006 · Attr trust", el: <Spike006Trust /> },
  { id: "007", label: "007 · Audit", el: <Spike007Audit /> },
  { id: "008", label: "008 · Policy", el: <Spike008Policy /> },
  { id: "009", label: "009 · Context", el: <Spike009Context /> },
] as const;

export function Shell() {
  const [active, setActive] = useState<string>("001");
  const current = TABS.find((t) => t.id === active)!;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold">
              Janus — Authorization Hub spike
            </h1>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              DEMO / MOCK
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Throwaway demonstrator of the AUTH-MODEL — pure-computed ABAC,
            federated discovery hub, role SoD. All data is seeded and in-memory.
          </p>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${active === t.id ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-6">{current.el}</main>
    </div>
  );
}
