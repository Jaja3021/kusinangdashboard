import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { CREATABLE_ROLES } from "@/lib/auth/roles";
import { ALL_PAGE_PATHS } from "@/lib/auth/page-access";
import { getBranchRows } from "@/lib/mt/branches-server";
import { updateUser, deleteUser, type UpdateUserInput } from "@/lib/auth/user-store";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  if (!current || !can(current.role, "manage:users")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const patch: UpdateUserInput = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    patch.name = name;
  }

  if (body?.role !== undefined) {
    if (!CREATABLE_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    patch.role = body.role;
  }

  if (body?.branches !== undefined) {
    const branches = Array.isArray(body.branches) ? body.branches.filter((b: unknown) => typeof b === "string") : [];
    const branchNames = (await getBranchRows()).map((b) => b.name);
    if (branches.length === 0 || !branches.every((b: string) => branchNames.includes(b))) {
      return NextResponse.json({ error: "Select at least one valid branch." }, { status: 400 });
    }
    patch.branches = branches;
  }

  if (body?.pageAccess !== undefined) {
    const pageAccess = Array.isArray(body.pageAccess)
      ? body.pageAccess.filter((p: unknown) => typeof p === "string")
      : [];
    if (pageAccess.length === 0 || !pageAccess.every((p: string) => ALL_PAGE_PATHS.includes(p))) {
      return NextResponse.json({ error: "Select at least one valid page." }, { status: 400 });
    }
    patch.pageAccess = pageAccess;
  }

  if (body?.canCloseDates !== undefined) {
    patch.canCloseDates = body.canCloseDates === true;
  }

  if (body?.status !== undefined) {
    if (!["Active", "Invited", "Suspended"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = body.status;
  }

  try {
    await updateUser(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  if (!current || !can(current.role, "manage:users")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    await deleteUser(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
