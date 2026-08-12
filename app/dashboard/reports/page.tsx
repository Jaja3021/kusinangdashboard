import { FileText, Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { Column } from "@/components/ui/DataTable";
import { reports, Report } from "@/lib/dummy-data";

const columns: Column<Report>[] = [
  {
    key: "name",
    header: "Report",
    render: (r) => (
      <span className="flex items-center gap-2 font-medium text-brand-900">
        <FileText size={15} className="text-brand-400" /> {r.name}
      </span>
    ),
  },
  { key: "type", header: "Type" },
  { key: "period", header: "Period" },
  { key: "generatedAt", header: "Generated" },
  {
    key: "action",
    header: "",
    render: () => (
      <span className="flex items-center gap-1 text-sm font-medium text-gold-600">
        <Download size={14} /> Download
      </span>
    ),
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Generated reports available for download." />
      <DataTable columns={columns} rows={reports} />
    </div>
  );
}
