import MenuClient from "@/components/dashboard/MenuClient";
import { getPackagesData } from "@/lib/menu/data";

export const dynamic = "force-dynamic";

export default async function MenuPackagesPage() {
  const packages = await getPackagesData();
  return <MenuClient packages={packages} />;
}
