export function LogoCloud() {
  const frameworks = [
    {
      name: "Next.js",
      port: ":3000",
      color: "text-white",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm4.5 13.5l-5.3-7.5H9.5v7.5H8v-9h2.2l5.3 7.5h.2v-7.5h1.5v9h-0.7z" />
        </svg>
      ),
    },
    {
      name: "Vite",
      port: ":5173",
      color: "text-amber-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M21.41 3.59l-9.4 17.65a.5.5 0 01-.89 0L1.7 3.59a.5.5 0 01.62-.7l9.4 3.73a.5.5 0 00.36 0l9.4-3.73a.5.5 0 01.63.7zM11.6 7.6L4.5 4.8l6.7 12.6.4-9.8zm.8 0l.4 9.8 6.7-12.6-7.1 2.8z" />
        </svg>
      ),
    },
    {
      name: "FastAPI",
      port: ":8000",
      color: "text-teal-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2L3 13h7v9l9-11h-7V2z" />
        </svg>
      ),
    },
    {
      name: "Go / Gin",
      port: ":8080",
      color: "text-cyan-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M1.9 10.3c.3-.6.8-1.1 1.4-1.5.6-.4 1.3-.6 2.1-.6 1.1 0 2 .4 2.7 1.1.7.7 1.1 1.7 1.1 2.8v.1H3.6c.1.6.3 1.1.8 1.5.4.4 1 .6 1.7.6.6 0 1.1-.1 1.5-.4.4-.3.7-.7.9-1.2h1.8c-.2.9-.7 1.7-1.4 2.3-.7.6-1.7.9-2.8.9-1.3 0-2.3-.4-3.1-1.2-.8-.8-1.2-1.9-1.2-3.2 0-.4 0-.8.1-1.2zm5.4.8c-.1-.5-.3-.9-.7-1.2-.3-.3-.8-.5-1.4-.5-.6 0-1.1.2-1.4.5-.4.3-.6.7-.7 1.2h4.2zm6.9-3.7h1.9v1.4c.3-.5.7-.9 1.2-1.2.5-.3 1.1-.4 1.8-.4 1.1 0 2 .4 2.7 1.1.7.7 1.1 1.7 1.1 2.8v5.5h-1.9v-5.2c0-.6-.2-1.1-.5-1.5-.3-.4-.8-.6-1.4-.6-.6 0-1.1.2-1.5.6-.4.4-.6.9-.6 1.5v5.2h-1.9V7.4h.1z" />
        </svg>
      ),
    },
    {
      name: "Rust / Axum",
      port: ":3001",
      color: "text-[#FF623D]",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.834 11.703l-1.667-1.03a10.155 10.155 0 0 0-.106-1.024l1.437-1.295a.349.349 0 0 0-.068-.555l-1.815-.914a10.082 10.082 0 0 0-.32-.983l1.17-1.53a.35.35 0 0 0-.19-.547l-1.975-.544a9.98 9.98 0 0 0-.519-.898l.883-1.73a.35.35 0 0 0-.296-.512l-2.029-.15a10.178 10.178 0 0 0-.698-.784l.577-1.887a.35.35 0 0 0-.39-.448l-2.002.247a10.17 10.17 0 0 0-.857-.647l.255-1.997a.35.35 0 0 0-.47-.368l-1.893.633a10.059 10.059 0 0 0-.979-.495L12 .334a.35.35 0 0 0-.532 0l-1.357 1.507a10.033 10.033 0 0 0-.978.495L7.235.703a.35.35 0 0 0-.471.368l.256 1.997a10.094 10.094 0 0 0-.857.647L4.163 3.468a.35.35 0 0 0-.39.448l.577 1.887a10.063 10.063 0 0 0-.7.784l-2.028.15a.35.35 0 0 0-.297.512l.883 1.73a9.94 9.94 0 0 0-.518.898L.716 10.42a.35.35 0 0 0-.19.547l1.171 1.53a10.161 10.161 0 0 0-.32.983L.563 14.394a.35.35 0 0 0-.068.555l1.437 1.295a10.15 10.15 0 0 0-.107 1.024l-1.667 1.03a.35.35 0 0 0 .057.603l1.733.799q.195.52.428 1.019l-1.09 1.692a.35.35 0 0 0 .192.528l1.896.481q.33.45.69.874l-.49 1.941a.35.35 0 0 0 .317.433l1.944.124q.43.389.887.74l.135 1.941a.35.35 0 0 0 .425.315l1.911-.37q.478.277.979.516l.46 1.891a.35.35 0 0 0 .52.214l1.751-.755q.517.175 1.052.307l.79 1.77a.35.35 0 0 0 .595.051l1.464-1.156q.542.066 1.094.082l1.104 1.557a.35.35 0 0 0 .603-.088l1.099-1.798q.536-.082 1.058-.213l1.534 1.323a.35.35 0 0 0 .577-.142l.69-1.927q.49-.24.96-.52l1.81.616a.35.35 0 0 0 .44-.258l.276-1.948q.44-.362.85-.76l1.882.274a.35.35 0 0 0 .385-.38l-.145-1.943q.37-.408.702-.847l1.893-.238a.35.35 0 0 0 .27-.49l-.646-1.858q.264-.497.485-1.014l1.838-.562a.35.35 0 0 0 .147-.576z" />
        </svg>
      ),
    },
    {
      name: "Python",
      port: ":8000",
      color: "text-yellow-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M11.914 0C5.833 0 6.2 2.64 6.2 2.64l.006 2.736h5.82v.834H3.852S0 5.76 0 11.868c0 6.107 3.36 5.894 3.36 5.894h2.008v-2.82s-.11-3.36 3.3-3.36h5.666s3.19.052 3.19-3.097V2.64S17.995 0 11.914 0zm-3.23 1.832a1.05 1.05 0 1 1 0 2.102 1.05 1.05 0 0 1 0-2.102zM12.086 24c6.081 0 5.714-2.64 5.714-2.64l-.006-2.736H11.97v-.834h8.178S24 18.24 24 12.132c0-6.107-3.36-5.894-3.36-5.894h-2.008v2.82s.11 3.36-3.3 3.36H9.666s-3.19-.052-3.19 3.097v5.843S6.005 24 12.086 24zm3.23-1.832a1.05 1.05 0 1 1 0-2.102 1.05 1.05 0 0 1 0 2.102z" />
        </svg>
      ),
    },
    {
      name: "NestJS",
      port: ":4000",
      color: "text-red-500",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8l7.5 3.75v7.9L12 20.2 4.5 16.45V8.55L12 4.8z" />
        </svg>
      ),
    },
    {
      name: "Docker",
      port: ":Exposed",
      color: "text-blue-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M13 3h-2v3h2V3zm-4 4H7v3h2V7zm8 0h-2v3h2V7zm-4 0h-2v3h2V7zM5 11H3v3h2v-3zm16 0h-2v3h2v-3zm-4 0h-2v3h2v-3zm-4 0h-2v3h2v-3zm-4 0H7v3h2v-3zm12.5 4H2.5c-.3 0-.5.2-.5.5v.5c0 3.6 2.9 6.5 6.5 6.5h7c3.6 0 6.5-2.9 6.5-6.5v-.5c0-.3-.2-.5-.5-.5z" />
        </svg>
      ),
    },
    {
      name: "Rails",
      port: ":3000",
      color: "text-rose-400",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2zm0 2.3L5.8 7.8 12 11.3l6.2-3.5L12 4.3z" />
        </svg>
      ),
    },
    {
      name: "Bun",
      port: ":3000",
      color: "text-amber-200",
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.82.62-3.49 1.64-4.83l11.19 11.19C15.49 19.38 13.82 20 12 20zm6.36-3.17L7.17 5.64C8.51 4.62 10.18 4 12 4c4.41 0 8 3.59 8 8 0 1.82-.62 3.49-1.64 4.83z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative w-full max-w-5xl mx-auto px-4 py-16 sm:py-20 select-none">
      {/* Ambient Radial Backlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2 h-44 rounded-full bg-primary/[0.03] blur-3xl -z-10"
      />

      {/* Header Container */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1015] border border-[#1F232E] text-[11px] font-mono text-[#8E93A4] mb-3 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="uppercase tracking-widest text-[10.5px]">Smart OS Reconnaissance</span>
        </div>

        <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Auto-detects any dev server on localhost
        </h3>
        <p className="text-sm text-[#8E93A4] max-w-lg leading-relaxed">
          Zero manual port forwarding or configuration files. Proxync silently sniffs active listening sockets and fingerprints your framework the instant your server boots.
        </p>
      </div>

      {/* Framework Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 max-w-4xl mx-auto">
        {frameworks.map((fw) => (
          <div
            key={fw.name}
            className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0E1015]/90 border border-[#1F232E] hover:border-[#2A2F3D] hover:bg-[#14171E] hover:scale-[1.02] transition-all cursor-default shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`${fw.color} shrink-0 transition-transform group-hover:scale-110`}>
                {fw.icon}
              </span>
              <span className="font-sans font-medium text-[13px] text-[#F1F2F6] truncate">
                {fw.name}
              </span>
            </div>
            <span className="font-mono text-[10.5px] text-[#54596B] group-hover:text-[#8E93A4] transition-colors ml-2 shrink-0">
              {fw.port}
            </span>
          </div>
        ))}
      </div>

      {/* Subtext footnote */}
      <div className="mt-6 text-center">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] text-[#54596B]">
          <span>+ Works with Spring Boot, Django, Flask, Express, Remix, Astro, or any custom TCP socket</span>
        </span>
      </div>
    </section>
  );
}
