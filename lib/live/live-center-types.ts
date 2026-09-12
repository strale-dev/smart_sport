import type { LiveStatusFilter } from "@/lib/live/constants";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";
import type { Fixture } from "@/types/domain";

export type LiveCenterParams = {
  league?: number;
  status?: LiveStatusFilter;
  page?: number;
};

export type LiveCenterData = {
  fixtures: LiveFixtureRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  upcomingSoon: Fixture[];
  filters: {
    league?: number;
    status?: LiveStatusFilter;
  };
};
