export const ACTIVITY_ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityEntry = {
  id: string;
  module: string;
  action: ActivityAction;
  entity: string;
  name: string;
  details: string;
  userName: string;
  createdAt: string;
};

export type NewActivityEntry = {
  module: string;
  action: ActivityAction;
  entity: string;
  name: string;
  details?: string;
};
