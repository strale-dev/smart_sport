/**
 * LEGAL RISK — Phase 7 lawyer MUST review separately (not routine ToS pass):
 * Advertising regulation for content displaying match outcome percentages varies
 * by jurisdiction. No-gambling + AI disclaimer wording below is a deliberate
 * risk mitigation, not boilerplate formality.
 */

import Link from "next/link";

import { AI_DISCLAIMER, BRAND, legalMeta } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cn("mx-auto w-full max-w-3xl space-y-8 px-4 py-16")}>
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">
          Last updated: {legalMeta.lastUpdated}. {legalMeta.selfReviewNote}
        </p>
      </header>
      <div className="space-y-8">{children}</div>
    </article>
  );
}

export function TermsContent() {
  return (
    <LegalPageShell title="Terms of Service">
      <LegalSection title="1. Agreement">
        <p>
          By accessing {BRAND.name} (&quot;the Service&quot;), you agree to
          these Terms. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Service description">
        <p>
          {BRAND.name} provides football analytics, statistical modeling, and
          AI-generated explanatory content for informational and educational
          purposes. Features may change during early access and beta periods.
        </p>
      </LegalSection>

      <LegalSection title="3. Waitlist and accounts">
        <p>
          Submitting your email to the waitlist constitutes acceptance of these
          Terms and our{" "}
          <Link href="/privacy" className="text-info hover:underline">
            Privacy Policy
          </Link>
          . Full account registration and subscription terms apply when those
          features launch.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Abuse, scrape, or reverse-engineer the Service</li>
          <li>Circumvent rate limits or access controls</li>
          <li>Use the Service for unlawful purposes</li>
          <li>Reproduce AI outputs as guaranteed facts or betting tips</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. No gambling — predictive analysis only">
        <p>
          {BRAND.name} is <strong className="text-foreground">not</strong> a
          betting service, bookmaker, or gambling advisor.
        </p>
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-foreground p-3 font-medium">Term</th>
                <th className="text-foreground p-3 font-medium">
                  What {BRAND.name} provides
                </th>
                <th className="text-foreground p-3 font-medium">
                  What {BRAND.name} does not provide
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              <tr>
                <td className="p-3">Predictive analysis</td>
                <td className="p-3">
                  Model-based probabilities, forecasts, and analytical estimates
                </td>
                <td className="p-3">
                  Betting advice or wagering recommendations
                </td>
              </tr>
              <tr>
                <td className="p-3">Confidence indicators</td>
                <td className="p-3">
                  Signals of data quality and model uncertainty
                </td>
                <td className="p-3">
                  &quot;Sure bets&quot;, implied odds, or guaranteed outcomes
                </td>
              </tr>
              <tr>
                <td className="p-3">Language</td>
                <td className="p-3">
                  Analytical insights, estimates, structured explanations
                </td>
                <td className="p-3">
                  &quot;Place a bet&quot;, value-pick hype, bookmaker references
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Match outcome percentages and confidence scores are{" "}
          <strong className="text-foreground">
            predictive analysis and confidence indicators
          </strong>{" "}
          for informational purposes only. They are{" "}
          <strong className="text-foreground">not betting advice</strong> and
          must not be used as the basis for gambling or wagering decisions.
        </p>
        <p>
          We do not display odds, facilitate bets, or link to bookmakers. You
          use {BRAND.name} at your own discretion and risk.
        </p>
      </LegalSection>

      <LegalSection title="6. AI disclaimer">
        <p>{AI_DISCLAIMER}</p>
        <p>
          AI outputs may be incomplete, outdated, or incorrect. Always verify
          critical information independently. {BRAND.name} does not guarantee
          accuracy of predictions, analyses, or third-party data feeds.
        </p>
      </LegalSection>

      <LegalSection title="7. Subscriptions (future)">
        <p>
          Paid plans, trials, and billing will be governed by additional terms
          shown at checkout. Prices and features may change with notice.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {BRAND.name} is provided
          &quot;as is&quot; without warranties. We are not liable for indirect,
          incidental, or consequential damages arising from your use of the
          Service, including any gambling losses.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          We may suspend or terminate access for violations of these Terms. You
          may stop using the Service at any time.
        </p>
      </LegalSection>

      <LegalSection title="10. Governing law">
        <p>
          These Terms are governed by applicable law in the jurisdiction of the
          data controller (to be confirmed in formal legal review). Disputes
          shall be resolved in competent courts of that jurisdiction unless
          mandatory consumer protection law provides otherwise.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="text-info hover:underline"
          >
            {BRAND.contactEmail}
          </a>
          . Privacy requests:{" "}
          <a
            href={`mailto:${BRAND.privacyEmail}`}
            className="text-info hover:underline"
          >
            {BRAND.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
