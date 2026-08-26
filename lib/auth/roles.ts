// Single source of truth for the assignable roles — reused by the Add User
// form's dropdown and the create-user API route's validation, which used to
// each keep their own copy.
//
// Owner is deliberately excluded: it's not creatable through the Add User
// form (see app/api/auth/users/route.ts).
export const CREATABLE_ROLES = [
  "Admin",
  "Branch Manager",
  "Sales Staff",
  "Kitchen Staff",
  "Operations Staff",
  "Finance Staff",
  "Tech Team",
  "Developer",
] as const;

export type CreatableRole = (typeof CREATABLE_ROLES)[number];
