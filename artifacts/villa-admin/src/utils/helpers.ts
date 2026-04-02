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
  const now = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });

  const totalHarga = data.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const totalDP    = data.reduce((s, r) => s + (r.dp ?? 0), 0);
  const totalSisa  = totalHarga - totalDP;
  const totalMalam = data.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

  // Count per status
  const cLunas   = data.filter((r) => r.status === "lunas").length;
  const cPending = data.filter((r) => r.status === "pending").length;
  const cCancel  = data.filter((r) => r.status === "cancel").length;

  // Group data by property
  const propMap = new Map<string, Reservation[]>();
  for (const r of data) {
    const key = r.property_name?.trim() || "Tanpa Properti";
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(r);
  }

  // Palette for property header rows — cycles through 6 colors
  const propColors = [
    { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
    { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
    { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
    { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
    { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
    { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  ];

  let globalIndex = 0;
  let colorCycle = 0;

  function statusBadge(status: string) {
    const map: Record<string, [string, string, string]> = {
      lunas:   ["#dcfce7", "#16a34a", "✓ Lunas"],
      pending: ["#fef9c3", "#ca8a04", "⏳ Pending"],
      cancel:  ["#fee2e2", "#dc2626", "✕ Cancel"],
    };
    const [bg, color, label] = map[status] ?? ["#f1f5f9", "#475569", status];
    return `<span style="
      display:inline-block;background:${bg};color:${color};
      border:1px solid ${color}33;border-radius:20px;
      padding:1px 7px;font-size:8px;font-weight:700;white-space:nowrap
    ">${label}</span>`;
  }

  const bodyRows = [...propMap.entries()].map(([propName, propRows]) => {
    const pc = propColors[colorCycle % propColors.length];
    colorCycle++;

    const subHarga = propRows.reduce((s, r) => s + (r.total_price ?? 0), 0);
    const subDP    = propRows.reduce((s, r) => s + (r.dp ?? 0), 0);
    const subSisa  = subHarga - subDP;
    const subMalam = propRows.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

    const dataRows = propRows.map((r, li) => {
      globalIndex++;
      const nights = getNights(r.checkin, r.checkout);
      const sisa   = (r.total_price ?? 0) - (r.dp ?? 0);
      const rowBg  = li % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
        <tr style="background:${rowBg}">
          <td style="text-align:center;color:#94a3b8;font-weight:500">${globalIndex}</td>
          <td>
            <span style="font-weight:700;color:#0f172a;font-size:9.5px">${r.guest_name}</span>
            <br><span style="color:#94a3b8;font-size:8px">${r.guest_phone}</span>
          </td>
          <td style="color:#334155">${formatDate(r.checkin)}</td>
          <td style="color:#334155">${formatDate(r.checkout)}</td>
          <td style="text-align:center;font-weight:700;color:#6366f1">${nights}</td>
          <td style="color:#475569">${r.address || "-"}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a">${formatRupiah(r.total_price)}</td>
          <td style="text-align:right;color:#059669">${formatRupiah(r.dp)}</td>
          <td style="text-align:right;font-weight:600;color:${sisa > 0 ? "#dc2626" : "#16a34a"}">${formatRupiah(sisa)}</td>
          <td style="text-align:center">${statusBadge(r.status)}</td>
          <td style="color:#94a3b8;font-size:8px">${r.admin_name || "-"}</td>
        </tr>`;
    }).join("");

    return `
      <tr>
        <td colspan="11" style="
          background:${pc.bg};
          border-left:4px solid ${pc.border};
          border-top:2px solid ${pc.border}22;
          border-bottom:1px solid ${pc.border}44;
          padding:6px 10px;
          color:${pc.text};
          font-weight:800;
          font-size:10px;
          letter-spacing:0.3px;
        ">
          🏠 ${propName}
          <span style="font-weight:400;font-size:8.5px;opacity:0.8;margin-left:8px">${propRows.length} booking · ${subMalam} malam</span>
        </td>
      </tr>
      ${dataRows}
      <tr style="background:${pc.bg}ee">
        <td colspan="4" style="padding:5px 8px;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">
          Subtotal ${propName}
        </td>
        <td style="text-align:center;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">${subMalam}</td>
        <td style="border-top:1px solid ${pc.border}55"></td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">${formatRupiah(subHarga)}</td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:#059669;border-top:1px solid ${pc.border}55">${formatRupiah(subDP)}</td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:${subSisa > 0 ? "#dc2626" : "#16a34a"};border-top:1px solid ${pc.border}55">${formatRupiah(subSisa)}</td>
        <td colspan="2" style="border-top:1px solid ${pc.border}55"></td>
      </tr>
      <tr><td colspan="11" style="height:6px;background:#f8fafc;border:none"></td></tr>`;
  }).join("");

  const content = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Laporan Reservasi – ${monthLabel}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:9px;background:#f1f5f9;color:#1e293b}
    .page{background:#fff;max-width:100%;margin:0}

    /* ── Header ── */
    .report-header{
      background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%);
      padding:18px 22px 14px;color:#fff;position:relative;overflow:hidden
    }
    .report-header::before{
      content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;
      background:rgba(255,255,255,0.05);border-radius:50%
    }
    .report-header::after{
      content:'';position:absolute;bottom:-20px;right:60px;width:80px;height:80px;
      background:rgba(255,255,255,0.04);border-radius:50%
    }
    .header-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .header-logo{
      width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;
      display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0
    }
    .header-info{flex:1}
    .header-tag{
      display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);
      border-radius:20px;padding:2px 10px;font-size:8px;font-weight:600;
      letter-spacing:0.5px;margin-bottom:5px;color:#bfdbfe
    }
    .header-title{font-size:17px;font-weight:800;letter-spacing:-0.3px;line-height:1.2}
    .header-sub{font-size:9px;color:#93c5fd;margin-top:3px}
    .header-meta{
      background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
      border-radius:8px;padding:8px 12px;text-align:right;flex-shrink:0
    }
    .header-meta .meta-label{font-size:7.5px;color:#93c5fd;margin-bottom:1px}
    .header-meta .meta-val{font-size:8.5px;font-weight:600;color:#fff}
    .header-strip{height:4px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399,#f59e0b,#f87171)}

    /* ── Summary cards ── */
    .summary{display:flex;gap:8px;padding:12px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
    .sc{flex:1;border-radius:8px;padding:9px 11px;border:1px solid transparent;position:relative;overflow:hidden}
    .sc::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;border-radius:8px 0 0 8px}
    .sc.blue  {background:#eff6ff;border-color:#bfdbfe}.sc.blue::before{background:#3b82f6}
    .sc.violet{background:#f5f3ff;border-color:#ddd6fe}.sc.violet::before{background:#8b5cf6}
    .sc.green {background:#f0fdf4;border-color:#bbf7d0}.sc.green::before{background:#10b981}
    .sc.orange{background:#fff7ed;border-color:#fed7aa}.sc.orange::before{background:#f97316}
    .sc.red   {background:#fef2f2;border-color:#fecaca}.sc.red::before{background:#ef4444}
    .sc-icon{font-size:16px;margin-bottom:2px}
    .sc-label{font-size:7.5px;color:#64748b;font-weight:500;margin-bottom:2px}
    .sc-value{font-size:12px;font-weight:800;color:#0f172a;line-height:1}
    .sc-sub{font-size:7px;color:#94a3b8;margin-top:2px}

    /* ── Status bar ── */
    .status-bar{display:flex;gap:6px;padding:8px 22px;background:#fff;border-bottom:2px solid #e2e8f0;align-items:center}
    .sb-title{font-size:8px;font-weight:700;color:#64748b;margin-right:4px;text-transform:uppercase;letter-spacing:0.5px}
    .sb-badge{display:flex;align-items:center;gap:4px;border-radius:20px;padding:3px 10px;font-size:8px;font-weight:700}
    .sb-dot{width:7px;height:7px;border-radius:50%}

    /* ── Table ── */
    .table-wrap{padding:0 0 16px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:linear-gradient(90deg,#1e3a5f,#1d4ed8)}
    th{color:#fff;padding:7px 7px;text-align:left;font-size:8.5px;font-weight:700;letter-spacing:0.2px}
    td{padding:5px 7px;font-size:8.5px;vertical-align:middle;border-bottom:1px solid #f1f5f9}

    /* ── Grand total ── */
    .grand-total td{
      background:linear-gradient(90deg,#0f172a,#1e3a5f);color:#fff;
      font-weight:800;font-size:9px;padding:8px 7px;border:none
    }

    /* ── Footer ── */
    .report-footer{
      text-align:center;padding:10px;font-size:7.5px;color:#94a3b8;
      border-top:1px solid #e2e8f0;background:#f8fafc
    }

    @media print{
      body{background:#fff}
      .page{box-shadow:none}
      @page{size:landscape;margin:8mm}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <div class="header-top">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="header-logo">🏡</div>
        <div class="header-info">
          <div class="header-tag">VILLA BOOKING SYSTEM</div>
          <div class="header-title">Laporan Reservasi</div>
          <div class="header-sub">Periode: <b>${monthLabel}</b> &nbsp;·&nbsp; Admin: <b>${adminName}</b></div>
        </div>
      </div>
      <div class="header-meta">
        <div class="meta-label">Dicetak pada</div>
        <div class="meta-val">${now}</div>
      </div>
    </div>
  </div>
  <div class="header-strip"></div>

  <!-- SUMMARY CARDS -->
  <div class="summary">
    <div class="sc blue">
      <div class="sc-icon">📋</div>
      <div class="sc-label">Total Booking</div>
      <div class="sc-value">${data.length}</div>
      <div class="sc-sub">reservasi</div>
    </div>
    <div class="sc violet">
      <div class="sc-icon">🌙</div>
      <div class="sc-label">Total Malam</div>
      <div class="sc-value">${totalMalam}</div>
      <div class="sc-sub">malam menginap</div>
    </div>
    <div class="sc green">
      <div class="sc-icon">💰</div>
      <div class="sc-label">Total Pendapatan</div>
      <div class="sc-value">${formatRupiah(totalHarga)}</div>
      <div class="sc-sub">bruto</div>
    </div>
    <div class="sc orange">
      <div class="sc-icon">💳</div>
      <div class="sc-label">DP Masuk</div>
      <div class="sc-value">${formatRupiah(totalDP)}</div>
      <div class="sc-sub">sudah dibayar</div>
    </div>
    <div class="sc red">
      <div class="sc-icon">⚡</div>
      <div class="sc-label">Total Sisa</div>
      <div class="sc-value">${formatRupiah(totalSisa)}</div>
      <div class="sc-sub">belum dilunasi</div>
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span class="sb-title">Rekap Status:</span>
    <span class="sb-badge" style="background:#dcfce7;color:#15803d">
      <span class="sb-dot" style="background:#16a34a"></span> Lunas: ${cLunas}
    </span>
    <span class="sb-badge" style="background:#fef9c3;color:#b45309">
      <span class="sb-dot" style="background:#ca8a04"></span> Pending: ${cPending}
    </span>
    <span class="sb-badge" style="background:#fee2e2;color:#b91c1c">
      <span class="sb-dot" style="background:#dc2626"></span> Cancel: ${cCancel}
    </span>
    <span style="margin-left:auto;font-size:7.5px;color:#94a3b8">${propMap.size} properti · ${data.length} tamu</span>
  </div>

  <!-- TABLE -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:26px;text-align:center">No</th>
          <th style="min-width:90px">Nama Tamu</th>
          <th>Checkin</th>
          <th>Checkout</th>
          <th style="text-align:center;width:34px">Mlm</th>
          <th>Asal</th>
          <th style="text-align:right">Total Harga</th>
          <th style="text-align:right">DP</th>
          <th style="text-align:right">Sisa</th>
          <th style="text-align:center;width:72px">Status</th>
          <th style="width:52px">Admin</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      <tr class="grand-total">
        <td colspan="4">GRAND TOTAL — ${data.length} booking dari ${propMap.size} properti</td>
        <td style="text-align:center">${totalMalam}</td>
        <td></td>
        <td style="text-align:right">${formatRupiah(totalHarga)}</td>
        <td style="text-align:right">${formatRupiah(totalDP)}</td>
        <td style="text-align:right;color:#fca5a5">${formatRupiah(totalSisa)}</td>
        <td colspan="2"></td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    Dokumen ini digenerate otomatis oleh Villa Booking Admin Panel &nbsp;·&nbsp; ${now}
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}

// Legacy — kept to avoid any unused import errors elsewhere
export function exportToCSV(_data: Record<string, unknown>[], _filename: string) {}
