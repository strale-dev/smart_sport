import type { LiveStatusFilter } from "@/lib/live/constants";
import type { Fixture } from "@/types/domain";

export type LiveCenterParams = {
  league?: number;
  status?: LiveStatusFilter;
  page?: number;
};

export type LiveCenterData = {
  fixtures: Fixture[];
  totalCount: number;
  page: number;
  totalPages: number;
  upcomingSoon: Fixture[];
  filters: {
    league?: number;
    status?: LiveStatusFilter;
  };
};
