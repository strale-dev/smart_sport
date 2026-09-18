import { AI_DISCLAIMER, BRAND } from "@/lib/marketing/copy";

export function MethodologyContent() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-3">
        <p className="text-primary text-sm font-medium tracking-wide uppercase">
          Transparency
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          How our model works
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {BRAND.name} combines real football data, statistical modeling, and AI
          explanations. The numbers come first; the AI explains what they mean.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          1. Data before narrative
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Every prediction starts with provider data normalized into Postgres.
          If a stat is missing, the UI shows unavailable — never a made-up
          placeholder. Data quality and confidence are always visible.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">2. Elo ratings</h2>
        <p className="text-muted-foreground leading-relaxed">
          Team strength begins with Elo ratings updated from historical results.
          Elo provides a stable baseline for how strong each side is relative to
          the league.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          3. Logistic regression (1/X/2)
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Win probabilities combine Elo with lightweight features: recent form,
          home advantage, rest days, head-to-head recency, and league position.
          A logistic model converts these features into home/draw/away
          probabilities.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          4. Bivariate Poisson (goals)
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Expected goals use a Bivariate Poisson model derived from the same
          feature set. This produces an expected goals range and supports both
          teams to score and underdog threat estimates.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          5. Confidence buckets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-2 pr-4 font-medium">Bucket</th>
                <th className="py-2 font-medium">Threshold</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-border/70 border-b">
                <td className="py-2 pr-4">HIGH</td>
                <td className="py-2">max probability &gt; 60%</td>
              </tr>
              <tr className="border-border/70 border-b">
                <td className="py-2 pr-4">MEDIUM</td>
                <td className="py-2">40% ≤ max probability ≤ 60%</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">LOW</td>
                <td className="py-2">max probability &lt; 40%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          6. Predictions Center (Top 10 picks)
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Each UTC day we rank upcoming allowlist fixtures (status NS/TBD) that
          have a fresh pre-match model output. A fixture must pass configurable
          thresholds — by default: max outcome probability ≥ 55%, confidence ≥
          MEDIUM, and data quality ≥ PARTIAL.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Ranking score ={" "}
          <span className="font-mono text-sm">
            model_probability × confidence_score × data_quality_score
          </span>
          . Confidence scores: HIGH 1.0, MEDIUM 0.85, LOW 0.65. Data quality:
          COMPLETE 1.0, PARTIAL 0.75. We show the top 10 after sorting. There
          are no betting odds, no bookmaker data, and no &quot;value edge&quot;
          language — only transparent model estimates.
        </p>
        <p className="text-muted-foreground text-sm">
          Tune thresholds in deployment with{" "}
          <span className="font-mono">TOP_PICKS_MIN_MODEL_PROBABILITY</span>,{" "}
          <span className="font-mono">TOP_PICKS_MIN_CONFIDENCE</span>,{" "}
          <span className="font-mono">TOP_PICKS_MIN_DATA_QUALITY</span>, and{" "}
          <span className="font-mono">TOP_PICKS_LIMIT</span>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">
          7. AI explanation layer
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The LLM receives structured model outputs and trusted context only. It
          explains probabilities, key factors, and scenarios — it does not
          invent statistics or override the model. Outputs are validated with
          Zod and cached until meaningful inputs change.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-medium">8. Limitations</h2>
        <p className="text-muted-foreground leading-relaxed">
          Cold-start leagues and partial data reduce confidence. The MVP model
          is intentionally interpretable rather than a black-box neural network.
          Predictions are analytical estimates, not guarantees.
        </p>
      </section>

      <footer className="border-border space-y-3 border-t pt-6">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {AI_DISCLAIMER}
        </p>
        <p className="text-muted-foreground text-sm">
          See also our{" "}
          <a
            href="/privacy"
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="/terms"
            className="text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </a>
          .
        </p>
      </footer>
    </article>
  );
}
