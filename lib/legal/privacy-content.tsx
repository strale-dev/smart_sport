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

export function PrivacyContent() {
  return (
    <LegalPageShell title="Privacy Policy">
      <LegalSection title="1. Data controller">
        <p>
          {BRAND.name} (&quot;we&quot;, &quot;us&quot;) operates the Kivora
          website and related services. For privacy inquiries, contact{" "}
          <a
            href={`mailto:${BRAND.privacyEmail}`}
            className="text-info hover:underline"
          >
            {BRAND.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. What data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Waitlist email</strong> — when
            you submit the waitlist form.
          </li>
          <li>
            <strong className="text-foreground">Attribution metadata</strong> —
            optional UTM parameters and referrer URL submitted with the waitlist
            form.
          </li>
          <li>
            <strong className="text-foreground">Analytics data</strong> — if you
            consent to analytics cookies, we collect usage events via PostHog
            (EU region).
          </li>
          <li>
            <strong className="text-foreground">Technical logs</strong> — IP
            address (hashed for rate limiting), browser type, and error reports
            via Sentry (EU region) when errors occur.
          </li>
          <li>
            <strong className="text-foreground">Cookies</strong> — see Section 8
            and our cookie banner.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Legal bases (GDPR Art. 6)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Consent (Art. 6(1)(a))</strong>{" "}
            — waitlist signup: by submitting your email you consent to receive
            waitlist-related communications (including a confirmation email and,
            later, early-access notifications). You may withdraw consent at any
            time by contacting {BRAND.privacyEmail}.
          </li>
          <li>
            <strong className="text-foreground">
              Legitimate interest (Art. 6(1)(f))
            </strong>{" "}
            — security and abuse prevention (rate limiting, hashed IP), service
            reliability (error monitoring), and aggregated analytics where
            permitted — balanced against your rights.
          </li>
          <li>
            <strong className="text-foreground">
              Contract / pre-contractual steps (Art. 6(1)(b))
            </strong>{" "}
            — when you create an account or subscribe (future phases).
          </li>
        </ul>
      </LegalSection>

      {/* TODO(Phase 7): Implement double opt-in — confirmation link in WaitlistConfirmationEmail
          must be clicked before email is marked confirmed and before any marketing list send.
          Required before waitlist blast / launch announcement (ROADMAP Phase 7). */}
      <LegalSection title="4. Waitlist communications">
        <p>
          <strong className="text-foreground">Current flow (Phase 0):</strong>{" "}
          single opt-in. When you submit the waitlist form, your email is stored
          immediately and we send a transactional confirmation email via Resend.
        </p>
        <p>
          We do <strong className="text-foreground">not</strong> send marketing
          broadcasts to the waitlist until we implement double opt-in
          confirmation (planned Phase 7). Until then, emails are limited to
          signup confirmation and direct replies to your inquiries.
        </p>
        <p>
          To unsubscribe or exercise your rights, email{" "}
          <a
            href={`mailto:${BRAND.privacyEmail}`}
            className="text-info hover:underline"
          >
            {BRAND.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Subprocessors">
        <p>We use the following service providers to operate Kivora:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase — database and authentication (EU)</li>
          <li>Resend — transactional email</li>
          <li>PostHog — product analytics (EU region, consent-gated)</li>
          <li>Sentry — error monitoring (EU region)</li>
          <li>Vercel — hosting</li>
          <li>OpenAI — AI analysis (server-side only)</li>
          <li>LemonSqueezy — subscription billing (future)</li>
          <li>Upstash — rate limiting (Redis)</li>
        </ul>
        <p>
          Data Processing Agreements are maintained with subprocessors as
          required by GDPR.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Waitlist emails are retained until you withdraw consent or we delete
            your entry upon request.
          </li>
          <li>
            Analytics events are retained per PostHog project settings
            (typically up to 12 months).
          </li>
          <li>
            Account data (when available) is deleted upon self-service account
            deletion.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          If you are in the EEA/UK, you have the right to access, rectify,
          erase, restrict, port, and object to processing of your personal data,
          and to lodge a complaint with your supervisory authority. Contact{" "}
          <a
            href={`mailto:${BRAND.privacyEmail}`}
            className="text-info hover:underline"
          >
            {BRAND.privacyEmail}
          </a>{" "}
          to exercise these rights.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          We use necessary cookies for session and security. Analytics cookies
          (PostHog) are set only after you opt in via our cookie banner.
          Marketing cookies are not used in the MVP. You can change preferences
          anytime via the cookie settings link in the footer.
        </p>
      </LegalSection>

      <LegalSection title="9. Related documents">
        <p>
          See our{" "}
          <Link href="/terms" className="text-info hover:underline">
            Terms of Service
          </Link>{" "}
          for service terms and disclaimers.
        </p>
        <p className="text-muted-foreground/80 text-xs">{AI_DISCLAIMER}</p>
      </LegalSection>
    </LegalPageShell>
  );
}
