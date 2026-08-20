import type { Metadata } from "next";
import { FileText, ShieldAlert, CheckCircle2, Cpu, Globe, Scale, AlertTriangle, HelpCircle, Users, CreditCard } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Service — Proxync by Inilax",
  description:
    "Proxync Terms of Service. Terms governing Community (Free Standalone) and Enterprise Team tiers provided by Inilax.",
};

const TERMS_SECTIONS = [
  {
    id: "agreement",
    title: "1. Acceptance of Terms & Inilax Service Relationship",
    icon: CheckCircle2,
    content: `These Terms of Service ("Terms") constitute a legally binding agreement between you (whether an individual software engineer or an organization, "User", "You") and Inilax ("Inilax", "we", "us", or "our") governing your access to, download, installation, and use of Proxync software, desktop applications, website (https://proxync.dev), documentation, and associated services (collectively, the "Software").

By downloading, installing, or using Proxync, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with these Terms, you must immediately cease using and uninstall the Software.`,
  },
  {
    id: "edition-tiers",
    title: "2. Edition Tiers & Subscription Plans",
    icon: Cpu,
    content: `Proxync is provided under distinct subscription tiers:

• Standalone Community Edition (Free) — Grants individual developers a free, non-exclusive, revocable license to use Proxync locally on personal or corporate machines for software development, traffic proxying, and API testing.
• Team & Enterprise Tier (Paid) — Provides organizations and engineering teams with enhanced capabilities, including team tunnel sharing, extended tunneling quotas, Proxync Self-Hosted & Managed Tunnels, real-time inter-team voice and chat collaboration, and centralized team seat administration.

Inilax reserves the right to introduce or adjust feature limits, bandwidth quotas, or subscription pricing for paid tiers with advance notice to subscription holders.`,
  },
  {
    id: "enterprise-features",
    title: "3. Team Tunnel Sharing, Self-Tunnels & Voice/Chat Conduct",
    icon: Users,
    content: `When utilizing Enterprise or Team tier features:
• Team Tunnel Sharing & Quotas — Authorized team members may share active public development tunnels and access elevated tunnel duration quotas. Sharing credentials or seats outside your organization is strictly prohibited.
• Proxync Self-Tunnels & Managed Relays — When operating Proxync Self-Tunnels or custom organization relay servers, you are responsible for maintaining server security and firewall rules on your self-hosted infrastructure.
• Inter-Team Voice & Chat — Real-time voice streams and text channels must be used strictly for lawful software engineering collaboration. Harassment, unauthorized recording, or offensive behavior during team sessions is prohibited.`,
  },
  {
    id: "billing",
    title: "4. Billing, Seat Licensing & Cancellations",
    icon: CreditCard,
    content: `• Subscriptions & Renewal — Paid Team and Enterprise subscriptions are billed on a recurring monthly or annual basis. Fees are non-refundable except where required by law or specified in a custom Enterprise Agreement.
• Seat Licensing — Paid plans are licensed per user seat or per organization workspace. Seat counts may be upgraded or adjusted through your billing dashboard.
• Cancellation — You may cancel your paid subscription at any time. Upon cancellation, your account will revert to the Standalone Free Edition at the end of your current billing cycle.`,
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable Use Policy & Developer Conduct",
    icon: ShieldAlert,
    content: `Proxync equips developers with high-performance local tunneling, TCP/HTTP proxy interception, and public sharing capabilities. You agree to use these capabilities responsibly and lawfully.

You strictly agree NOT to use Proxync or any associated Inilax services to:
• Host, proxy, transmit, or distribute malware, ransomware, phishing pages, or malicious computer code.
• Perform unauthorized network penetration testing, distributed denial-of-service (DDoS) attacks, or credential harvesting against third-party systems.
• Bypass network access controls or expose confidential data without authorization from the system owner.
• Violate any applicable local, national, or international computer fraud, security, or privacy law.

Inilax reserves the right to block software update delivery or revoke license access for any installation involved in illegal or abusive activities.`,
  },
  {
    id: "third-party",
    title: "6. Integration with Third-Party Edge Services",
    icon: Globe,
    content: `Proxync incorporates automated integrations with third-party edge tunneling providers, including Cloudflare Quick Tunnels (*.trycloudflare.com) and Localtunnel (*.loca.lt), as well as native Proxync Tunnels.

You acknowledge and agree that:
• Third-party tunneling providers operate independently of Inilax.
• Public network availability, domain allocation, rate limits, latency, and uptime are subject to third-party infrastructure and their respective Terms of Service.
• Inilax does not guarantee perpetual uptime or availability of third-party public edge domain services.
• You are solely responsible for ensuring that public endpoints created via Proxync do not expose sensitive internal staging environments or production credentials.`,
  },
  {
    id: "intellectual-property",
    title: "7. Intellectual Property Rights",
    icon: FileText,
    content: `• Inilax Rights — The Software (including code, native Rust proxy modules, UI designs, brand marks, logos, and website assets) is the exclusive property of Inilax and its licensors, protected by intellectual property laws.
• User Data Ownership — You retain 100% full legal ownership of all data, HTTP traffic logs, API schemas, codebases, collections, and configurations processed or generated using Proxync. Inilax claims zero ownership or rights over your local codebases or intercepted traffic.`,
  },
  {
    id: "warranties",
    title: "8. Disclaimer of Warranties",
    icon: AlertTriangle,
    content: `PROXYNC IS PROVIDED BY INILAX ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED.

TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, INILAX EXPRESSLY DISCLAIMS ALL WARRANTIES, STATUTORY, EXPRESS, OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, AND QUIET ENJOYMENT. INILAX DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, BUG-FREE, SECURE, OR ACCURATE.`,
  },
  {
    id: "liability",
    title: "9. Limitation of Liability",
    icon: Scale,
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL INILAX, ITS DIRECTORS, OFFICERS, EMPLOYEES, AFFILIATES, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA LOSS, BUSINESS INTERRUPTION, OR HARDWARE FAILURE) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OR INABILITY TO USE PROXYNC OR THIRD-PARTY EDGE TUNNELS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`,
  },
  {
    id: "modifications",
    title: "10. Revisions to Terms & Contact Information",
    icon: HelpCircle,
    content: `Inilax reserves the right to modify or replace these Terms at any time. When updates occur, we will publish the updated Terms on our website and adjust the "Last Updated" timestamp. Continued use of Proxync after any revisions constitutes acceptance of the new Terms.

For legal questions, compliance inquiries, or enterprise licensing terms regarding Proxync and Inilax products, please reach out through our official developer support channels:

• Product: Proxync Developer Tunneling Workspace Studio
• Organization: Inilax
• GitHub: https://github.com/Inilax/proxync
• Web: https://proxync.dev`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          {/* Header */}
          <div className="mx-auto max-w-4xl text-center">
            <Eyebrow tone="primary">Inilax Legal &amp; Governance</Eyebrow>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-balance text-base text-on-surface-variant sm:text-lg">
              Terms governing the download, installation, and operation of Proxync, a developer workspace studio product by <strong className="text-on-surface">Inilax</strong>.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs text-on-surface-muted">
              <span>Last Updated: August 20, 2026</span>
              <span>•</span>
              <span className="text-primary font-medium">Effective Version 0.2.1+ (Free &amp; Enterprise)</span>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">Community &amp; Enterprise</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Free standalone local usage for individual developers, plus paid Enterprise tiers for team tunnel sharing and voice/chat.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                <Users size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">Team Collaboration</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Covers Proxync Self-Tunnels, extended tunnel quotas, seat management, and inter-team voice/chat collaboration.
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <FileText size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-on-surface">100% Code Ownership</h3>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Proxync software is owned by Inilax. You retain 100% full legal ownership of your codebases, traffic logs, and APIs.
              </p>
            </div>
          </div>

          {/* Main Legal Content */}
          <div className="mx-auto mt-16 max-w-4xl space-y-10">
            {TERMS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/60 p-6 md:p-8 shadow-card"
                >
                  <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-on-surface">
                      {sec.title}
                    </h2>
                  </div>
                  <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant font-sans">
                    {sec.content}
                  </div>
                </section>
              );
            })}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
