import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MoiEntry } from '../models/moi.model';
import { Event, EventReport, getEventConfig, getEventTitle } from '../models/event.model';

export type PaperSize = '58' | '80';
export type PrintSide = 'groom' | 'bride' | 'both' | 'all';
export type ReceiptLang = 'en' | 'ta';

export interface PrintFilter {
  side: PrintSide;
  city?: string;
  district?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private doc = inject(DOCUMENT);

  printReceipt(entry: MoiEntry, event: Event, paperSize: PaperSize = '80', receiptNo?: number, lang: ReceiptLang = 'en'): void {
    const html = this.buildReceiptHtml(entry, event, paperSize, receiptNo, lang);
    const win = this.doc.defaultView?.open(
      '', '_blank',
      `width=420,height=650,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes`
    );
    if (!win) {
      const frame = this.doc.createElement('iframe');
      frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
      this.doc.body.appendChild(frame);
      frame.contentDocument!.write(html);
      frame.contentDocument!.close();
      frame.contentWindow?.focus();
      setTimeout(() => {
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
      }, 300);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      setTimeout(() => { try { win.close(); } catch { /* already closed */ } }, 30000);
    }, 400);
  }

  printA4Sheet(entries: MoiEntry[], event: Event, filter: PrintFilter | PrintSide = 'all'): void {
    const f = typeof filter === 'string' ? { side: filter as PrintSide } : filter;
    this.openA4Window(entries, event, f, 'print');
  }

  downloadA4Sheet(entries: MoiEntry[], event: Event, filter: PrintFilter | PrintSide = 'all'): void {
    const f = typeof filter === 'string' ? { side: filter as PrintSide } : filter;
    this.openA4Window(entries, event, f, 'download');
  }

  private openA4Window(entries: MoiEntry[], event: Event, filter: PrintFilter, mode: 'print' | 'download'): void {
    const html = this.buildA4Html(entries, event, filter, mode);
    const win = this.doc.defaultView?.open(
      '', '_blank',
      `width=960,height=750,toolbar=no,location=no,directories=no,status=no,menubar=yes,scrollbars=yes`
    );
    if (!win) {
      const frame = this.doc.createElement('iframe');
      frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
      this.doc.body.appendChild(frame);
      frame.contentDocument!.write(html);
      frame.contentDocument!.close();
      frame.contentWindow?.focus();
      setTimeout(() => {
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
      }, 300);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    if (mode === 'print') {
      setTimeout(() => {
        win.print();
        win.onafterprint = () => win.close();
        setTimeout(() => { try { win.close(); } catch { /* already closed */ } }, 30000);
      }, 400);
    }
  }

  printEventReport(report: EventReport, event: Event): void {
    const html = this.buildEventReportHtml(report, event);
    const win = this.doc.defaultView?.open('', '_blank', 'width=820,height=700,toolbar=no,menubar=yes,scrollbars=yes');
    if (!win) {
      const frame = this.doc.createElement('iframe');
      frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
      this.doc.body.appendChild(frame);
      frame.contentDocument!.write(html);
      frame.contentDocument!.close();
      frame.contentWindow?.focus();
      setTimeout(() => {
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
      }, 300);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      setTimeout(() => { try { win.close(); } catch { /* already closed */ } }, 30000);
    }, 500);
  }

  private buildA4Html(entries: MoiEntry[], event: Event, filter: PrintFilter, mode: 'print' | 'download' = 'print'): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);
    const { side, city: cityFilter, district: districtFilter } = filter;

    const esc = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(n);

    const payLabel: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', online: 'Online', dd: 'DD' };

    const sideLabel =
      side === 'groom' ? cfg.sideALabel :
      side === 'bride' ? cfg.sideBLabel :
      side === 'both'  ? 'Both' : 'All Guests';

    let filtered = side === 'all' ? entries : entries.filter(x => x.side === side);
    if (cityFilter) {
      filtered = filtered.filter(x => x.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    }
    if (districtFilter) {
      filtered = filtered.filter(x => x.district?.toLowerCase().includes(districtFilter.toLowerCase()));
    }
    filtered = [...filtered].sort((a, b) =>
      (a.city ?? '').localeCompare(b.city ?? '', 'en', { sensitivity: 'base' })
    );
    const showSideCol     = side === 'all';
    const showRelCol      = filtered.some(x => !!x.relationship?.trim());
    const showCityCol     = filtered.some(x => !!x.city?.trim());
    const showDistrictCol = filtered.some(x => !!x.district?.trim());

    const eventDate = new Date(event.event_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const printDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const grandTotal = filtered.reduce((s, x) => s + x.amount, 0);
    const totalQty = filtered.length;

    const sideDisplay = (s: string) =>
      s === 'groom' ? cfg.sideALabel : s === 'bride' ? cfg.sideBLabel : 'Both';

    const filterDesc = [
      cityFilter ? `City: ${cityFilter}` : '',
      districtFilter ? `District: ${districtFilter}` : '',
    ].filter(Boolean).join(' | ');

    const rows = filtered.map((x, i) => `
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="center">${i + 1}</td>
        <td class="col-name">
          ${esc(x.guest_name)}
          ${x.phone ? `<span class="phone">${esc(x.phone)}</span>` : ''}
        </td>
        ${showRelCol      ? `<td class="col-rel">${esc(x.relationship || '')}</td>` : ''}
        ${showCityCol     ? `<td>${esc(x.city || '')}</td>` : ''}
        ${showDistrictCol ? `<td>${esc(x.district || '')}</td>` : ''}
        ${showSideCol     ? `<td class="center side-cell side-${x.side}">${esc(sideDisplay(x.side))}</td>` : ''}
        <td class="right col-amt">${esc(fmt(x.amount))}</td>
      </tr>`).join('');

    const emptyCount = Math.max(0, 15 - filtered.length);
    const blankRows = Array(emptyCount).fill(null).map((_, i) => `
      <tr class="empty-row ${(filtered.length + i) % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="center">${filtered.length + i + 1}</td>
        <td></td>
        ${showRelCol      ? '<td></td>' : ''}
        ${showCityCol     ? '<td></td>' : ''}
        ${showDistrictCol ? '<td></td>' : ''}
        ${showSideCol     ? '<td></td>' : ''}
        <td></td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Moi Register — ${esc(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4 portrait; margin: 12mm 10mm; }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @media print {
      @page { margin: 12mm 10mm; }
      html, body { margin: 0; padding: 0; }
      .download-bar { display: none !important; }
    }

    /* ── Download toolbar (screen only) ── */
    .download-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      background: #4a148c;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .download-bar span { opacity: 0.9; }

    .download-bar button {
      background: #fff;
      color: #4a148c;
      border: none;
      border-radius: 6px;
      padding: 8px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .download-bar button:hover { background: #f3e5f5; }

    body.has-download-bar .page { margin-top: 56px; }

    body {
      font-family: 'Segoe UI', 'Noto Sans', Arial, sans-serif;
      font-size: 12px;
      color: #222;
      background: #fff;
    }

    .page {
      width: 190mm;
      min-height: 270mm;
      margin: 0 auto;
      position: relative;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      border-bottom: 3px solid #4a148c;
      padding-bottom: 10px;
      margin-bottom: 6px;
    }

    .header-info { flex: 1; }

    .app-name {
      font-size: 28px;
      font-weight: 800;
      color: #4a148c;
      letter-spacing: 1.5px;
      line-height: 1.1;
    }

    .app-tagline {
      font-size: 12px;
      color: #555;
      font-style: italic;
      margin-top: 2px;
    }

    .event-name {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 6px;
    }

    .event-meta {
      font-size: 10.5px;
      color: #444;
      margin-top: 3px;
      line-height: 1.5;
    }

    .header-right { text-align: right; }

    .header-right div {
      font-size: 11px;
      color: #333;
      margin-bottom: 3px;
    }

    .header-right strong { color: #4a148c; }

    /* ── Title strip ── */
    .title-strip {
      background: #4a148c;
      color: #fff;
      text-align: center;
      padding: 7px 0;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin: 10px 0;
    }

    /* ── Meta row ── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0 8px;
      font-size: 11.5px;
    }

    .meta-row strong { color: #4a148c; }

    /* ── Table ── */
    .reg-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #4a148c;
    }

    .reg-table thead th,
    .reg-table tbody td {
      border-top: none;
      border-bottom: none;
      border-left: 1px solid #c9b3e8;
      padding: 4px 6px;
      font-size: 11px;
      line-height: 1.2;
      vertical-align: middle;
    }

    .reg-table thead th:last-child,
    .reg-table tbody td:last-child {
      border-right: 1px solid #c9b3e8;
    }

    .reg-table thead th {
      background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%);
      color: #fff;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 6px;
      border-left: 1px solid #6a2faa;
    }

    .row-even { background: #fdfaff; }
    .row-odd  { background: #f3eeff; }

    .reg-table .empty-row td { height: 26px; padding: 7px 8px; }
    .empty-row.row-even { background: #fdfaff; }
    .empty-row.row-odd  { background: #f9f5ff; }

    .phone {
      display: block;
      font-size: 9px;
      color: #888;
      margin-top: 2px;
    }

    .col-name { font-weight: 600; color: #1a1a2e; }
    .col-rel  { font-style: italic; color: #555; }
    .col-amt  { font-weight: 700; font-family: 'Courier New', Courier, monospace; color: #2e7d32; }

    /* Side colour badges */
    .side-groom { color: #1565c0; font-weight: 600; }
    .side-bride { color: #c2185b; font-weight: 600; }
    .side-both  { color: #6a1b9a; font-weight: 600; }

    /* Payment colour badges */
    .pay-cash   { color: #2e7d32; font-weight: 600; }
    .pay-cheque { color: #e65100; font-weight: 600; }
    .pay-online { color: #1565c0; font-weight: 600; }
    .pay-dd     { color: #4a148c; font-weight: 600; }

    .filter-info {
      font-size: 10px;
      color: #7b1fa2;
      font-style: italic;
      text-align: right;
      margin-bottom: 4px;
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0 10px;
      padding: 6px 8px;
      background: #f8f9ff;
      border-top: 1px solid #bbb;
      border-bottom: 1px solid #bbb;
      font-size: 11px;
    }

    .center { text-align: center; }
    .right  { text-align: right; }

    /* ── Total section ── */
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 0;
    }

    .total-box {
      width: 260px;
      border: 2px solid #4a148c;
      border-top: none;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 10px;
      font-size: 11.5px;
      line-height: 1.3;
      border-top: 1px solid #ddd;
    }

    .total-row.grand {
      background: #4a148c;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      padding: 8px 10px;
      border-top: none;
    }

    /* ── Footer ── */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      padding-top: 10px;
    }

    .footer-left { font-size: 9.5px; color: #888; }
    .footer-right { text-align: center; }

    .stamp-area {
      width: 180px;
      height: 60px;
      border-bottom: 2px solid #333;
      margin-bottom: 4px;
    }

    .footer-right p {
      font-size: 11px;
      font-weight: 600;
      color: #333;
    }

    .footer-right .for-label {
      font-size: 10px;
      color: #666;
      font-weight: 400;
      margin-bottom: 2px;
    }

    /* ── Decorative bottom bar ── */
    .bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #4a148c 0%, #7b1fa2 50%, #4a148c 100%);
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-info">
        <div class="app-name">MOIFY</div>
        <div class="app-tagline">Smart Digital Gift Ledger</div>
        <div class="event-name">${cfg.emoji} ${esc(title)}</div>
        <div class="event-meta">
          ${eventDate}${event.venue ? ' &bull; ' + esc(event.venue) : ''}${event.city ? ', ' + esc(event.city) : ''}
          ${event.family_name ? '<br>' + esc(event.family_name) : ''}
        </div>
      </div>
      <div class="header-right">
        <div><strong>Printed:</strong> ${printDate}</div>
        <div><strong>Side:</strong> ${esc(sideLabel)}</div>
        ${cityFilter ? `<div><strong>City:</strong> ${esc(cityFilter)}</div>` : ''}
        ${districtFilter ? `<div><strong>District:</strong> ${esc(districtFilter)}</div>` : ''}
        <div><strong>Total Guests:</strong> ${totalQty}</div>
        <div><strong>Grand Total:</strong> ${esc(fmt(grandTotal))}</div>
      </div>
    </div>

    <div class="title-strip">MOI GUEST REGISTER &mdash; ${esc(sideLabel)}</div>

    <div class="meta-row">
      <span><strong>Event:</strong> ${esc(title)}</span>
      <span><strong>Date:</strong> ${eventDate}</span>
    </div>

    ${filterDesc ? `<div class="filter-info">Filtered by: ${esc(filterDesc)}</div>` : ''}

    <table class="reg-table">
      <thead>
        <tr>
          <th style="width:28px">S.No</th>
          <th style="min-width:120px">Guest Name</th>
          ${showRelCol      ? '<th style="width:90px">Relationship</th>' : ''}
          ${showCityCol     ? '<th style="width:70px">City</th>' : ''}
          ${showDistrictCol ? '<th style="width:80px">District</th>' : ''}
          ${showSideCol     ? '<th style="width:60px">Side</th>' : ''}
          <th style="width:80px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${blankRows}
      </tbody>
    </table>

    <div class="table-footer">
      <span style="width:60%;text-align:left"><strong>Total</strong></span>
      <span style="width:40%;text-align:right"><strong>${totalQty} ${totalQty === 1 ? 'Guest' : 'Guests'}</strong></span>
    </div>

    <div class="total-section">
      <div class="total-box">
        <div class="total-row">
          <span>Total Guests</span>
          <span>${totalQty}</span>
        </div>
        <div class="total-row grand">
          <span>Grand Total</span>
          <span>${esc(fmt(grandTotal))}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <p>Generated by Moify &mdash; Smart Digital Gift Ledger</p>
      </div>
      <div class="footer-right">
        <div class="stamp-area"></div>
        <p class="for-label">For ${esc(title)}</p>
        <p>Authorized Signatory</p>
      </div>
    </div>

    <div class="bottom-bar"></div>
  </div>

  ${mode === 'download' ? `
  <div class="download-bar">
    <span>📄 Your PDF is ready — click <strong>Save as PDF</strong>, then choose <em>Save as PDF</em> as the destination.</span>
    <button onclick="window.print()">⬇ Save as PDF</button>
  </div>
  <script>
    document.body.classList.add('has-download-bar');
  </script>` : `
  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  </script>`}
</body>
</html>`;
  }

  private buildEventReportHtml(report: EventReport, event: Event): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);

    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const pct = (part: number, total: number) =>
      total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0%';

    const total = Number(report.total_amount);
    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    } as Intl.DateTimeFormatOptions);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Moi Report – ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 24px; }
  .report-header { text-align: center; padding: 20px 0 16px; border-bottom: 3px solid #6c3eb8; margin-bottom: 24px; }
  .report-header h1 { font-size: 20px; color: #6c3eb8; margin-bottom: 6px; }
  .report-header .event-title { font-size: 26px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
  .report-header .meta { font-size: 13px; color: #666; }
  .section-title { font-size: 13px; font-weight: 700; color: #6c3eb8; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; border-left: 4px solid #6c3eb8; padding-left: 8px; }
  .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 4px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 4px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 4px; }
  .stat-box { border: 1px solid #e0d6f5; border-radius: 8px; padding: 14px 10px; text-align: center; }
  .stat-box.highlight { background: #f3eeff; border-color: #6c3eb8; }
  .stat-icon { font-size: 20px; margin-bottom: 6px; }
  .stat-value { font-size: 17px; font-weight: 700; color: #6c3eb8; }
  .stat-label { font-size: 11px; color: #666; margin-top: 3px; }
  .stat-sub { font-size: 11px; color: #999; margin-top: 2px; }
  .groom-box { background: #e8f4fd; border-color: #1976d2; }
  .groom-box .stat-value { color: #1565c0; }
  .bride-box { background: #fce4ec; border-color: #d81b60; }
  .bride-box .stat-value { color: #c2185b; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
  @media print { @page { margin: 15mm; size: A4 portrait; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="report-header">
  <h1>${cfg.emoji} ${cfg.label} — Moi Collection Report</h1>
  <div class="event-title">${title}</div>
  <div class="meta">📅 ${fmtDate(report.event_date)}${event.venue ? ' &nbsp;·&nbsp; 📍 ' + event.venue : ''}${event.city ? ', ' + event.city : ''}</div>
</div>

<div class="section-title">Overall Summary</div>
<div class="grid-5">
  <div class="stat-box highlight">
    <div class="stat-icon">💰</div>
    <div class="stat-value">${fmt(total)}</div>
    <div class="stat-label">Total Collected</div>
  </div>
  <div class="stat-box">
    <div class="stat-icon">👥</div>
    <div class="stat-value">${report.moi_count}</div>
    <div class="stat-label">Total Guests</div>
  </div>
  <div class="stat-box">
    <div class="stat-icon">📊</div>
    <div class="stat-value">${report.moi_count > 0 ? fmt(total / report.moi_count) : '₹0'}</div>
    <div class="stat-label">Avg per Guest</div>
  </div>
  <div class="stat-box groom-box">
    <div class="stat-icon">${cfg.sideAEmoji}</div>
    <div class="stat-value">${report.groom_count}</div>
    <div class="stat-label">${cfg.sideALabel} Guests</div>
  </div>
  <div class="stat-box bride-box">
    <div class="stat-icon">${cfg.sideBEmoji}</div>
    <div class="stat-value">${report.bride_count}</div>
    <div class="stat-label">${cfg.sideBLabel} Guests</div>
  </div>
</div>

<div class="section-title">Collection by Side</div>
<div class="grid-2">
  <div class="stat-box groom-box">
    <div class="stat-icon">${cfg.sideAEmoji} ${cfg.sideALabel}</div>
    <div class="stat-value">${fmt(Number(report.groom_amount))}</div>
    <div class="stat-label">Total Collected</div>
    <div class="stat-sub">${report.groom_count} guests · ${pct(Number(report.groom_amount), total)} of total</div>
  </div>
  <div class="stat-box bride-box">
    <div class="stat-icon">${cfg.sideBEmoji} ${cfg.sideBLabel}</div>
    <div class="stat-value">${fmt(Number(report.bride_amount))}</div>
    <div class="stat-label">Total Collected</div>
    <div class="stat-sub">${report.bride_count} guests · ${pct(Number(report.bride_amount), total)} of total</div>
  </div>
</div>

<div class="section-title">Payment Mode Breakdown</div>
<div class="grid-3">
  <div class="stat-box">
    <div class="stat-icon">💵</div>
    <div class="stat-value">${fmt(Number(report.cash_amount))}</div>
    <div class="stat-label">Cash</div>
    <div class="stat-sub">${pct(Number(report.cash_amount), total)} of total</div>
  </div>
  <div class="stat-box">
    <div class="stat-icon">📝</div>
    <div class="stat-value">${fmt(Number(report.cheque_amount))}</div>
    <div class="stat-label">Cheque</div>
    <div class="stat-sub">${pct(Number(report.cheque_amount), total)} of total</div>
  </div>
  <div class="stat-box">
    <div class="stat-icon">📱</div>
    <div class="stat-value">${fmt(Number(report.online_amount))}</div>
    <div class="stat-label">Online / UPI</div>
    <div class="stat-sub">${pct(Number(report.online_amount), total)} of total</div>
  </div>
</div>

<div class="footer">Generated by Moify &nbsp;|&nbsp; ${now}</div>
</body>
</html>`;
  }

  private buildReceiptHtml(entry: MoiEntry, event: Event, paperSize: PaperSize, receiptNo?: number, lang: ReceiptLang = 'en'): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);
    const isTamil = lang === 'ta';

    const widthMm = paperSize === '58' ? '58mm' : '80mm';
    const widthPx = paperSize === '58' ? '220px' : '302px';
    const fontSize = paperSize === '58' ? '10px' : '12px';
    const titleSize = paperSize === '58' ? '13px' : '16px';
    const amtSize = paperSize === '58' ? '18px' : '22px';

    const locale = isTamil ? 'ta-IN' : 'en-IN';

    const eventDate = new Date(event.event_date).toLocaleDateString(locale, {
      day: '2-digit', month: isTamil ? 'long' : 'short', year: 'numeric',
    });

    const now = new Date();
    const printDate = now.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const printTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const amountFormatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(entry.amount);

    // ── Label maps ───────────────────────────────────────────────────────
    const L = isTamil ? {
      subtitle:    `${cfg.emoji} திருமண பரிசு பதிவு ரசீது`,
      event:       'நிகழ்வு',
      family:      'குடும்பம்',
      dateLabel:   'திருமண தேதி',
      venue:       'இடம்',
      receiptNo:   'ரசீது எண்',
      printed:     'அச்சிடப்பட்டது',
      guestName:   'விருந்தினர் பெயர்',
      relation:    'உறவு முறை',
      side:        'பக்கம்',
      city:        'நகரம்',
      district:    'மாவட்டம்',
      phone:       'தொலைபேசி',
      amountLabel: 'தொகை',
      payment:     'செலுத்தும் முறை',
      chequeNo:    'காசோலை எண்',
      txnRef:      'பரிவர்த்தனை குறிப்பு',
      receivedBy:  'பெற்றவர்',
      notes:       'குறிப்பு',
      thankYou:    'உங்கள் அன்பான மோய்க்கு மிக்க நன்றி!',
      bless:       `இந்த திருமணத்தை இறைவன் ஆசீர்வதிக்கட்டும்`,
      sideGroom:   'மணமகன் பக்கம்',
      sideBride:   'மணமகள் பக்கம்',
      sideBoth:    'இரு பக்கமும்',
      payLabels:   { cash: 'ரொக்கம்', cheque: 'காசோலை', online: 'ஆன்லைன் பரிமாற்றம்', dd: 'வரைவோலை' } as Record<string, string>,
    } : {
      subtitle:    `${cfg.emoji} ${cfg.label} Gift Registry Receipt`,
      event:       'Event',
      family:      'Family',
      dateLabel:   cfg.dateLabel,
      venue:       'Venue',
      receiptNo:   'Receipt No',
      printed:     'Printed',
      guestName:   'Guest Name',
      relation:    'Relation',
      side:        'Side',
      city:        'City',
      district:    'District',
      phone:       'Phone',
      amountLabel: 'AMOUNT',
      payment:     'Payment',
      chequeNo:    'Cheque No',
      txnRef:      'Txn Ref',
      receivedBy:  'Received By',
      notes:       'Notes',
      thankYou:    'Thank you for your generous blessing!',
      bless:       `May God bless this ${cfg.label.toLowerCase()}`,
      sideGroom:   cfg.sideALabel,
      sideBride:   cfg.sideBLabel,
      sideBoth:    'Both',
      payLabels:   { cash: 'CASH', cheque: 'CHEQUE', online: 'ONLINE TRANSFER', dd: 'DEMAND DRAFT' } as Record<string, string>,
    };

    const sideLabel = entry.side === 'groom' ? L.sideGroom : entry.side === 'bride' ? L.sideBride : L.sideBoth;

    const e = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const row = (label: string, value: string, bold = false): string =>
      `<tr>
        <td class="lbl">${e(label)}</td>
        <td class="val">${bold ? `<b>${value}</b>` : value}</td>
      </tr>`;

    const conditionalRow = (label: string, value: string | undefined, bold = false): string =>
      value ? row(label, e(value), bold) : '';

    // Load Noto Sans Tamil from the app's own local font bundle (works on Ubuntu server)
    const tamilFont = isTamil
      ? `@font-face {
           font-family: 'Noto Sans Tamil';
           font-style: normal;
           font-weight: 400;
           font-display: block;
           src: url('/assets/fonts/NotoSansTamil-Regular.woff2') format('woff2');
         }`
      : '';
    const bodyFont = isTamil
      ? `'Noto Sans Tamil', 'Latha', Arial, sans-serif`
      : `'Courier New', Courier, monospace`;

    return `<!DOCTYPE html>
<html lang="${isTamil ? 'ta' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Moi Receipt #${e(String(entry.id))}</title>
  <style>
    ${tamilFont}
    @page { size: ${widthMm} auto; margin: 2mm 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${bodyFont};
      font-size: ${fontSize};
      line-height: 1.5;
      width: ${widthPx};
      max-width: ${widthPx};
      padding: 4mm 3mm 6mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .title    { font-size: ${titleSize}; font-weight: bold; letter-spacing: 1px; font-family: 'Courier New', Courier, monospace; }
    .subtitle { font-size: calc(${fontSize} - 1px); letter-spacing: 0.3px; margin-top: 2px; }
    .dline { margin: 4px 0 3px; font-size: calc(${fontSize} - 1px); letter-spacing: 2px;
             white-space: nowrap; overflow: hidden; font-family: 'Courier New', Courier, monospace; }
    .sline { margin: 3px 0; font-size: calc(${fontSize} - 1px); letter-spacing: 1px;
             white-space: nowrap; overflow: hidden; font-family: 'Courier New', Courier, monospace; }
    table { width: 100%; border-collapse: collapse; margin: 2px 0; }
    td { vertical-align: top; padding: 1px 0; }
    td.lbl { width: 44%; font-weight: 600; white-space: nowrap;
             font-size: calc(${fontSize} - 1px); padding-right: 2px; }
    td.val { font-size: calc(${fontSize} - 1px); word-break: break-word; }
    .amount-block {
      text-align: center;
      font-size: ${amtSize};
      font-weight: bold;
      padding: 5px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      margin: 5px 0;
      letter-spacing: 1px;
      font-family: 'Courier New', Courier, monospace;
    }
    .footer { font-size: calc(${fontSize} - 1px); text-align: center; margin-top: 5px; line-height: 1.8; }
    .congrats-block {
      text-align: center;
      margin-top: 6px;
      padding: 4px 2px;
    }
    .congrats-en {
      font-size: calc(${fontSize} - 1px);
      font-style: italic;
      color: #000;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .congrats-ta {
      font-family: ${isTamil ? `'Noto Sans Tamil', 'Latha', Arial, sans-serif` : `'Noto Sans Tamil', 'Latha', Arial, sans-serif`};
      font-size: calc(${fontSize} - 1px);
      color: #000;
      line-height: 1.6;
    }
    .hearts { font-size: calc(${fontSize} + 1px); letter-spacing: 3px; }
    @media print {
      body { width: ${widthMm}; }
      @page { size: ${widthMm} auto; margin: 2mm 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">MOIFY</div>
    <div class="subtitle">${L.subtitle}</div>
  </div>

  <div class="dline">================================</div>

  <table>
    <tr>
      <td class="lbl">${e(L.event)}</td>
      <td class="val"><b>${e(title)}</b></td>
    </tr>
    ${event.family_name ? row(L.family, e(event.family_name)) : ''}
    ${row(L.dateLabel, eventDate)}
    ${event.venue ? row(L.venue, e(event.venue)) : ''}
  </table>

  <div class="sline">--------------------------------</div>

  <table>
    ${row(L.receiptNo, '#' + e(String(receiptNo ?? entry.id)))}
    ${row(L.printed, printDate + ' ' + printTime)}
  </table>

  <div class="sline">--------------------------------</div>

  <table>
    ${row(L.guestName, e(entry.guest_name), true)}
    ${conditionalRow(L.relation, entry.relationship)}
    ${row(L.side, sideLabel)}
    ${conditionalRow(L.city, entry.city)}
    ${conditionalRow(L.district, entry.district)}
    ${conditionalRow(L.phone, entry.phone)}
  </table>

  <div class="amount-block">
    ${e(L.amountLabel)} : ${e(amountFormatted)}
  </div>

  <table>
    ${row(L.payment, L.payLabels[entry.payment_mode] || e(entry.payment_mode))}
    ${conditionalRow(L.chequeNo, entry.cheque_number)}
    ${conditionalRow(L.txnRef, entry.transaction_ref)}
    ${conditionalRow(L.receivedBy, entry.received_by)}
    ${conditionalRow(L.notes, entry.notes)}
  </table>

  <div class="dline">================================</div>

  <div class="footer">
    <div>${e(L.thankYou)}</div>
    <div>${e(L.bless)}</div>
  </div>

  <div class="dline">--------------------------------</div>

  <div class="congrats-block">
    <div class="hearts">&#10084; &#10084; &#10084;</div>
    ${isTamil ? `
    <div class="congrats-ta">
      &ldquo;இல்லறம் இனிதே இருக்க வாழ்த்துக்கள்!&rdquo;
    </div>
    <div class="congrats-ta">
      &ldquo;அன்பும் அமைதியும் என்றும் நிலைக்கட்டும்.&rdquo;
    </div>
    <div class="congrats-ta">
      &ldquo;திருமண நல் வாழ்த்துக்கள்!&rdquo;
    </div>` : `
    <div class="congrats-en">
      &ldquo;May your journey together be filled<br>with love, laughter &amp; endless joy!&rdquo;
    </div>
    <div class="congrats-en">
      &ldquo;Congratulations on your wedding!<br>Wishing you a lifetime of happiness.&rdquo;
    </div>`}
    <div class="hearts">&#10084; &#10084; &#10084;</div>
  </div>

  <div class="dline">================================</div>
</body>
</html>`;
  }
}
