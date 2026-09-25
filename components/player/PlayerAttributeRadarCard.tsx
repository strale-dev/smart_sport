"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { PremiumFeatureLock } from "@/components/entitlements/PremiumFeatureLock";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerAttributeCategories } from "@/lib/players/attribute-categories";
import type { PlayerPosition, PlayerSeasonStatistics } from "@/types/domain";
import { RadarIcon } from "lucide-react";

type PlayerAttributeRadarCardProps = {
  position: PlayerPosition | null;
  stats: PlayerSeasonStatistics | null;
  premiumAnalytics: boolean;
};

export function PlayerAttributeRadarCard({
  position,
  stats,
  premiumAnalytics,
}: PlayerAttributeRadarCardProps) {
  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Attribute profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={RadarIcon}
            title="Attributes unavailable"
            description="Season statistics will appear once the provider publishes them for this competition."
          />
        </CardContent>
      </Card>
    );
  }

  const categories = getPlayerAttributeCategories(stats, position);

  const body =
    categories.length === 0 ? (
      <EmptyState
        icon={RadarIcon}
        title="Attributes unavailable"
        description="Not enough season data to build an attribute profile yet."
      />
    ) : (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={categories} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Radar
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">
            Attribute profile
          </CardTitle>
          {categories.length > 0 && categories.length < 4 ? (
            <DataQualityChip quality="PARTIAL" />
          ) : null}
        </div>
        <CardDescription>
          Derived from provider season stats (0–100 scale). Not official FIFA
          ratings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {premiumAnalytics ? (
          body
        ) : (
          <PremiumFeatureLock
            feature="attribute_profile"
            title="Premium attribute profile"
            description="Unlock the radar profile with position-aware categories derived from season data."
          >
            {body}
          </PremiumFeatureLock>
        )}
      </CardContent>
    </Card>
  );
}
