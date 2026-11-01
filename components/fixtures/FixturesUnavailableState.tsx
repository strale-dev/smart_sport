import { CloudOffIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const FIXTURES_UNAVAILABLE_TEST_ID = "fixtures-unavailable-state";

export function FixturesUnavailableState() {
  return (
    <div
      data-testid={FIXTURES_UNAVAILABLE_TEST_ID}
      role="status"
      className="space-y-4"
    >
      <EmptyState
        icon={CloudOffIcon}
        title="Podaci o mečevima trenutno nisu dostupni"
        description="Provajder podataka i poslednja sinhronizacija nisu vratili sačuvane mečeve za ovaj prozor. Pokušajte ponovo za nekoliko minuta."
        actions={[
          { label: "Live Center", href: "/live" },
          {
            label: "Centar predviđanja",
            href: "/predictions",
            variant: "outline",
          },
        ]}
      />
    </div>
  );
}
