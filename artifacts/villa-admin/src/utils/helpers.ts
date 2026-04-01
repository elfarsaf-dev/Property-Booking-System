export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNights(checkin: string, checkout: string): number {
  const ci = new Date(checkin);
  const co = new Date(checkout);
  const diff = co.getTime() - ci.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "lunas":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancel":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "lunas":
      return "Lunas";
    case "pending":
      return "Pending";
    case "cancel":
      return "Cancel";
    default:
      return status;
  }
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToXLSX(data: Record<string, unknown>[], filename: string) {
  exportToCSV(data, filename.replace(".xlsx", ".csv"));
}

export function exportToPDF(data: Record<string, unknown>[], filename: string, title: string) {
  const content = `
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        h1 { font-size: 16px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) { background: #f8fafc; }
        .meta { color: #64748b; font-size: 9px; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}</p>
      <table>
        <thead><tr>${Object.keys(data[0] || {}).map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${Object.values(row)
                  .map((v) => `<td>${v ?? ""}</td>`)
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(content);
    win.document.close();
    win.print();
  }
}
