// Client-side CSV export — no backend involved, just a Blob download.

export type CsvColumn<T> = { key: keyof T | string; header: string; value?: (row: T) => string | number };

function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.value ? c.value(row) : ((row as Record<string, unknown>)[c.key as string] ?? "") as string | number))
      .join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
