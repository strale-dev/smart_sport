import Link from "next/link";
import { RadioIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardQuickLinks() {
  return (
    <div className="flex w-full flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/predictions" />}
      >
        <SparklesIcon />
        Predictions Center
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/live" />}
      >
        <RadioIcon />
        Live Center
      </Button>
    </div>
  );
}
