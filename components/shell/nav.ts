// The dashboard's navigation tree. Paths mirror the deployed app exactly.

import {
  Activity,
  BarChart3,
  Calculator,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileClock,
  FileSpreadsheet,
  FileText,
  Kanban,
  Landmark,
  LayoutGrid,
  LayoutPanelTop,
  MessageCircle,
  Package,
  Receipt,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; path: string; icon: LucideIcon };
export type NavGroup = { label: string | null; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Overview", path: "/dashboard", icon: LayoutGrid },
      { label: "Inquiries", path: "/dashboard/inquiries", icon: MessageCircle },
      { label: "Customers", path: "/dashboard/customers", icon: Users },
      { label: "Menu / Packages", path: "/dashboard/menu", icon: Star },
      { label: "User Access", path: "/dashboard/user-access", icon: ShieldCheck },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Kitchen", path: "/dashboard/kitchen", icon: Kanban },
      { label: "Today's Orders", path: "/dashboard/orders", icon: ClipboardList },
      { label: "Bookings", path: "/dashboard/bookings", icon: CalendarDays },
      { label: "Staff Tasks", path: "/dashboard/staff-tasks", icon: CheckSquare },
      { label: "Inventory", path: "/dashboard/inventory", icon: Package },
      { label: "Costing", path: "/dashboard/costing", icon: Receipt },
      { label: "Activity Log", path: "/dashboard/activity-log", icon: FileClock },
      { label: "Admin Expenses", path: "/dashboard/admin-expenses", icon: FileSpreadsheet },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "Sales", path: "/dashboard/sales", icon: TrendingUp },
      { label: "Payments & Refunds", path: "/dashboard/payments", icon: CreditCard },
      { label: "Branch Performance", path: "/dashboard/branch-performance", icon: BarChart3 },
      { label: "Reports", path: "/dashboard/reports", icon: FileText },
      { label: "Owner Financials", path: "/dashboard/owner-financials", icon: Landmark },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { label: "Cost Calculator", path: "/dashboard/cost-calculator", icon: Calculator },
      { label: "Break-even", path: "/dashboard/breakeven", icon: Activity },
      { label: "Room Diagram", path: "/dashboard/room-diagram", icon: LayoutPanelTop },
    ],
  },
];

/** Primary tabs for the mobile bottom bar; the rest live behind "More". */
export const MOBILE_PRIMARY: NavItem[] = [
  { label: "Overview", path: "/dashboard", icon: LayoutGrid },
  { label: "Kitchen", path: "/dashboard/kitchen", icon: Kanban },
  { label: "Bookings", path: "/dashboard/bookings", icon: CalendarDays },
  { label: "Orders", path: "/dashboard/orders", icon: ClipboardList },
  { label: "Inventory", path: "/dashboard/inventory", icon: Package },
];

const PRIMARY_PATHS = new Set(MOBILE_PRIMARY.map((i) => i.path));

export const MOBILE_MORE: NavItem[] = NAV.flatMap((g) => g.items).filter(
  (item) => !PRIMARY_PATHS.has(item.path),
);
