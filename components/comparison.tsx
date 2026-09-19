import { Check, X, Minus } from "lucide-react";

export function Comparison() {
  const features = [
    {
      capability: "Standby Survival (Vite/Node restart)",
      proxync: "Native Socket Guard (0 drops)",
      ngrok: "502 Bad Gateway drops",
      cloudflare: "Connection refused drops",
      postman: "N/A (No tunnels)",
    },
    {
      capability: "Account / Cloud Auth Required",
      proxync: "Zero signup / 100% anonymous",
      ngrok: "Mandatory cloud token",
      cloudflare: "Requires account & DNS",
      postman: "Mandatory cloud login",
    },
    {
      capability: "Native Desktop UI Studio",
      proxync: "Tauri v2 Native Binary",
      ngrok: "Web dashboard only",
      cloudflare: "CLI daemon only",
      postman: "Heavy Electron app",
    },
    {
      capability: "RAM Footprint",
      proxync: "~12MB (Pure Rust)",
      ngrok: "~85MB",
      cloudflare: "~120MB",
      postman: "~450MB+",
    },
    {
      capability: "Live Visual JSON Diff + Replay",
      proxync: "Built-in + 1-Click IDE Jump",
      ngrok: "Replay only (No diff)",
      cloudflare: "None",
      postman: "Manual cURL inspection",
    },
    {
      capability: "Process Lifecycle & Teardown",
      proxync: "Atomic POSIX PGID (Zero Orphans)",
      ngrok: "Orphaned workers hold ports",
      cloudflare: "Manual daemon kill",
      postman: "N/A",
    },
    {
      capability: "Data Privacy & Security",
      proxync: "Local SQLite + SSRF Intranet Shield",
      ngrok: "Cloud logged",
      cloudflare: "Edge telemetry",
      postman: "Workspaces cloud synced",
    },
    {
      capability: "License & Pricing",
      proxync: "Apache 2.0 Free Forever",
      ngrok: "$10 – $20 / user / mo",
      cloudflare: "Free tier / Enterprise",
      postman: "$14 – $49 / user / mo",
    },
  ];

  return (
    <section id="benchmarks" className="w-full max-w-5xl mx-auto px-4 py-20 scroll-mt-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-3">
        <div>
          <div className="font-mono text-[11px] text-primary uppercase tracking-wider mb-2">
            // Architectural Benchmarks
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Compare the Developer Ergonomics
          </h2>
        </div>
        <span className="font-mono text-[11px] text-[#54596B]">
          Tested against latest stable production binaries
        </span>
      </div>

      {/* Comparison Table */}
      <div className="w-full rounded-2xl bg-[#0E1015] border border-[#1F232E] overflow-hidden hairline-glow shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm min-w-[700px]">
            <thead className="bg-[#0A0C10] border-b border-[#1F232E] font-mono text-[11px] uppercase tracking-wider text-[#54596B]">
              <tr>
                <th className="p-4 w-[32%]">Capability</th>
                <th className="p-4 w-[26%] text-primary bg-primary/[0.03]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Proxync Studio</span>
                  </div>
                </th>
                <th className="p-4 w-[14%]">ngrok</th>
                <th className="p-4 w-[14%]">Cloudflare</th>
                <th className="p-4 w-[14%]">Postman</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1F232E]/60 text-[13px]">
              {features.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.015] transition-colors">
                  <td className="p-4 text-white font-medium">{row.capability}</td>
                  <td className="p-4 font-mono text-primary bg-primary/[0.03] font-semibold flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{row.proxync}</span>
                  </td>
                  <td className="p-4 font-mono text-[#8E93A4] text-xs">{row.ngrok}</td>
                  <td className="p-4 font-mono text-[#8E93A4] text-xs">{row.cloudflare}</td>
                  <td className="p-4 font-mono text-[#8E93A4] text-xs">{row.postman}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
