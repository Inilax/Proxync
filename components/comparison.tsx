import { CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/ui";

type Tool = { name: string; tagline: string };
type FeatureRow = { label: string; proxync: boolean; others: boolean[] };

const TOOLS: Tool[] = [
  { name: "ngrok",         tagline: "SaaS tunnel" },
  { name: "Postman",       tagline: "Cloud-first" },
  { name: "Wireshark",     tagline: "Packet sniffer" },
  { name: "Charles Proxy", tagline: "Paid desktop" },
];

const ROWS: FeatureRow[] = [
  { label: "100% local — zero cloud data",         proxync: true,  others: [false, false, true,  true]  },
  { label: "Live schema drift detection",           proxync: true,  others: [false, false, false, false] },
  { label: "Native edge SSH tunnels",               proxync: true,  others: [true,  false, false, false] },
  { label: "Built-in API playground",               proxync: true,  others: [false, true,  false, false] },
  { label: "Resilient Standby URL",                 proxync: true,  others: [false, false, false, false] },
  { label: "Auto OpenAPI spec generation",          proxync: true,  others: [false, false, false, false] },
  { label: "Request Workbench + visual diff",       proxync: true,  others: [false, false, false, false] },
  { label: "1-click IDE jump to endpoint",          proxync: true,  others: [false, false, false, false] },
  { label: "No forced sign-up required",            proxync: true,  others: [false, true,  true,  true]  },
  { label: "Native binary (not Electron)",          proxync: true,  others: [false, false, true,  true]  },
];

export function Comparison() {
  return (
    <section id="comparison" className="relative overflow-hidden py-28 scroll-mt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />

      <Container className="relative z-10">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
            Why not just use…
          </p>
          <h2 className="font-display text-4xl font-black tracking-[-0.02em] text-white sm:text-5xl">
            One studio.
            <br />
            <span className="text-white/30">Everything else, replaced.</span>
          </h2>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-white/[0.06] shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            {/* Header */}
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-[38%] py-4 pl-6 pr-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-white/25">
                  Feature
                </th>
                {/* Proxync column header */}
                <th className="py-4 px-4 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 font-mono text-[11px] font-bold tracking-wide text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Proxync
                  </span>
                </th>
                {TOOLS.map((t) => (
                  <th key={t.name} className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-xs font-semibold text-white/40">
                        {t.name}
                      </span>
                      <span className="font-mono text-[10px] text-white/18">
                        {t.tagline}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Rows */}
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.015] last:border-0"
                >
                  <td className="py-3.5 pl-6 pr-4 text-[13px] text-white/55">
                    {row.label}
                  </td>

                  {/* Proxync */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="flex justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </span>
                  </td>

                  {/* Others */}
                  {row.others.map((has, j) => (
                    <td key={j} className="py-3.5 px-4 text-center">
                      <span className="flex justify-center">
                        {has ? (
                          <CheckCircle2 className="h-4 w-4 text-white/25" />
                        ) : (
                          <XCircle className="h-4 w-4 text-white/12" />
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <p className="mt-5 text-center font-mono text-[11px] text-white/20">
          Comparison reflects publicly documented capabilities as of September 2026.
        </p>
      </Container>
    </section>
  );
}
