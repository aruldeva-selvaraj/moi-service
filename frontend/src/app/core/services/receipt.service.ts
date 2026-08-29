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
    const html = this.buildA4Html(entries, event, filter, mode, true);
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

  private buildA4Html(entries: MoiEntry[], event: Event, filter: PrintFilter, mode: 'print' | 'download' = 'print', isManagedExternally = false): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);
    const { side, city: cityFilter, district: districtFilter } = filter;

    const esc = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmtNum = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n));

    let filtered = side === 'all' ? entries : entries.filter(x => x.side === side);
    if (cityFilter)    filtered = filtered.filter(x => x.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    if (districtFilter) filtered = filtered.filter(x => x.district?.toLowerCase().includes(districtFilter.toLowerCase()));
    filtered = [...filtered].sort((a, b) => (a.city ?? '').localeCompare(b.city ?? '', 'en', { sensitivity: 'base' }));

    const now      = new Date();
    const printDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const printTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const evDateObj = new Date(event.event_date);
    const eventDate = evDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const eventDay  = evDateObj.toLocaleDateString('en-IN', { weekday: 'long' });

    const grandTotal = filtered.reduce((s, x) => s + Number(x.amount), 0);
    const totalQty   = filtered.length;
    const year       = now.getFullYear();
    const invoiceNum = `#MOI-${year}-${String(event.id).padStart(6, '0')}`;
    const eventOfLabel = cfg.label + ' of';

    const tableRows = filtered.map((x, i) => {
      const tamilName = (x as any).guest_name_tamil;
      const nameCell = tamilName
        ? `${esc(x.guest_name)}<div class="tname-tamil">${esc(tamilName)}</div>`
        : esc(x.guest_name);
      return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#fdf5f7'};">
        <td class="tc tn">${i + 1}</td>
        <td class="tl tname">${nameCell}</td>
        <td class="tl td">${esc(x.city || '—')}</td>
        <td class="tl td">${esc(x.district || '—')}</td>
        <td class="tr tamt">&#8377;&nbsp;${fmtNum(Number(x.amount))}</td>
      </tr>`;
    }).join('');

    // Floral SVG: pass flip=true for top-right corner
    const floralCorner = (flip: boolean): string => {
      const g = flip ? 'translate(130,0) scale(-1,1)' : '';
      return `<svg width="130" height="130" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
  <g transform="${g}">
    <!-- vine -->
    <path d="M6 115 Q38 88 65 62 Q90 42 108 8" stroke="#7a9440" stroke-width="1.6" fill="none" opacity="0.55"/>
    <path d="M6 98 Q28 78 48 68" stroke="#6a8435" stroke-width="1" fill="none" opacity="0.45"/>
    <!-- leaves -->
    <ellipse cx="62" cy="64" rx="24" ry="7" fill="#5e9038" opacity="0.7" transform="rotate(-50 62 64)"/>
    <ellipse cx="34" cy="70" rx="20" ry="6" fill="#4e8030" opacity="0.65" transform="rotate(-68 34 70)"/>
    <ellipse cx="80" cy="44" rx="18" ry="5.5" fill="#5e9038" opacity="0.6" transform="rotate(-22 80 44)"/>
    <ellipse cx="104" cy="58" rx="14" ry="4.5" fill="#4e8030" opacity="0.55" transform="rotate(-58 104 58)"/>
    <!-- main rose -->
    <g transform="translate(44,40)">
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#eaacbe" opacity="0.9" transform="rotate(0)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#eaacbe" opacity="0.9" transform="rotate(60)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#eaacbe" opacity="0.9" transform="rotate(120)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#d8608a" opacity="0.9" transform="rotate(30)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#d8608a" opacity="0.9" transform="rotate(90)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#d8608a" opacity="0.9" transform="rotate(150)"/>
      <circle cx="0" cy="0" r="10" fill="#be3860"/>
      <circle cx="0" cy="0" r="6"  fill="#9c2040"/>
      <circle cx="-2" cy="-2" r="2.5" fill="#ff9ab8" opacity="0.45"/>
    </g>
    <!-- second rose -->
    <g transform="translate(84,74) scale(0.62)">
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#f2bece" opacity="0.9" transform="rotate(0)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#f2bece" opacity="0.9" transform="rotate(60)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#f2bece" opacity="0.9" transform="rotate(120)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#e07898" opacity="0.9" transform="rotate(30)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#e07898" opacity="0.9" transform="rotate(90)"/>
      <ellipse cx="0" cy="-15" rx="10" ry="13" fill="#e07898" opacity="0.9" transform="rotate(150)"/>
      <circle cx="0" cy="0" r="10" fill="#c85878"/>
      <circle cx="0" cy="0" r="5.5" fill="#a83858"/>
    </g>
    <!-- bud -->
    <g transform="translate(97,20) scale(0.42)">
      <ellipse cx="0" cy="-14" rx="9" ry="12" fill="#f4c4d4" opacity="0.88" transform="rotate(0)"/>
      <ellipse cx="0" cy="-14" rx="9" ry="12" fill="#f4c4d4" opacity="0.88" transform="rotate(72)"/>
      <ellipse cx="0" cy="-14" rx="9" ry="12" fill="#f4c4d4" opacity="0.88" transform="rotate(144)"/>
      <ellipse cx="0" cy="-14" rx="9" ry="12" fill="#eca0b8" opacity="0.88" transform="rotate(36)"/>
      <ellipse cx="0" cy="-14" rx="9" ry="12" fill="#eca0b8" opacity="0.88" transform="rotate(108)"/>
      <circle cx="0" cy="0" r="8" fill="#cc4868"/>
    </g>
    <!-- small berries -->
    <circle cx="20" cy="90" r="4.5" fill="#f090b0" opacity="0.78"/>
    <circle cx="9"  cy="74" r="3"   fill="#f4b4c8" opacity="0.7"/>
    <circle cx="108" cy="36" r="3.5" fill="#f090b0" opacity="0.68"/>
  </g>
</svg>`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Moi Invoice &#8212; ${esc(title)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: A4 portrait; margin: 6mm 6mm; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print {
      @page { margin: 6mm 6mm; }
      html, body { margin:0; padding:0; }
      .dl-bar { display:none !important; }
    }
    body { font-family:'Segoe UI', Arial, sans-serif; font-size:11px; color:#222; background:#fff; }

    /* Download bar */
    .dl-bar {
      position:fixed; top:0; left:0; right:0; z-index:9999;
      background:#7b1a36; color:#fff;
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 20px; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,.3);
    }
    .dl-bar button {
      background:#fff; color:#7b1a36; border:none; border-radius:6px;
      padding:8px 20px; font-size:14px; font-weight:700; cursor:pointer;
    }
    body.has-dl-bar .page { margin-top:56px; }

    /* Page */
    .page { width:195mm; margin:0 auto; position:relative; background:#fff; min-height:277mm; }

    /* Floral corners */
    .fc-tl, .fc-tr {
      position:absolute; top:0; width:130px; height:130px; pointer-events:none; z-index:1;
    }
    .fc-tl { left:0; }
    .fc-tr { right:0; }

    /* ── Document Header ── */
    .doc-header {
      display:flex; align-items:flex-start; justify-content:space-between;
      padding:10px 20px 14px;
      border-bottom:2px solid #c9a86c;
    }
    .h-left { padding-top:120px; }
    .h-left .bill-lbl  { font-size:15px; font-weight:800; color:#7b1a36; font-family:Georgia,serif; }
    .h-left .inv-num   { font-size:13px; font-weight:800; color:#1a1a1a; margin-top:5px; letter-spacing:.5px; }
    .h-left .inv-row   { font-size:11px; color:#444; margin-top:5px; display:flex; align-items:center; gap:5px; }

    .h-center { text-align:center; flex:1; padding:0 10px; }
    .brand-row {
      font-size:22px; font-weight:800; color:#7b1a36;
      font-family:Georgia,'Times New Roman',serif; letter-spacing:1.5px;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .brand-sub  { font-size:10px; color:#888; margin-top:2px; letter-spacing:.5px; }
    .of-row {
      margin-top:10px; font-size:12px; font-style:italic; color:#c4932a;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .of-line { flex:1; height:1px; background:#c4932a; max-width:36px; }
    .couple-names {
      font-size:30px; font-weight:700; color:#7b1a36;
      font-family:Georgia,'Times New Roman',serif;
      line-height:1.1; margin-top:5px; letter-spacing:1px;
    }
    .c-heart { color:#c4932a; font-size:24px; vertical-align:middle; }
    .ornament { font-size:11px; color:#8b7a2a; margin-top:5px; letter-spacing:4px; }

    .h-right { text-align:right; min-width:95px; padding-top:120px; }
    .ty-text { font-size:17px; color:#c0392b; font-style:italic; font-family:Georgia,serif; font-weight:700; }
    .ty-heart { color:#c0392b; font-size:15px; margin:3px 0; }
    .ty-msg   { font-size:10px; color:#555; line-height:1.5; margin-top:4px; }

    /* ── Info Cards ── */
    .info-cards {
      display:flex; margin:12px 0 10px;
      border:1.5px solid #ddc8a0; border-radius:5px; overflow:hidden;
    }
    .info-card { flex:1; padding:10px 12px; border-right:1.5px solid #ddc8a0; }
    .info-card:last-child { border-right:none; }
    .card-hdr {
      display:flex; align-items:center; gap:6px;
      font-size:10.5px; font-weight:800; color:#7b1a36;
      text-transform:uppercase; letter-spacing:.5px; margin-bottom:7px;
    }
    .card-ico { font-size:15px; }
    .card-ln  { font-size:10.5px; color:#333; line-height:1.65; }

    /* ── Table ── */
    .moi-tbl { width:100%; border-collapse:collapse; margin-top:10px; font-size:10.5px; }
    .moi-tbl thead tr { background:#7b1a36; color:#fff; }
    .moi-tbl thead th {
      padding:8px 6px; font-weight:700; text-align:center; font-size:10.5px;
      letter-spacing:.3px; border:1px solid #9b2a46;
    }
    .moi-tbl thead th.tl { text-align:left; padding-left:8px; }
    .moi-tbl tbody td   { padding:5px 6px; border:1px solid #e8d4d8; vertical-align:middle; }
    .tc { text-align:center; }
    .tr { text-align:right; }
    .tl { text-align:left; }
    .tn      { color:#888; font-size:10px; }
    .td      { color:#555; font-size:10px; white-space:nowrap; }
    .tname       { font-weight:600; color:#1a1a1a; }
    .tname-tamil { font-size:9.5px; color:#7b1a36; margin-top:2px; font-style:italic; }
    .tphone      { font-size:9px; color:#999; margin-top:1px; }
    .trel    { font-style:italic; color:#555; }
    .tamt    { font-weight:700; font-family:'Courier New',Courier,monospace; white-space:nowrap; }
    .tremark { font-size:10px; color:#666; }

    /* ── Summary Row ── */
    .summary-row {
      display:flex; align-items:center; justify-content:space-between;
      margin-top:14px; gap:12px;
    }
    .tg-box {
      display:flex; align-items:center; gap:12px;
      border:1.5px solid #e0d0d0; border-radius:6px; padding:10px 18px;
      flex-shrink:0;
    }
    .tg-ico   { font-size:30px; }
    .tg-count { font-size:24px; font-weight:800; color:#1a1a1a; line-height:1; }
    .tg-lbl   { font-size:10px; color:#666; margin-top:2px; }

    .ta-box {
      background:#fde8ee; border:1.5px solid #e8a0b8;
      border-radius:6px; padding:12px 24px;
      text-align:center; flex:1;
    }
    .ta-lbl   { font-size:11px; font-weight:700; color:#7b1a36; }
    .ta-val   { font-size:26px; font-weight:800; color:#7b1a36; margin:4px 0 3px; }
    .ta-words { font-size:9.5px; color:#8b3050; font-style:italic; line-height:1.4; }

    /* ── Bottom Section ── */
    .bottom-sec { display:flex; justify-content:space-between; align-items:flex-start; margin-top:18px; gap:12px; }
    .notes-sec .notes-ttl { font-size:12.5px; font-weight:800; color:#7b1a36; margin-bottom:7px; font-family:Georgia,serif; }
    .notes-sec ul { padding-left:14px; }
    .notes-sec ul li { font-size:10px; color:#555; line-height:1.75; }

    .gratitude-center {
      text-align:center; padding-top:6px;
      font-size:13.5px; font-style:italic; color:#c4932a;
      font-family:Georgia,'Times New Roman',serif;
      line-height:1.6; min-width:120px;
    }
    .grat-orn { font-size:13px; color:#c4932a; display:block; margin:2px 0; }

    .auth-sec { flex:1; }
    .auth-ttl {
      font-size:12.5px; font-weight:800; color:#7b1a36;
      margin-bottom:28px; font-family:Georgia,serif; text-align:center;
    }
    .auth-sigs { display:flex; justify-content:space-between; gap:16px; }
    .auth-sig  { flex:1; text-align:center; }
    .auth-line { border-bottom:1.5px solid #555; margin:0 auto 5px; width:90%; }
    .auth-role { font-size:10px; color:#555; margin-top:3px; }
    .auth-name { font-size:10.5px; font-weight:700; color:#7b1a36; }

    /* ── Page Footer Bar ── */
    .pg-footer {
      margin-top:16px; border-top:1.5px solid #c9a86c;
      padding-top:8px;
      display:flex; justify-content:center; align-items:center;
      gap:12px; font-size:10px; color:#666; flex-wrap:wrap;
    }
    .pf-sep   { color:#c9a86c; }
    .pf-brand { color:#7b1a36; font-weight:700; }
  </style>
</head>
<body>
<div class="page">
  <!-- Floral corners -->
  <div class="fc-tl">${floralCorner(false)}</div>
  <div class="fc-tr">${floralCorner(true)}</div>

  <!-- Document Header -->
  <div class="doc-header">
    <div class="h-left">
      <div class="bill-lbl">Bill / Invoice</div>
      <div class="inv-num">${esc(invoiceNum)}</div>
      <div class="inv-row">&#128197; ${printDate}</div>
      <div class="inv-row">&#128336; ${printTime}</div>
    </div>

    <div class="h-center">
      <div class="brand-row">&#9890;&nbsp;Moify</div>
      <div class="brand-sub">Smart Digital Wedding Gift Ledger</div>
      <div class="of-row"><div class="of-line"></div><span>${esc(eventOfLabel)}</span><div class="of-line"></div></div>
      <div class="couple-names">
        ${esc(event.primary_name)}${event.secondary_name ? ` <span class="c-heart">&#10084;</span> ${esc(event.secondary_name)}` : ''}
      </div>
      <div class="ornament">&#10022; &nbsp; &#10022; &nbsp; &#10022;</div>
    </div>

    <div class="h-right">
      <div class="ty-text">Thank You!</div>
      <div class="ty-heart">&#10084;</div>
      <div class="ty-msg">Your blessings make<br>our day special.</div>
    </div>
  </div>

  <!-- Info Cards -->
  <div class="info-cards">
    <div class="info-card">
      <div class="card-hdr"><span class="card-ico">&#128100;</span>${esc(cfg.sideALabel.toUpperCase())}'S FAMILY</div>
      ${event.family_name ? `<div class="card-ln">${esc(event.family_name)}</div>` : ''}
      <div class="card-ln">${esc(event.primary_name)}</div>
      ${event.city ? `<div class="card-ln">${esc(event.city)}${event.district ? ', ' + esc(event.district) : ''}</div>` : ''}
    </div>
    <div class="info-card">
      <div class="card-hdr"><span class="card-ico">&#128205;</span>VENUE</div>
      <div class="card-ln">${event.venue ? esc(event.venue) : '&#8212;'}</div>
      ${event.city ? `<div class="card-ln">${esc(event.city)}${event.district ? ', ' + esc(event.district) : ''}</div>` : ''}
    </div>
    <div class="info-card">
      <div class="card-hdr"><span class="card-ico">&#128197;</span>FUNCTION DATE</div>
      <div class="card-ln">${eventDate}</div>
      <div class="card-ln">${eventDay}</div>
    </div>
  </div>

  <!-- Table -->
  <table class="moi-tbl">
    <thead>
      <tr>
        <th style="width:32px">S.No</th>
        <th class="tl" style="min-width:140px">Guest Name (English | Tamil)<br><span style="font-size:8.5px;font-weight:400;opacity:.85;">விருந்தினர் பெயர்</span></th>
        <th class="tl" style="width:80px">City</th>
        <th class="tl" style="width:90px">District</th>
        <th style="width:80px">Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">No entries found</td></tr>`}
    </tbody>
  </table>

  <!-- Summary Row -->
  <div class="summary-row">
    <div class="tg-box">
      <div class="tg-ico">&#128101;</div>
      <div>
        <div class="tg-count">${totalQty}</div>
        <div class="tg-lbl">Total Guests</div>
      </div>
    </div>
    <div class="ta-box">
      <div class="ta-lbl">Total Amount</div>
      <div class="ta-val">&#8377;&nbsp;${fmtNum(grandTotal)}</div>
      <div class="ta-words">(${this.numberToWords(grandTotal)})</div>
    </div>
  </div>

  <!-- Bottom Section -->
  <div class="bottom-sec">
    <div class="notes-sec">
      <div class="notes-ttl">Notes</div>
      <ul>
        <li>This is a system generated invoice.</li>
        <li>Thank you for your valuable blessings and gifts.</li>
        <li>We appreciate your presence and good wishes.</li>
      </ul>
    </div>
    <div class="gratitude-center">
      <span class="grat-orn">&#10084;</span>
      With Love &amp; Gratitude
      <span class="grat-orn">&#10084;</span>
    </div>
    <div class="auth-sec">
      <div class="auth-ttl">Authorized By</div>
      <div class="auth-sigs">
        <div class="auth-sig">
          <div class="auth-line"></div>
          <div class="auth-name">Family Representative</div>
          <div class="auth-role">( ${esc(event.family_name || event.primary_name)} )</div>
        </div>
        <div class="auth-sig">
          <div class="auth-line"></div>
          <div class="auth-name">Moify Team</div>
          <div class="auth-role">( Authorized Signatory )</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Page Footer -->
  <div class="pg-footer">
    <span>&#127760; www.moify.com</span>
    <span class="pf-sep">|</span>
    <span>&#128222; support@moify.com</span>
    <span class="pf-sep">|</span>
    <span>&#9993; support@moify.com</span>
    <span class="pf-sep">|</span>
    <span class="pf-brand">Made with &#10084; by Moify</span>
  </div>
</div>

${mode === 'download' ? `
<div class="dl-bar">
  <span>&#128196; PDF ready &#8212; click <strong>Save as PDF</strong> and choose <em>Save as PDF</em> as destination.</span>
  <button onclick="window.print()">&#11015; Save as PDF</button>
</div>
<script>document.body.classList.add('has-dl-bar');</script>` : (!isManagedExternally ? `
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>` : '')}
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
  <div class="amount-words">${this.numberToWords(entry.amount)}</div>

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

  numberToWords(n: number): string {
    if (n < 0) return 'Minus ' + this.numberToWords(-n);
    if (n === 0) return 'Rupees Zero Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigit = (num: number): string => {
      if (num < 20) return ones[num];
      return (tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')).trim();
    };

    const threeDigit = (num: number): string => {
      if (num >= 100) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + twoDigit(num % 100) : '');
      return twoDigit(num);
    };

    const int = Math.floor(n);
    let rem = int;
    let parts: string[] = [];

    if (rem >= 10000000) { parts.push(threeDigit(Math.floor(rem / 10000000)) + ' Crore'); rem %= 10000000; }
    if (rem >= 100000)   { parts.push(threeDigit(Math.floor(rem / 100000)) + ' Lakh'); rem %= 100000; }
    if (rem >= 1000)     { parts.push(threeDigit(Math.floor(rem / 1000)) + ' Thousand'); rem %= 1000; }
    if (rem > 0)         { parts.push(threeDigit(rem)); }

    return 'Rupees ' + parts.join(' ') + ' Only';
  }
}
