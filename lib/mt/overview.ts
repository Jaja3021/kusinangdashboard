// The Overview page's derived view of the pipeline, in one place so the page
// component stays declarative.

import { isCancelled } from "./pipeline";
import { filterByBranch } from "./revenue";
import type { Opportunity } from "./types";

export type TodayOrder = {
  id: string;
  customer: string;
  branch: string;
  type: string;
  package: string;
  pax: number | string;
  status: string;
};

export type NewInquiry = {
  id: string;
  name: string;
  branch: string;
  type: string;
  date: string;
  note: string;
};

export type OverviewStats = {
  total: number;
  booked: number;
  completed: number;
  pending: number;
  forPreparation: number;
  refunded: number;
  todayCount: number;
  todayItems: TodayOrder[];
  recentNew: NewInquiry[];
};

const MAX_NEW_INQUIRIES = 5;

/**
 * `periodScoped` is filtered by the selected date range (it drives the counts);
 * `allTime` is not, because today's orders must show up regardless of the
 * period the viewer happens to have selected.
 */
export function overviewStats({
  periodScoped,
  allTime,
  branch,
  today,
}: {
  periodScoped: Opportunity[];
  allTime: Opportunity[];
  branch: string;
  today: string;
}): OverviewStats {
  const scoped = filterByBranch(periodScoped, branch);
  const everything = filterByBranch(allTime, branch);

  const todayItems: TodayOrder[] = everything
    .filter((o) => o.eventDate === today && !isCancelled(o))
    .map((o) => ({
      id: o.id,
      customer: o.name,
      branch: o.branch || "—",
      type: o.eventType,
      package: o.packageName || "—",
      pax: o.pax || "—",
      status: o.status,
    }));

  const recentNew: NewInquiry[] = scoped
    .filter((o) => o.status === "New")
    .slice(0, MAX_NEW_INQUIRIES)
    .map((o) => ({
      id: o.id,
      name: o.name,
      branch: o.branch,
      type: o.eventType,
      date: o.createdDate,
      note: o.email || o.phone || "",
    }));

  return {
    total: scoped.length,
    booked: scoped.filter((o) => o.pipelineStatus === "won").length,
    completed: scoped.filter(
      (o) => o.pipelineStatus === "won" && o.paymentStage === "Completed",
    ).length,
    pending: scoped.filter((o) => o.pipelineStatus === "open").length,
    forPreparation: scoped.filter((o) => o.status === "For Preparation").length,
    refunded: scoped
      .filter((o) => o.pipelineStatus === "lost")
      .reduce((total, o) => total + (o.amountPaid || 0), 0),
    todayCount: todayItems.length,
    todayItems,
    recentNew,
  };
}
