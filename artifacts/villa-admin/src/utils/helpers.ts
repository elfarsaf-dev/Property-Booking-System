import * as XLSX from "xlsx";
import type { Reservation } from "@/services/api";

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
    case "lunas":  return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancel": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "lunas": return "Lunas";
    case "pending": return "Pending";
    case "cancel": return "Cancel";
    default: return status;
  }
}

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function getMonthLabel(filterMonth: string, filterYear: string): string {
  if (filterMonth !== "all" && filterYear !== "all") {
    return `${MONTHS_ID[parseInt(filterMonth) - 1]} ${filterYear}`;
  }
  if (filterMonth !== "all") return MONTHS_ID[parseInt(filterMonth) - 1];
  if (filterYear !== "all") return `Semua ${filterYear}`;
  return `Semua Bulan`;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
}

const COL_WIDTHS = [5, 22, 16, 24, 12, 12, 8, 18, 18, 14, 18, 18, 18, 10, 14, 30];
const HEADERS = [
  "No","Nama Tamu","No HP","Properti","Checkin","Checkout","Malam",
  "Asal","Peserta","Kendaraan","Total Harga","DP","Sisa","Status","Admin","Catatan",
];

function buildRows(data: Reservation[]): (string | number)[][] {
  return data.map((r, i) => {
    const nights = getNights(r.checkin, r.checkout);
    const sisa = (r.total_price ?? 0) - (r.dp ?? 0);
    return [
      i + 1,
      r.guest_name ?? "",
      r.guest_phone ?? "",
      r.property_name ?? "",
      r.checkin ?? "",
      r.checkout ?? "",
      nights,
      r.address ?? "",
      r.people ?? "",
      r.vehicles ?? "",
      r.total_price ?? 0,
      r.dp ?? 0,
      sisa,
      getStatusLabel(r.status),
      r.admin_name ?? "",
      r.note ?? "",
    ];
  });
}

function buildTotalRow(data: Reservation[]): (string | number)[] {
  const totalHarga = data.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const totalDP = data.reduce((s, r) => s + (r.dp ?? 0), 0);
  const totalSisa = totalHarga - totalDP;
  const totalMalam = data.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);
  return [
    "TOTAL", `${data.length} booking`, "", "", "", "", totalMalam,
    "", "", "", totalHarga, totalDP, totalSisa, "", "", "",
  ];
}

function buildSheet(
  data: Reservation[],
  title: string,
  adminName: string,
): XLSX.WorkSheet {
  const now = new Date().toLocaleString("id-ID");
  const aoa: (string | number)[][] = [
    [title],
    [`Admin: ${adminName}`],
    [`Dicetak: ${now}`],
    [],
    HEADERS,
    ...buildRows(data),
    [],
    buildTotalRow(data),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = COL_WIDTHS.map((w) => ({ wch: w }));

  // Merge title row across all columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
  ];

  return ws;
}

export function exportToXLSX(
  data: Reservation[],
  adminName: string,
  filterMonth: string,
  filterYear: string,
) {
  if (!data.length) return;

  const wb = XLSX.utils.book_new();
  const monthLabel = getMonthLabel(filterMonth, filterYear);

  // ── Sheet 1: Full data named by month ────────────────────────────────────
  const sheet1Title = `Laporan Reservasi - ${adminName} - ${monthLabel}`;
  const sheet1 = buildSheet(data, sheet1Title, adminName);
  XLSX.utils.book_append_sheet(wb, sheet1, sanitizeSheetName(monthLabel));

  // ── Sheet 2+: Per property name ──────────────────────────────────────────
  const propMap = new Map<string, Reservation[]>();
  for (const r of data) {
    const key = r.property_name?.trim() || "Tanpa Properti";
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(r);
  }

  for (const [propName, propData] of propMap) {
    const sheetTitle = `${propName} - ${monthLabel}`;
    const ws = buildSheet(propData, sheetTitle, adminName);
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(propName));
  }

  const filename = `reservasi_${monthLabel.replace(/\s+/g, "_")}_${adminName}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportToPDF(
  data: Reservation[],
  adminName: string,
  filterMonth: string,
  filterYear: string,
) {
  if (!data.length) return;

  const monthLabel = getMonthLabel(filterMonth, filterYear);
  const title = `Laporan Reservasi – ${monthLabel}`;
  const now = new Date().toLocaleString("id-ID");

  const totalHarga = data.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const totalDP = data.reduce((s, r) => s + (r.dp ?? 0), 0);
  const totalSisa = totalHarga - totalDP;
  const totalMalam = data.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

  const rows = data
    .map((r, i) => {
      const nights = getNights(r.checkin, r.checkout);
      const sisa = (r.total_price ?? 0) - (r.dp ?? 0);
      const statusColor =
        r.status === "lunas" ? "#16a34a" :
        r.status === "pending" ? "#d97706" : "#dc2626";
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="text-align:center">${i + 1}</td>
        <td><b>${r.guest_name}</b><br><small style="color:#64748b">${r.guest_phone}</small></td>
        <td>${r.property_name}</td>
        <td>${formatDate(r.checkin)}</td>
        <td>${formatDate(r.checkout)}</td>
        <td style="text-align:center">${nights}</td>
        <td>${r.address || "-"}</td>
        <td style="text-align:right">${formatRupiah(r.total_price)}</td>
        <td style="text-align:right">${formatRupiah(r.dp)}</td>
        <td style="text-align:right;color:${sisa > 0 ? "#dc2626" : "#16a34a"}">${formatRupiah(sisa)}</td>
        <td style="text-align:center;color:${statusColor};font-weight:600">${getStatusLabel(r.status)}</td>
        <td style="color:#64748b;font-size:9px">${r.admin_name || "-"}</td>
      </tr>`;
    })
    .join("");

  const content = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 16px; color: #1e293b; }
    .header { margin-bottom: 12px; }
    .header h1 { font-size: 16px; font-weight: 700; color: #1e3a5f; }
    .header p { color: #64748b; font-size: 9px; margin-top: 2px; }
    .summary { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .summary-card { background: #f1f5f9; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 120px; }
    .summary-card .label { font-size: 9px; color: #64748b; margin-bottom: 2px; }
    .summary-card .value { font-size: 13px; font-weight: 700; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e3a5f; color: #fff; padding: 6px 6px; text-align: left; font-size: 9px; }
    td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
    tfoot td { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 9px; padding: 6px; }
    @media print { body { margin: 0; } @page { size: landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Admin: <b>${adminName}</b> &nbsp;·&nbsp; Dicetak: ${now}</p>
  </div>
  <div class="summary">
    <div class="summary-card"><div class="label">Total Booking</div><div class="value">${data.length}</div></div>
    <div class="summary-card"><div class="label">Total Malam</div><div class="value">${totalMalam}</div></div>
    <div class="summary-card"><div class="label">Total Pendapatan</div><div class="value">${formatRupiah(totalHarga)}</div></div>
    <div class="summary-card"><div class="label">Total DP Masuk</div><div class="value">${formatRupiah(totalDP)}</div></div>
    <div class="summary-card"><div class="label">Total Sisa</div><div class="value">${formatRupiah(totalSisa)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th>Tamu</th>
        <th>Properti</th>
        <th>Checkin</th>
        <th>Checkout</th>
        <th style="text-align:center">Mlm</th>
        <th>Asal</th>
        <th style="text-align:right">Total</th>
        <th style="text-align:right">DP</th>
        <th style="text-align:right">Sisa</th>
        <th style="text-align:center">Status</th>
        <th>Admin</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">TOTAL — ${data.length} booking</td>
        <td style="text-align:center">${totalMalam}</td>
        <td></td>
        <td style="text-align:right">${formatRupiah(totalHarga)}</td>
        <td style="text-align:right">${formatRupiah(totalDP)}</td>
        <td style="text-align:right">${formatRupiah(totalSisa)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}

// Legacy — kept to avoid any unused import errors elsewhere
export function exportToCSV(_data: Record<string, unknown>[], _filename: string) {}
