// Well-known Filipino celebrities/artists, shared between the two mock
// generators that use them for flavor: lib/orders/mock-celebrity-orders.ts
// (Today's Orders / Inquiries / Bookings / Customers) and
// lib/mt/opportunities.ts (Overview's CRM pipeline). Kept in one place so
// the two don't drift into two different rosters.
//
// Deliberately disjoint from the two names used as Owner Distribution
// recipients in lib/owner-financials/mock.ts ("Manny Pacquiao", "Kris
// Aquino"), so nobody is simultaneously a paying customer and a business
// owner in this mock universe.
export const CELEBRITIES: { first: string; last: string }[] = [
  { first: "Vice", last: "Ganda" },
  { first: "Anne", last: "Curtis" },
  { first: "Coco", last: "Martin" },
  { first: "Sarah", last: "Geronimo" },
  { first: "Piolo", last: "Pascual" },
  { first: "Toni", last: "Gonzaga" },
  { first: "Dingdong", last: "Dantes" },
  { first: "Marian", last: "Rivera" },
  { first: "Bea", last: "Alonzo" },
  { first: "Alden", last: "Richards" },
  { first: "Maine", last: "Mendoza" },
  { first: "Regine", last: "Velasquez" },
  { first: "Angel", last: "Locsin" },
  { first: "Judy Ann", last: "Santos" },
  { first: "Robin", last: "Padilla" },
  { first: "Gary", last: "Valenciano" },
  { first: "John Lloyd", last: "Cruz" },
  { first: "Nadine", last: "Lustre" },
  { first: "James", last: "Reid" },
  { first: "Andrea", last: "Brillantes" },
  { first: "Kathryn", last: "Bernardo" },
  { first: "Daniel", last: "Padilla" },
  { first: "Liza", last: "Soberano" },
  { first: "Enrique", last: "Gil" },
  { first: "Julia", last: "Barretto" },
  { first: "Joshua", last: "Garcia" },
  { first: "Kim", last: "Chiu" },
  { first: "Xian", last: "Lim" },
  { first: "Jericho", last: "Rosales" },
  { first: "Donny", last: "Pangilinan" },
  { first: "Belle", last: "Mariano" },
  { first: "Ivana", last: "Alawi" },
  { first: "Catriona", last: "Gray" },
  { first: "Pia", last: "Wurtzbach" },
  { first: "Alex", last: "Gonzaga" },
  { first: "Erich", last: "Gonzales" },
  { first: "Sharon", last: "Cuneta" },
];
