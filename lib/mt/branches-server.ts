// Server-only. Fetches the live branch registry from Supabase — the
// authoritative source. lib/mt/branches.ts's `BRANCHES` is a same-process
// cache primed from this at the top of app/dashboard/layout.tsx (and by
// BranchProvider on the client); API routes call this directly instead of
// relying on that cache, since a route handler never goes through the
// dashboard layout that primes it.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BRANCHES, setBranches, type Branch } from "./branches";
import type { BranchColorName } from "./branch-colors";

type BranchRow = { id: string; name: string; color: BranchColorName };

export async function getBranchRows(): Promise<BranchRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, color")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load branches: ${error.message}`);
  return (data ?? []) as BranchRow[];
}

/** Fetches branches and primes the shared server-side cache (lib/mt/branches.ts)
 * for this request — call once, early, per server-rendered request. */
export async function loadAndPrimeBranches(): Promise<Branch[]> {
  const rows = await getBranchRows();
  setBranches(rows.map((r) => ({ id: r.id, name: r.name, colorName: r.color })));
  return BRANCHES;
}

export type CreateBranchInput = { name: string; color: BranchColorName };

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createBranch(input: CreateBranchInput): Promise<BranchRow> {
  const admin = createSupabaseAdminClient();
  const id = slugify(input.name);
  if (!id) throw new Error("Branch name must contain at least one letter or number.");

  const { data, error } = await admin
    .from("branches")
    .insert({ id, name: input.name, color: input.color })
    .select("id, name, color")
    .single();
  if (error) throw new Error(error.message);
  return data as BranchRow;
}
