import { ClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ComingSoonCardProps = {
  title: string;
  description: string;
};

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">{title}</CardTitle>
          <Badge variant="outline" className="gap-1">
            <ClockIcon aria-hidden="true" className="size-3" />
            Coming soon
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
