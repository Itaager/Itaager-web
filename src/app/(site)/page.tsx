import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Coffee, Heart, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { CreatorCard } from "@/components/site/creator-card";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: featured, count } = await supabase
    .from("creator_profiles")
    .select("*", { count: "exact" })
    .order("total_supporters", { ascending: false })
    .limit(6)
    .returns<CreatorProfile[]>();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative -mt-32 overflow-hidden pt-32 sm:-mt-24 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-gradient-to-b from-brand-soft to-transparent" />
        <FloatingCups />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-14 text-center sm:px-6 md:pt-20">
          <div className="mb-5 animate-rise">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-strong">
              <span className="relative flex size-2.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
              </span>
              Coming soon · Insha Allah
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-2">
            <Smartphone className="size-4 text-ink-3" aria-hidden />
            Payments with EVC Plus
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl animate-rise text-5xl font-bold leading-[1.05] tracking-tight text-ink [animation-delay:80ms] sm:text-7xl">
            Support the creators <span className="text-brand">you love</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
            <strong className="font-semibold text-ink">Itaager</strong> is where Somali creators, developers, artists and educators get supported by their audience — with EVC Plus, in seconds.
          </p>

          {/* Claim your page */}
          <form action="/register" className="mx-auto mt-10 flex max-w-md items-center rounded-full border border-line bg-surface p-1.5 pl-5 shadow-[0_8px_30px_-12px_rgba(65,137,221,0.35)] transition-shadow focus-within:border-brand focus-within:shadow-[0_8px_30px_-8px_rgba(65,137,221,0.5)]">
            <span className="shrink-0 text-[15px] text-ink-3">itaager.so/</span>
            <input
              name="username"
              placeholder="yourname"
              aria-label="Choose your page name"
              autoCapitalize="none"
              spellCheck={false}
              pattern="[a-zA-Z0-9_]{3,30}"
              className="min-w-0 flex-1 bg-transparent px-1 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <button className="btn-sheen h-11 shrink-0 rounded-full bg-cta px-5 text-[15px] font-semibold text-cta-ink transition-all hover:bg-cta-strong active:scale-[0.97]">
              Start my page
            </button>
          </form>
          <p className="mt-4 text-sm text-ink-3">It&apos;s free and takes less than a minute.</p>
        </div>

        <HeroPreview />
      </section>

      {/* Features ---------------------------------------------------------- */}
      <section className="reveal mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-3">Why Itaager</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink">Made for how Somalia pays</h2>
          <p className="mt-4 text-lg text-ink-2">Give your audience a simple way to say thank you.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Feature tint="bg-brand-soft" icon={Smartphone} title="Mobile money" text="Supporters approve the payment on their phone with EVC Plus. No card needed." />
          <Feature tint="bg-brand-soft" icon={ShieldCheck} title="Verified payments" text="Every payment is checked on the server with the provider before it counts." />
          <Feature tint="bg-brand-soft" icon={BarChart3} title="Clear earnings" text="See every supporter, message and payment in a simple dashboard." />
        </div>
      </section>

      {/* How it works ------------------------------------------------------- */}
      <section className="border-y border-line bg-surface-2">
        <div className="reveal mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-3">How it works</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink">Your page is ready in minutes</h2>
            <p className="mt-4 text-lg text-ink-2">No setup fees and no monthly plan. You only pay a small fee when you receive support.</p>
            <LinkButton href="/register" variant="cta" size="lg" className="mt-8 px-7">Start my page</LinkButton>
          </div>
          <ol className="space-y-4">
            {[
              { title: "Create your page", text: "Add your photo, a short bio and your social links." },
              { title: "Share your link", text: "Put it in your bio, videos, GitHub or WhatsApp status." },
              { title: "Receive support", text: "Fans choose an amount, leave a message and pay from their phone." },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-5 rounded-2xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cta text-base font-bold text-cta-ink">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-ink-2">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Creators ------------------------------------------------------------ */}
      {featured && featured.length > 0 && (
        <section className="reveal mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-3">Creators</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink">Meet the creators</h2>
            </div>
            <Link href="/explore" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
              {count && count > 6 ? `See all ${count}` : "See all"} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => <CreatorCard key={c.id} creator={c} />)}
          </div>
        </section>
      )}

      {/* CTA ------------------------------------------------------------------ */}
      <section className="reveal mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-cta px-6 py-16 text-center sm:px-12">
          <div aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-16 -left-10 size-56 rounded-full bg-white/10" />
          <Coffee className="relative mx-auto size-8 animate-float text-cta-ink" aria-hidden />
          <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight text-cta-ink sm:text-5xl">
            Start receiving support today
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-cta-ink/75">Join Somali creators who are funded by the people who enjoy their work.</p>
          <LinkButton href="/register" variant="outline" size="lg" className="relative mt-8 rounded-full border-transparent px-8 font-semibold text-brand-strong hover:-translate-y-0.5 hover:bg-surface">Start my page</LinkButton>
        </div>
      </section>
    </>
  );
}

function Feature({ tint, icon: Icon, title, text }: { tint: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-7">
      <span className={`inline-flex size-12 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="size-6 text-ink" aria-hidden />
      </span>
      <h3 className="mt-6 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}

/** Static illustration of a creator page (decorative, not real data). */
function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="animate-float rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(65,137,221,0.35)]">
          <div className="flex items-center gap-4">
            <Avatar name="Hodan Warsame" size={56} />
            <div>
              <p className="text-lg font-semibold text-ink">Hodan Warsame</p>
              <p className="text-sm text-ink-3">Illustrator · Hargeisa</p>
            </div>
          </div>
          <p className="mt-5 leading-relaxed text-ink-2">
            I draw Somali folk stories for children. Every coffee helps me finish the next book.
          </p>
          <div className="mt-6 space-y-3">
            {[
              { name: "Ayaan", amount: "$5", text: "My daughter loves your drawings!" },
              { name: "Abdi", amount: "$3", text: "Keep going, walaal." },
            ].map((m) => (
              <div key={m.name} className="flex gap-3 rounded-xl bg-surface-2 p-3.5">
                <Heart className="mt-0.5 size-4 shrink-0 fill-brand text-brand" />
                <p className="text-sm text-ink-2">
                  <span className="font-semibold text-ink">{m.name}</span> bought {m.amount} · {m.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-float rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(65,137,221,0.35)] [animation-delay:1.5s]">
          <p className="text-lg font-semibold text-ink">Support Hodan</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {["$1", "$3", "$5", "$10"].map((a, i) => (
              <span key={a} className={`rounded-xl border py-3 text-center text-sm font-semibold ${i === 2 ? "border-brand bg-brand text-white" : "border-line text-ink"}`}>
                {a}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="h-11 rounded-xl border border-line px-3.5 text-sm leading-[44px] text-ink-3">Your name</div>
            <div className="h-11 rounded-xl border border-line px-3.5 text-sm leading-[44px] text-ink-3">61 234 5678</div>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-line px-3.5 text-sm text-ink-3">
              <MessageCircle className="size-4" /> Say something nice…
            </div>
          </div>
          <span className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-cta font-semibold text-cta-ink">
            <Coffee className="size-5" /> Support $5
          </span>
        </div>
      </div>
    </div>
  );
}

/** Small coffee cups drifting in the hero background (decorative). */
function FloatingCups() {
  const cups = [
    { cls: "left-[8%] top-[18%] size-7", delay: "0s", r: "-12deg" },
    { cls: "right-[10%] top-[14%] size-9", delay: "1.2s", r: "10deg" },
    { cls: "left-[14%] top-[56%] size-5", delay: "2.4s", r: "8deg" },
    { cls: "right-[16%] top-[52%] size-6", delay: "0.8s", r: "-8deg" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      {cups.map((c) => (
        <Coffee
          key={c.cls}
          className={`absolute animate-float text-brand/30 ${c.cls}`}
          style={{ animationDelay: c.delay, ["--r" as string]: c.r }}
        />
      ))}
    </div>
  );
}

const FAQ = [
  {
    q: "What is Itaager?",
    a: "Itaager is a creator-support platform for Somalia. Creators get a free public page where fans can support them with small payments using EVC Plus mobile money.",
  },
  {
    q: "What does Itaager do?",
    a: "Itaager lets supporters choose an amount, leave a message and pay a creator from their phone with EVC Plus. Creators see every payment, supporter and message in their dashboard.",
  },
  {
    q: "How do I pay on Itaager?",
    a: "Enter your EVC Plus number, approve the prompt on your phone with your PIN, and the payment is confirmed. No card or bank account is needed.",
  },
  {
    q: "How much does Itaager cost?",
    a: "Creating a page is free. A small platform fee is taken only from successful payments.",
  },
];

/** Structured data so Google and AI assistants understand what Itaager is. */
function jsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Itaager",
      url: siteUrl,
      logo: `${siteUrl}/icon`,
      description: FAQ[0].a,
      areaServed: { "@type": "Country", name: "Somalia" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Itaager",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/explore?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  // Escape "<" so content can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
