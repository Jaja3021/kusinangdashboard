import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BranchProvider } from "@/components/providers/BranchProvider";
import { DateRangeProvider } from "@/components/providers/DateRangeProvider";
import { MockOrderStatusProvider } from "@/components/providers/MockOrderStatusProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import MobileNav from "@/components/shell/MobileNav";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import { getOrders } from "@/lib/orders/data";
import { loadAndPrimeBranches } from "@/lib/mt/branches-server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // Middleware already gates /dashboard, but re-check here in case the
  // account was suspended after the session cookie was issued.
  if (!user) redirect("/login");

  // Fetched here (separately from each page's own getOrders() call) purely
  // to give the topbar search real orders to search over.
  const orders = await getOrders();

  // Primes lib/mt/branches.ts's shared BRANCHES for every Server Component
  // rendered under this layout in the same request, and seeds BranchProvider
  // so client components pick it up too — see that module's top comment.
  const branches = await loadAndPrimeBranches();

  return (
    <AuthProvider user={user}>
      <BranchProvider initialBranches={branches}>
        <DateRangeProvider>
          <MockOrderStatusProvider>
            <SyncProvider>
              <div className="flex h-screen overflow-hidden bg-gray-50">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Topbar orders={orders} />
                  {/* pb-20 on mobile clears the fixed bottom tab bar. */}
                  <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-5 md:pb-5">
                    {children}
                  </main>
                </div>
                <MobileNav />
              </div>
            </SyncProvider>
          </MockOrderStatusProvider>
        </DateRangeProvider>
      </BranchProvider>
    </AuthProvider>
  );
}
