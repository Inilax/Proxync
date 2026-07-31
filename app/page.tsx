import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { LogoCloud } from "@/components/logo-cloud";
import { Stats } from "@/components/stats";
import { FeaturesBento } from "@/components/features-bento";
import { FeatureTabs } from "@/components/feature-tabs";
import { HowItWorks } from "@/components/how-it-works";
import { Testimonials } from "@/components/testimonials";
import { Faq } from "@/components/faq";
import { Cta } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogoCloud />
        <Stats />
        <FeaturesBento />
        <FeatureTabs />
        <HowItWorks />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
