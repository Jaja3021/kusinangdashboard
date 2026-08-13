import BreakEvenEditor from "@/components/dashboard/BreakEvenEditor";
import { getBreakEvenSettings } from "@/lib/breakeven/data";

export const dynamic = "force-dynamic";

export default async function BreakEvenPage() {
  const settings = await getBreakEvenSettings();
  return <BreakEvenEditor settings={settings} />;
}
