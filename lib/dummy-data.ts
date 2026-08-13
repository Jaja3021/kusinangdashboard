// Centralized dummy data for the Kusinang Pamana operations dashboard.
// All figures are illustrative only.

export const BRANCHES = ["Quezon City", "Makati", "Cebu"] as const;

// ---------- Inquiries ----------
export type Inquiry = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  guests: number;
  phone: string;
  status: "New" | "In Progress" | "Converted" | "Lost";
  receivedAt: string;
  branch?: string;
};

export const inquiries: Inquiry[] = [
  { id: "INQ-241", name: "Angelica Ramos", eventType: "Wedding Reception", eventDate: "Oct 18, 2026", guests: 180, phone: "0917 220 4471", status: "New", receivedAt: "Today, 9:12 AM" },
  { id: "INQ-240", name: "Ferdinand Aquino", eventType: "Debut", eventDate: "Sep 5, 2026", guests: 120, phone: "0918 552 3390", status: "In Progress", receivedAt: "Today, 8:47 AM" },
  { id: "INQ-239", name: "Teresita Lim", eventType: "Corporate Gala", eventDate: "Aug 29, 2026", guests: 300, phone: "0920 114 6602", status: "In Progress", receivedAt: "Yesterday, 4:30 PM" },
  { id: "INQ-238", name: "Michael Garcia", eventType: "Christening", eventDate: "Sep 20, 2026", guests: 80, phone: "0919 887 1235", status: "Converted", receivedAt: "Yesterday, 2:05 PM" },
  { id: "INQ-237", name: "Rosario Torres", eventType: "Fiesta Reunion", eventDate: "Aug 22, 2026", guests: 150, phone: "0917 664 9021", status: "Converted", receivedAt: "Aug 9, 2026" },
  { id: "INQ-236", name: "Benjamin Flores", eventType: "Wedding Reception", eventDate: "Nov 14, 2026", guests: 220, phone: "0921 330 8845", status: "New", receivedAt: "Aug 9, 2026" },
  { id: "INQ-235", name: "Cristina Del Rosario", eventType: "Birthday Party", eventDate: "Sep 1, 2026", guests: 60, phone: "0918 774 5512", status: "Lost", receivedAt: "Aug 7, 2026" },
  { id: "INQ-234", name: "Paolo Fernandez", eventType: "Corporate Gala", eventDate: "Oct 3, 2026", guests: 250, phone: "0917 902 6634", status: "Converted", receivedAt: "Aug 6, 2026" },
];

// ---------- Customers ----------
export type Customer = {
  id: string;
  name: string;
  contact: string;
  totalBookings: number;
  lifetimeSpend: number;
  tier: "Platinum" | "Gold" | "Silver";
  lastEvent: string;
};

export const customers: Customer[] = [
  { id: "CUS-101", name: "Maria Santos", contact: "maria.santos@gmail.com", totalBookings: 6, lifetimeSpend: 812000, tier: "Platinum", lastEvent: "Wedding Reception — Jun 2026" },
  { id: "CUS-102", name: "Josefina Cruz", contact: "jo.cruz88@gmail.com", totalBookings: 4, lifetimeSpend: 456000, tier: "Gold", lastEvent: "Debut — Apr 2026" },
  { id: "CUS-103", name: "Ramon Dela Cruz", contact: "ramon.delacruz@yahoo.com", totalBookings: 3, lifetimeSpend: 298500, tier: "Gold", lastEvent: "Christening — Mar 2026" },
  { id: "CUS-104", name: "Antonio Reyes", contact: "tonyreyes@outlook.com", totalBookings: 8, lifetimeSpend: 1150000, tier: "Platinum", lastEvent: "Corporate Gala — Jul 2026" },
  { id: "CUS-105", name: "Liza Bautista", contact: "liza.b@gmail.com", totalBookings: 2, lifetimeSpend: 142000, tier: "Silver", lastEvent: "Birthday Party — May 2026" },
  { id: "CUS-106", name: "Carlo Mendoza", contact: "carlo.mendoza@gmail.com", totalBookings: 5, lifetimeSpend: 604000, tier: "Gold", lastEvent: "Fiesta Reunion — Jul 2026" },
  { id: "CUS-107", name: "Grace Villanueva", contact: "gvillanueva@gmail.com", totalBookings: 1, lifetimeSpend: 68000, tier: "Silver", lastEvent: "Christening — Feb 2026" },
  { id: "CUS-108", name: "Angelica Ramos", contact: "angie.ramos@gmail.com", totalBookings: 1, lifetimeSpend: 0, tier: "Silver", lastEvent: "Inquiry only" },
];

// ---------- Menu / Packages ----------
export type MenuBranch = "Both" | (typeof BRANCHES)[number];

export type MenuPackage = {
  id: string;
  code: string;
  name: string;
  pax: string;
  basePrice: number;
  group: string;
  branch: MenuBranch;
  active: boolean;
  inclusions: string[];
};

export const menuPackages: MenuPackage[] = [
  { id: "PKG-fam-c1", code: "fam-c1", name: "Chicken Adobo Family Combo", pax: "15 pax", basePrice: 8500, group: "Family Combos", branch: "Both", active: true, inclusions: ["Chicken Adobo", "Steamed Rice", "Pancit Bihon", "Buko Juice"] },
  { id: "PKG-fam-c2", code: "fam-c2", name: "Pork Sinigang Family Combo", pax: "15 pax", basePrice: 9000, group: "Family Combos", branch: "Both", active: true, inclusions: ["Sinigang na Baboy", "Steamed Rice", "Ensaladang Talong", "Buko Juice"] },
  { id: "PKG-fam-c3", code: "fam-c3", name: "Kare-Kare Family Combo", pax: "15 pax", basePrice: 10500, group: "Family Combos", branch: "Quezon City", active: true, inclusions: ["Kare-Kare", "Bagoong", "Steamed Rice", "Leche Flan"] },
  { id: "PKG-feast-c1", code: "feast-c1", name: "Lechon Belly Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Lechon Belly", "Pancit Palabok", "Garlic Rice", "Buko Pandan"] },
  { id: "PKG-feast-c2", code: "feast-c2", name: "Crispy Pata Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Crispy Pata", "Java Rice", "Ensaladang Talong", "Leche Flan"] },
  { id: "PKG-feast-c3", code: "feast-c3", name: "Bicol Express Feast Combo", pax: "15 pax", basePrice: 12000, group: "Feast Combos", branch: "Makati", active: true, inclusions: ["Bicol Express", "Steamed Rice", "Lumpiang Shanghai", "Buko Juice"] },
  { id: "PKG-feast-c4", code: "feast-c4", name: "Beef Caldereta Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Beef Caldereta", "Garlic Rice", "Pancit Bihon", "Buko Pandan"] },
  { id: "PKG-feast-c5", code: "feast-c5", name: "Pancit Palabok Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Pancit Palabok", "Lumpiang Shanghai", "Steamed Rice", "Leche Flan"] },
  { id: "PKG-feast-c6", code: "feast-c6", name: "Chicken Inasal Feast Combo", pax: "15 pax", basePrice: 15000, group: "Feast Combos", branch: "Cebu", active: false, inclusions: ["Chicken Inasal", "Java Rice", "Atchara", "Buko Juice"] },
  { id: "PKG-feast-c7", code: "feast-c7", name: "Seafood Kare-Kare Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Seafood Kare-Kare", "Bagoong", "Steamed Rice", "Buko Pandan"] },
  { id: "PKG-feast-c8", code: "feast-c8", name: "Beef Mechado Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Both", active: true, inclusions: ["Beef Mechado", "Garlic Rice", "Ensaladang Talong", "Leche Flan"] },
  { id: "PKG-feast-c9", code: "feast-c9", name: "Dinuguan Feast Combo", pax: "25 pax", basePrice: 15000, group: "Feast Combos", branch: "Quezon City", active: true, inclusions: ["Dinuguan", "Puto", "Steamed Rice", "Buko Juice"] },
  { id: "PKG-prem-c1", code: "prem-c1", name: "Lechon Belly Premium Combo", pax: "15 pax", basePrice: 20000, group: "Premium", branch: "Both", active: true, inclusions: ["Whole Lechon Belly", "Kare-Kare", "Pancit Palabok", "Buko Pandan", "Leche Flan"] },
  { id: "PKG-xxxl-c1", code: "xxxl-c1", name: "Whole Lechon XXXL Combo", pax: "25 pax", basePrice: 17000, group: "XXXL Combos", branch: "Both", active: true, inclusions: ["Whole Lechon", "Pancit Bihon", "Garlic Rice", "Buko Juice"] },
  { id: "PKG-xxxl-c2", code: "xxxl-c2", name: "Boodle Fight XXXL Combo", pax: "25 pax", basePrice: 17000, group: "XXXL Combos", branch: "Both", active: true, inclusions: ["Grilled Liempo", "Inihaw na Bangus", "Garlic Rice", "Ensaladang Talong"] },
  { id: "PKG-2xxxl-c1", code: "2xxxl-c1", name: "Grand Fiesta 2 XXXL Combo", pax: "50 pax", basePrice: 34000, group: "2 XXXL Combos", branch: "Both", active: true, inclusions: ["2 Whole Lechon", "Kare-Kare", "Pancit Palabok", "Buko Pandan"] },
  { id: "PKG-named-1", code: "named-1", name: "Kusinang Pamana Signature Package", pax: "30 pax", basePrice: 25000, group: "Named Packages", branch: "Both", active: true, inclusions: ["Lechon Belly", "Beef Caldereta", "Pancit Palabok", "Leche Flan", "Buko Juice"] },
  { id: "PKG-special-1", code: "special-1", name: "Simbang Gabi Merienda Special", pax: "40 pax", basePrice: 12000, group: "Special Package", branch: "Both", active: true, inclusions: ["Puto Bumbong", "Bibingka", "Salabat", "Suman"] },
];

// ---------- Menu / Dishes ----------
// Individual a la carte dishes reuse the MenuPackage shape (pax/inclusions
// are simply unused for this tab) so the Menu page can render every tab
// through one shared table and edit form.
export const menuDishes: MenuPackage[] = [
  { id: "DSH-01", code: "dish-01", name: "Chicken Adobo", pax: "", basePrice: 280, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-02", code: "dish-02", name: "Beef Caldereta", pax: "", basePrice: 380, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-03", code: "dish-03", name: "Kare-Kare", pax: "", basePrice: 420, group: "Ulam", branch: "Quezon City", active: true, inclusions: [] },
  { id: "DSH-04", code: "dish-04", name: "Lechon Kawali", pax: "", basePrice: 350, group: "Ulam", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-05", code: "dish-05", name: "Sinigang na Baboy", pax: "", basePrice: 320, group: "Soups", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-06", code: "dish-06", name: "Bicol Express", pax: "", basePrice: 300, group: "Ulam", branch: "Makati", active: true, inclusions: [] },
  { id: "DSH-07", code: "dish-07", name: "Pancit Bihon", pax: "", basePrice: 250, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-08", code: "dish-08", name: "Pancit Palabok", pax: "", basePrice: 270, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-09", code: "dish-09", name: "Garlic Rice", pax: "", basePrice: 120, group: "Rice & Noodles", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-10", code: "dish-10", name: "Lumpiang Shanghai", pax: "", basePrice: 220, group: "Appetizers", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-11", code: "dish-11", name: "Leche Flan", pax: "", basePrice: 180, group: "Dessert", branch: "Both", active: true, inclusions: [] },
  { id: "DSH-12", code: "dish-12", name: "Buko Pandan", pax: "", basePrice: 190, group: "Dessert", branch: "Cebu", active: true, inclusions: [] },
  { id: "DSH-13", code: "dish-13", name: "Puto Bumbong", pax: "", basePrice: 150, group: "Kakanin", branch: "Both", active: false, inclusions: [] },
  { id: "DSH-14", code: "dish-14", name: "Halo-Halo", pax: "", basePrice: 160, group: "Dessert", branch: "Both", active: true, inclusions: [] },
];

// ---------- Menu / Grazing, Catering & Packed Meals ----------
export const grazingSpreads: MenuPackage[] = [
  { id: "GRZ-01", code: "graze-1", name: "Fiesta Grazing Table", pax: "50 pax", basePrice: 15000, group: "Grazing", branch: "Both", active: true, inclusions: ["Charcuterie & Local Cheeses", "Fresh Fruits", "Bibingka Bites", "Assorted Kakanin"] },
  { id: "GRZ-02", code: "graze-2", name: "Kakanin & Fruits Grazing Spread", pax: "30 pax", basePrice: 9000, group: "Grazing", branch: "Quezon City", active: true, inclusions: ["Assorted Kakanin", "Fresh Fruits", "Suman", "Buko Pandan Bites"] },
];

export const cateringPackages: MenuPackage[] = [
  { id: "CTR-01", code: "cater-1", name: "Full Service Wedding Catering", pax: "150 pax", basePrice: 145000, group: "Catering", branch: "Both", active: true, inclusions: ["Lechon", "Beef Caldereta", "Pancit Palabok", "Dessert Bar", "Full Table Service"] },
  { id: "CTR-02", code: "cater-2", name: "Corporate Event Catering", pax: "100 pax", basePrice: 95000, group: "Catering", branch: "Both", active: true, inclusions: ["Chicken Inasal", "Garlic Rice", "Pancit Bihon", "Bottled Water"] },
];

export const packedMeals: MenuPackage[] = [
  { id: "PCK-01", code: "pack-1", name: "Standard Packed Meal", pax: "1 pax", basePrice: 180, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Choice of Ulam", "Steamed Rice", "Bottled Water"] },
  { id: "PCK-02", code: "pack-2", name: "Deluxe Packed Meal", pax: "1 pax", basePrice: 250, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Two Ulam", "Steamed Rice", "Dessert", "Bottled Water"] },
  { id: "PCK-03", code: "pack-3", name: "Vegetarian Packed Meal", pax: "1 pax", basePrice: 200, group: "Packed Meals", branch: "Makati", active: true, inclusions: ["Vegetable Ulam", "Steamed Rice", "Fruit"] },
  { id: "PCK-04", code: "pack-4", name: "Executive Packed Meal", pax: "1 pax", basePrice: 320, group: "Packed Meals", branch: "Both", active: true, inclusions: ["Premium Ulam", "Garlic Rice", "Dessert", "Bottled Water", "Individually Boxed"] },
];

// ---------- Today's Orders ----------
// Real orders now live in Supabase — see lib/orders/data.ts. This dummy set
// was replaced there and on the Kitchen board.

// ---------- Bookings ----------
export type Booking = {
  id: string;
  client: string;
  eventType: string;
  date: string;
  time: string;
  guests: number;
  branch: string;
  package: string;
  venue: string;
  status: "Confirmed" | "Pending Deposit" | "Completed" | "Cancelled";
};

export const bookings: Booking[] = [
  { id: "BK-5021", client: "Antonio Reyes", eventType: "Corporate Gala", date: "Aug 29, 2026", time: "6:00 PM", guests: 300, branch: "Makati", package: "Grand Wedding Course", venue: "Makati Diamond Hall", status: "Confirmed" },
  { id: "BK-5020", client: "Michael Garcia", eventType: "Christening", date: "Sep 20, 2026", time: "12:00 PM", guests: 80, branch: "Quezon City", package: "Boodle Fight Feast", venue: "Garcia Residence", status: "Pending Deposit" },
  { id: "BK-5019", client: "Rosario Torres", eventType: "Fiesta Reunion", date: "Aug 22, 2026", time: "1:00 PM", guests: 150, branch: "Cebu", package: "Pamana Heritage Buffet", venue: "Barangay Covered Court", status: "Confirmed" },
  { id: "BK-5018", client: "Paolo Fernandez", eventType: "Corporate Gala", date: "Oct 3, 2026", time: "7:00 PM", guests: 250, branch: "Makati", package: "Pamana Heritage Buffet", venue: "The Peninsula Ballroom", status: "Confirmed" },
  { id: "BK-5017", client: "Josefina Cruz", eventType: "Debut", date: "Apr 12, 2026", time: "6:30 PM", guests: 120, branch: "Quezon City", package: "Grand Wedding Course", venue: "Cruz Family Garden", status: "Completed" },
  { id: "BK-5016", client: "Grace Villanueva", eventType: "Christening", date: "Feb 8, 2026", time: "11:00 AM", guests: 70, branch: "Cebu", package: "Fiesta Grazing Table", venue: "St. Peter's Parish Hall", status: "Completed" },
  { id: "BK-5015", client: "Benjamin Flores", eventType: "Wedding Reception", date: "Nov 14, 2026", time: "5:00 PM", guests: 220, branch: "Makati", package: "Grand Wedding Course", venue: "Fernwood Gardens", status: "Pending Deposit" },
  { id: "BK-5014", client: "Liza Bautista", eventType: "Birthday Party", date: "May 3, 2026", time: "3:00 PM", guests: 55, branch: "Quezon City", package: "Simbang Gabi Merienda", venue: "Bautista Residence", status: "Cancelled" },
];

// ---------- Staff Tasks ----------
export type StaffTask = {
  id: string;
  task: string;
  assignee: string;
  event: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Done";
};

export const staffTasks: StaffTask[] = [
  { id: "TSK-812", task: "Confirm lechon supplier delivery", assignee: "Chef Danilo Ocampo", event: "BK-5021 — Corporate Gala", dueDate: "Aug 27, 2026", priority: "High", status: "In Progress" },
  { id: "TSK-811", task: "Finalize seating chart", assignee: "Nina Ponce", event: "BK-5018 — Corporate Gala", dueDate: "Sep 25, 2026", priority: "Medium", status: "To Do" },
  { id: "TSK-810", task: "Pack chafing dishes & linens", assignee: "Ruel Santiago", event: "BK-5019 — Fiesta Reunion", dueDate: "Aug 21, 2026", priority: "High", status: "To Do" },
  { id: "TSK-809", task: "Coordinate with venue for load-in", assignee: "Ella Marquez", event: "BK-5020 — Christening", dueDate: "Sep 19, 2026", priority: "Medium", status: "To Do" },
  { id: "TSK-808", task: "Print menu cards", assignee: "Nina Ponce", event: "BK-5015 — Wedding Reception", dueDate: "Nov 10, 2026", priority: "Low", status: "To Do" },
  { id: "TSK-807", task: "Staff briefing — service flow", assignee: "Ruel Santiago", event: "BK-5021 — Corporate Gala", dueDate: "Aug 28, 2026", priority: "High", status: "To Do" },
  { id: "TSK-806", task: "Post-event inventory reconciliation", assignee: "Ella Marquez", event: "BK-5016 — Christening", dueDate: "Feb 9, 2026", priority: "Low", status: "Done" },
  { id: "TSK-805", task: "Client menu tasting", assignee: "Chef Danilo Ocampo", event: "BK-5015 — Wedding Reception", dueDate: "Aug 30, 2026", priority: "Medium", status: "In Progress" },
];

// ---------- Inventory ----------
export type InventoryItem = {
  id: string;
  item: string;
  category: string;
  stock: number;
  unit: string;
  reorderLevel: number;
};

export const inventory: InventoryItem[] = [
  { id: "INV-01", item: "Whole Lechon (roasted, medium)", category: "Protein", stock: 4, unit: "pcs", reorderLevel: 6 },
  { id: "INV-02", item: "Jasmine Rice", category: "Dry Goods", stock: 38, unit: "sacks (50kg)", reorderLevel: 15 },
  { id: "INV-03", item: "Banana Leaves", category: "Serviceware", stock: 120, unit: "bundles", reorderLevel: 100 },
  { id: "INV-04", item: "Chafing Dishes", category: "Equipment", stock: 22, unit: "sets", reorderLevel: 20 },
  { id: "INV-05", item: "Disposable Utensil Sets", category: "Serviceware", stock: 850, unit: "pcs", reorderLevel: 500 },
  { id: "INV-06", item: "Peanut Sauce Base (Kare-Kare)", category: "Ingredient", stock: 9, unit: "tubs", reorderLevel: 12 },
  { id: "INV-07", item: "Bihon Noodles", category: "Dry Goods", stock: 30, unit: "kg", reorderLevel: 20 },
  { id: "INV-08", item: "Table Linens (round, ivory)", category: "Serviceware", stock: 65, unit: "pcs", reorderLevel: 40 },
  { id: "INV-09", item: "Propane Gas Tanks", category: "Equipment", stock: 5, unit: "tanks", reorderLevel: 8 },
];

// ---------- Costing ----------
export type Costing = {
  id: string;
  packageName: string;
  ingredientCost: number;
  laborCost: number;
  overheadCost: number;
  sellingPrice: number;
};

export const costing: Costing[] = [
  { id: "CST-01", packageName: "Pamana Heritage Buffet", ingredientCost: 420, laborCost: 130, overheadCost: 90, sellingPrice: 950 },
  { id: "CST-02", packageName: "Fiesta Grazing Table", ingredientCost: 290, laborCost: 90, overheadCost: 60, sellingPrice: 650 },
  { id: "CST-03", packageName: "Boodle Fight Feast", ingredientCost: 340, laborCost: 110, overheadCost: 70, sellingPrice: 780 },
  { id: "CST-04", packageName: "Packed Meals for Teams", ingredientCost: 140, laborCost: 45, overheadCost: 35, sellingPrice: 320 },
  { id: "CST-05", packageName: "Simbang Gabi Merienda", ingredientCost: 120, laborCost: 40, overheadCost: 30, sellingPrice: 280 },
  { id: "CST-06", packageName: "Grand Wedding Course", ingredientCost: 640, laborCost: 210, overheadCost: 150, sellingPrice: 1450 },
];

// ---------- Activity Log ----------
export type ActivityEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
};

export const activityLog: ActivityEntry[] = [
  { id: "ACT-01", timestamp: "Today, 10:42 AM", user: "Ella Marquez", action: "Marked booking BK-5019 as Confirmed" },
  { id: "ACT-02", timestamp: "Today, 9:55 AM", user: "Nina Ponce", action: "Updated menu package \"Boodle Fight Feast\" pricing" },
  { id: "ACT-03", timestamp: "Today, 9:12 AM", user: "System", action: "New inquiry received from Angelica Ramos" },
  { id: "ACT-04", timestamp: "Yesterday, 5:20 PM", user: "Ruel Santiago", action: "Logged inventory count for Quezon City branch" },
  { id: "ACT-05", timestamp: "Yesterday, 3:02 PM", user: "Chef Danilo Ocampo", action: "Approved final menu for BK-5021" },
  { id: "ACT-06", timestamp: "Yesterday, 1:15 PM", user: "Nina Ponce", action: "Recorded payment of ₱220,000 for BK-5017" },
  { id: "ACT-07", timestamp: "Aug 9, 2026, 4:40 PM", user: "Ella Marquez", action: "Closed inquiry INQ-235 as Lost" },
  { id: "ACT-08", timestamp: "Aug 9, 2026, 11:00 AM", user: "System", action: "Generated monthly sales report for July 2026" },
];

// ---------- Admin Expenses ----------
export type Expense = {
  id: string;
  date: string;
  category: string;
  vendor: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
};

export const adminExpenses: Expense[] = [
  { id: "EXP-140", date: "Aug 8, 2026", category: "Utilities", vendor: "Meralco", amount: 42500, status: "Paid" },
  { id: "EXP-139", date: "Aug 7, 2026", category: "Vehicle Maintenance", vendor: "Petron Fleet Card", amount: 18200, status: "Paid" },
  { id: "EXP-138", date: "Aug 6, 2026", category: "Marketing", vendor: "Meta Ads", amount: 15000, status: "Pending" },
  { id: "EXP-137", date: "Aug 5, 2026", category: "Rent", vendor: "Makati Branch Landlord", amount: 95000, status: "Paid" },
  { id: "EXP-136", date: "Aug 3, 2026", category: "Equipment", vendor: "Chafing Dish Supplier Co.", amount: 34800, status: "Overdue" },
  { id: "EXP-135", date: "Aug 1, 2026", category: "Staffing", vendor: "Payroll — Contractual Staff", amount: 210000, status: "Paid" },
  { id: "EXP-134", date: "Jul 29, 2026", category: "Permits", vendor: "QC City Health Office", amount: 6200, status: "Paid" },
];

// ---------- Sales ----------
// Trailing 12 months, Sep 2025 – Aug 2026. Fiesta/holiday season (Dec) peaks,
// lean season (Jan) dips — total lands just above ₱8M for the year.
export const monthlySales = [
  { month: "Sep", revenue: 480000 },
  { month: "Oct", revenue: 520000 },
  { month: "Nov", revenue: 610000 },
  { month: "Dec", revenue: 780000 },
  { month: "Jan", revenue: 560000 },
  { month: "Feb", revenue: 600000 },
  { month: "Mar", revenue: 640000 },
  { month: "Apr", revenue: 690000 },
  { month: "May", revenue: 720000 },
  { month: "Jun", revenue: 760000 },
  { month: "Jul", revenue: 810000 },
  { month: "Aug", revenue: 850000 },
];

const annualRevenue = monthlySales.reduce((sum, m) => sum + m.revenue, 0);

export const salesSummary = {
  mtdRevenue: monthlySales[monthlySales.length - 1].revenue,
  ytdRevenue: annualRevenue,
  avgOrderValue: 76500,
  growthPct: 4.9,
};

// ---------- Payments & Refunds ----------
export type PaymentRecord = {
  id: string;
  invoiceNo: string;
  client: string;
  amount: number;
  method: string;
  type: "Payment" | "Refund";
  status: "Completed" | "Pending" | "Failed";
  date: string;
};

export const paymentsRefunds: PaymentRecord[] = [
  { id: "PAY-901", invoiceNo: "INV-2201", client: "Antonio Reyes", amount: 450000, method: "Bank Transfer", type: "Payment", status: "Completed", date: "Aug 8, 2026" },
  { id: "PAY-900", invoiceNo: "INV-2200", client: "Josefina Cruz", amount: 220000, method: "GCash", type: "Payment", status: "Completed", date: "Aug 7, 2026" },
  { id: "PAY-899", invoiceNo: "INV-2199", client: "Liza Bautista", amount: 27500, method: "Cash", type: "Refund", status: "Completed", date: "Aug 6, 2026" },
  { id: "PAY-898", invoiceNo: "INV-2198", client: "Rosario Torres", amount: 90000, method: "Bank Transfer", type: "Payment", status: "Pending", date: "Aug 5, 2026" },
  { id: "PAY-897", invoiceNo: "INV-2197", client: "Paolo Fernandez", amount: 375000, method: "Credit Card", type: "Payment", status: "Completed", date: "Aug 3, 2026" },
  { id: "PAY-896", invoiceNo: "INV-2196", client: "Grace Villanueva", amount: 15000, method: "GCash", type: "Refund", status: "Failed", date: "Aug 2, 2026" },
  { id: "PAY-895", invoiceNo: "INV-2195", client: "Benjamin Flores", amount: 132000, method: "Bank Transfer", type: "Payment", status: "Pending", date: "Aug 1, 2026" },
];

// ---------- Reports ----------
export type Report = {
  id: string;
  name: string;
  period: string;
  type: string;
  generatedAt: string;
};

export const reports: Report[] = [
  { id: "RPT-1", name: "Monthly Sales Summary", period: "July 2026", type: "Sales", generatedAt: "Aug 1, 2026" },
  { id: "RPT-2", name: "Branch Performance Comparison", period: "Q2 2026", type: "Operations", generatedAt: "Jul 5, 2026" },
  { id: "RPT-3", name: "Inventory Usage Report", period: "July 2026", type: "Inventory", generatedAt: "Aug 2, 2026" },
  { id: "RPT-4", name: "Owner Financial Statement", period: "Q2 2026", type: "Finance", generatedAt: "Jul 10, 2026" },
  { id: "RPT-5", name: "Customer Retention Report", period: "H1 2026", type: "Customers", generatedAt: "Jul 15, 2026" },
  { id: "RPT-6", name: "Staff Productivity Report", period: "July 2026", type: "Staffing", generatedAt: "Aug 3, 2026" },
];

// ---------- Owner Financials ----------
// Expenses run ~63% of revenue each month (ingredients, labor, overhead, rent);
// the remainder is net profit. Derived from the same monthlySales series above
// so Sales, Branch Performance, and Owner Financials all agree on total revenue.
const EXPENSE_RATIO = 0.63;

export const ownerFinancialsMonthly = monthlySales.map((m, i) => {
  const expenses = Math.round((m.revenue * EXPENSE_RATIO) / 1000) * 1000;
  return {
    id: `OF-${i + 1}`,
    month: m.month,
    revenue: m.revenue,
    expenses,
    profit: m.revenue - expenses,
  };
});

const totalExpenses = ownerFinancialsMonthly.reduce((sum, m) => sum + m.expenses, 0);
const netProfit = annualRevenue - totalExpenses;

export const ownerFinancialsSummary = {
  totalRevenue: annualRevenue,
  totalExpenses,
  netProfit,
  profitMarginPct: Math.round((netProfit / annualRevenue) * 1000) / 10,
};

// ---------- Cost Calculator (example) ----------
export const costCalculatorExample = {
  packageName: "Pamana Heritage Buffet",
  guests: 150,
  pricePerHead: 950,
  ingredientCostPerHead: 420,
  laborCostPerHead: 130,
  overheadCostPerHead: 90,
};

// ---------- Break-even ----------
export const breakEvenExample = {
  fixedCosts: 185000,
  variableCostPerGuest: 640,
  pricePerGuest: 950,
};

// ---------- Room Diagram ----------
export type RoomTable = {
  id: string;
  label: string;
  seats: number;
  guestsAssigned: number;
  shape: "round" | "rect";
};

export const roomDiagram = {
  venue: "Makati Diamond Hall — BK-5021 Corporate Gala",
  capacity: 300,
  tables: [
    { id: "T1", label: "Table 1", seats: 10, guestsAssigned: 10, shape: "round" },
    { id: "T2", label: "Table 2", seats: 10, guestsAssigned: 10, shape: "round" },
    { id: "T3", label: "Table 3", seats: 10, guestsAssigned: 8, shape: "round" },
    { id: "T4", label: "Table 4", seats: 10, guestsAssigned: 10, shape: "round" },
    { id: "T5", label: "Table 5", seats: 10, guestsAssigned: 9, shape: "round" },
    { id: "T6", label: "Table 6", seats: 10, guestsAssigned: 10, shape: "round" },
    { id: "T7", label: "VIP Head Table", seats: 12, guestsAssigned: 12, shape: "rect" },
    { id: "T8", label: "Table 8", seats: 10, guestsAssigned: 6, shape: "round" },
    { id: "T9", label: "Table 9", seats: 10, guestsAssigned: 10, shape: "round" },
    { id: "T10", label: "Buffet Station", seats: 0, guestsAssigned: 0, shape: "rect" },
  ] as RoomTable[],
};

// ---------- User Access ----------
// User accounts now live in lib/auth/user-store.ts (file-backed, supports
// login + admin-created accounts) instead of here.

// Re-exported so the pages that already import it from here keep working.
export { formatPeso, formatPesoCompact, formatNumber } from "./format";
