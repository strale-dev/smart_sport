import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIHeroLimitStateProps = {
  limit: number;
  used: number;
};

export function AIHeroLimitState({ limit, used }: AIHeroLimitStateProps) {
  return (
    <Card className="border-warning/30 bg-warning/5 min-h-[min(28vh,14rem)] w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-lg">
          Daily AI limit reached
        </CardTitle>
        <CardDescription className="max-w-lg">
          You have used {used} of {limit} AI analyses today. Cached insights
          remain available; new generations resume tomorrow.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/pricing" />}
        >
          View plans
        </Button>
      </CardContent>
    </Card>
  );
}
