import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MoiEntry } from '../models/moi.model';
import { Event, getEventConfig, getEventTitle } from '../models/event.model';

export type PaperSize = '58' | '80';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private doc = inject(DOCUMENT);

  printReceipt(entry: MoiEntry, event: Event, paperSize: PaperSize = '80'): void {
    const html = this.buildReceiptHtml(entry, event, paperSize);
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

  printConsolidatedSheet(entries: MoiEntry[], event: Event): void {
    const html = this.buildConsolidatedHtml(entries, event);
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
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      setTimeout(() => { try { win.close(); } catch { /* already closed */ } }, 30000);
    }, 400);
  }

  printGuestList(entries: MoiEntry[], event: Event): void {
    const html = this.buildGuestListHtml(entries, event);
    const win = this.doc.defaultView?.open(
      '', '_blank',
      `width=1100,height=750,toolbar=no,location=no,directories=no,status=no,menubar=yes,scrollbars=yes`
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

  private buildGuestListHtml(entries: MoiEntry[], event: Event): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);

    const e = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(n);

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const now = new Date();
    const printDateTime = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const eventDate = new Date(event.event_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const sideAEntries = entries.filter(x => x.side === 'groom');
    const sideBEntries = entries.filter(x => x.side === 'bride');
    const bothEntries  = entries.filter(x => x.side === 'both');
    const grandTotal   = entries.reduce((s, x) => s + x.amount, 0);
    const cashTotal    = entries.filter(x => x.payment_mode === 'cash').reduce((s, x) => s + x.amount, 0);
    const onlineTotal  = entries.filter(x => x.payment_mode === 'online').reduce((s, x) => s + x.amount, 0);
    const chequeTotal  = entries.filter(x => x.payment_mode === 'cheque' || x.payment_mode === 'dd').reduce((s, x) => s + x.amount, 0);

    const payLabel: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', online: 'Online', dd: 'DD' };

    const thead = `<thead>
      <tr>
        <th class="c-sno">#</th>
        <th class="c-name">Guest Name / Phone</th>
        <th class="c-rel">Relationship</th>
        <th class="c-city">City</th>
        <th class="c-amt">Amount</th>
        <th class="c-pay">Payment</th>
        <th class="c-ref">Ref / Cheque No</th>
        <th class="c-rcvd">Received By</th>
        <th class="c-notes">Notes</th>
        <th class="c-date">Date</th>
      </tr>
    </thead>`;

    const buildRows = (list: MoiEntry[]): string => {
      if (!list.length) {
        return `<tr><td colspan="10" class="empty-row">No entries</td></tr>`;
      }
      return list.map((x, i) => {
        const ref = x.cheque_number || x.transaction_ref || '';
        return `<tr>
          <td class="c-sno">${i + 1}</td>
          <td class="c-name">
            <span class="name">${e(x.guest_name)}</span>
            ${x.phone ? `<span class="phone">${e(x.phone)}</span>` : ''}
          </td>
          <td class="c-rel">${e(x.relationship || '')}</td>
          <td class="c-city">${e(x.city || '')}</td>
          <td class="c-amt">${e(fmt(x.amount))}</td>
          <td class="c-pay">${e(payLabel[x.payment_mode] ?? x.payment_mode)}</td>
          <td class="c-ref">${e(ref)}</td>
          <td class="c-rcvd">${e(x.received_by || '')}</td>
          <td class="c-notes">${e(x.notes || '')}</td>
          <td class="c-date">${e(fmtDate(x.created_at))}</td>
        </tr>`;
      }).join('');
    };

    const buildSection = (
      label: string, emoji: string,
      hdrBg: string, subBg: string, accentColor: string,
      list: MoiEntry[]
    ): string => {
      const subtotal = list.reduce((s, x) => s + x.amount, 0);
      return `
      <div class="section">
        <div class="sec-hdr" style="background:${hdrBg}">
          <span class="sec-title">${emoji} ${label}</span>
          <span class="sec-meta">${list.length} ${list.length === 1 ? 'guest' : 'guests'} &nbsp;|&nbsp; Sub-total: <b>${e(fmt(subtotal))}</b></span>
        </div>
        <table>
          ${thead}
          <tbody style="--accent:${accentColor};--sub-bg:${subBg}">
            ${buildRows(list)}
            <tr class="sub-total-row" style="border-top-color:${hdrBg}">
              <td colspan="4" class="total-label">Sub Total (${list.length} ${list.length === 1 ? 'entry' : 'entries'}):</td>
              <td class="total-val" style="color:${hdrBg}">${e(fmt(subtotal))}</td>
              <td colspan="5"></td>
            </tr>
          </tbody>
        </table>
      </div>`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Guest List — ${e(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 9mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #1a1a1a; background: #fff; }

    .hdr { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 2.5px solid #1a1a1a; padding-bottom: 3mm; margin-bottom: 3.5mm; }
    .hdr-left .event-badge { font-size: 8pt; background: #f0f0f0; padding: 1mm 2.5mm;
                             border-radius: 1mm; display: inline-block; margin-bottom: 1.5mm; }
    .hdr-left .couple { font-size: 16pt; font-weight: bold; }
    .hdr-left .heart  { color: #c0392b; }
    .hdr-left .meta   { font-size: 8pt; color: #555; margin-top: 1.5mm; }
    .hdr-left .meta span + span::before { content: ' • '; color: #ccc; margin: 0 3px; }
    .hdr-right { text-align: right; font-size: 7.5pt; color: #888; line-height: 1.8; }

    .strip { display: flex; gap: 2.5mm; margin-bottom: 3.5mm; }
    .chip  { flex: 1; border: 1px solid #ddd; border-radius: 1mm; padding: 1.5mm 2mm; text-align: center; }
    .chip .cv { font-size: 10pt; font-weight: bold; font-family: 'Courier New', Courier, monospace; }
    .chip .cl { font-size: 6.5pt; color: #666; margin-top: 0.5mm; }

    .section { margin-bottom: 5mm; break-inside: avoid; }
    .sec-hdr  { display: flex; justify-content: space-between; align-items: center;
                color: #fff; padding: 2mm 3mm; }
    .sec-title { font-size: 10.5pt; font-weight: bold; }
    .sec-meta  { font-size: 8pt; opacity: 0.9; }

    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #37474f; color: #fff; }
    th { padding: 1.8mm 1.5mm; font-size: 7.5pt; font-weight: bold; text-align: left; white-space: nowrap; }
    td { padding: 1.5mm 1.5mm; font-size: 8pt; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f8f9fa; }

    .c-sno  { width: 3%;  text-align: center; color: #aaa; }
    .c-name { width: 18%; }
    .c-rel  { width: 11%; font-style: italic; color: #555; }
    .c-city { width: 9%;  }
    .c-amt  { width: 10%; text-align: right; font-weight: bold; font-family: 'Courier New', Courier, monospace; }
    .c-pay  { width: 8%;  }
    .c-ref  { width: 12%; font-size: 7.5pt; color: #555; }
    .c-rcvd { width: 11%; font-size: 7.5pt; }
    .c-notes{ width: 12%; font-size: 7.5pt; color: #666; font-style: italic; }
    .c-date { width: 6%;  font-size: 7.5pt; color: #777; white-space: nowrap; }

    .name  { display: block; font-weight: 600; }
    .phone { display: block; font-size: 7pt; color: #888; margin-top: 0.5mm; }
    .empty-row { text-align: center; color: #bbb; font-style: italic; padding: 4mm; }

    .sub-total-row td { background: #f0f7ff !important; font-weight: bold; border-top: 2px solid; }
    .total-label { text-align: right; font-size: 8.5pt; }
    .total-val   { text-align: right; font-size: 9pt; font-family: 'Courier New', Courier, monospace; }

    .grand-bar { display: flex; justify-content: space-between; align-items: baseline;
                 background: #1a1a1a; color: #fff; padding: 2.5mm 4mm; margin-top: 1mm; }
    .grand-label { font-size: 10pt; font-weight: bold; }
    .grand-val   { font-size: 13pt; font-weight: bold; font-family: 'Courier New', Courier, monospace; }

    .footer { text-align: center; font-size: 7pt; color: #bbb; margin-top: 4mm;
              border-top: 1px solid #eee; padding-top: 2mm; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="hdr">
    <div class="hdr-left">
      <div class="event-badge">${cfg.emoji} ${e(cfg.label)}</div>
      <div class="couple">${e(title)}</div>
      <div class="meta">
        ${event.family_name ? `<span>${e(event.family_name)}</span>` : ''}
        <span>${eventDate}</span>
        ${event.venue ? `<span>${e(event.venue)}</span>` : ''}
        ${event.city ? `<span>${e(event.city)}</span>` : ''}
      </div>
    </div>
    <div class="hdr-right">
      <div><b>Guest Detail Register</b></div>
      <div>Printed: ${e(printDateTime)}</div>
      <div>Total: <b>${entries.length} guests</b></div>
    </div>
  </div>

  <div class="strip">
    <div class="chip">
      <div class="cv">${entries.length}</div><div class="cl">Total Guests</div>
    </div>
    <div class="chip" style="border-color:#1e3a5f">
      <div class="cv" style="color:#1e3a5f">${sideAEntries.length}</div>
      <div class="cl">${e(cfg.sideALabel)}</div>
    </div>
    <div class="chip" style="border-color:#6b1a2a">
      <div class="cv" style="color:#6b1a2a">${sideBEntries.length}</div>
      <div class="cl">${e(cfg.sideBLabel)}</div>
    </div>
    ${bothEntries.length > 0 ? `
    <div class="chip" style="border-color:#1a5c3a">
      <div class="cv" style="color:#1a5c3a">${bothEntries.length}</div>
      <div class="cl">Both</div>
    </div>` : ''}
    <div class="chip" style="border-color:#333">
      <div class="cv">${e(fmt(grandTotal))}</div><div class="cl">Grand Total</div>
    </div>
    <div class="chip">
      <div class="cv">${e(fmt(cashTotal))}</div><div class="cl">Cash</div>
    </div>
    <div class="chip">
      <div class="cv">${e(fmt(onlineTotal))}</div><div class="cl">Online</div>
    </div>
    <div class="chip">
      <div class="cv">${e(fmt(chequeTotal))}</div><div class="cl">Cheque / DD</div>
    </div>
  </div>

  ${buildSection(cfg.sideALabel, cfg.sideAEmoji, '#1e3a5f', '#eef2f8', '#1e3a5f', sideAEntries)}
  ${buildSection(cfg.sideBLabel, cfg.sideBEmoji, '#6b1a2a', '#f8eef0', '#6b1a2a', sideBEntries)}
  ${bothEntries.length > 0 ? buildSection('Both', '&#129351;', '#1a5c3a', '#eef7f1', '#1a5c3a', bothEntries) : ''}

  <div class="grand-bar">
    <div class="grand-label">Grand Total &mdash; ${entries.length} ${entries.length === 1 ? 'Guest' : 'Guests'}</div>
    <div class="grand-val">${e(fmt(grandTotal))}</div>
  </div>

  <div class="footer">
    ${e(title)} &mdash; ${e(cfg.label)} Guest Detail Register &mdash; Moi Manager
  </div>

</body>
</html>`;
  }

  private buildConsolidatedHtml(entries: MoiEntry[], event: Event): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);

    const e = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(n);

    const now = new Date();
    const printDateTime = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const eventDate = new Date(event.event_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const sideAEntries = entries.filter(x => x.side === 'groom');
    const sideBEntries = entries.filter(x => x.side === 'bride');
    const bothEntries  = entries.filter(x => x.side === 'both');

    const sideATotal = sideAEntries.reduce((s, x) => s + x.amount, 0);
    const sideBTotal = sideBEntries.reduce((s, x) => s + x.amount, 0);
    const bothTotal  = bothEntries.reduce((s, x) => s + x.amount, 0);
    const grandTotal = sideATotal + sideBTotal + bothTotal;

    const paymentLabel: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', online: 'Online', dd: 'DD' };

    const buildRows = (list: MoiEntry[]): string => {
      if (!list.length) {
        return `<tr><td colspan="8" style="text-align:center;color:#bbb;padding:4mm;font-style:italic;">No entries</td></tr>`;
      }
      return list.map((x, i) => `
        <tr>
          <td class="sno">${i + 1}</td>
          <td class="col-name">${e(x.guest_name)}</td>
          <td class="col-rel">${e(x.relationship || '')}</td>
          <td class="col-city">${e(x.city || '')}</td>
          <td class="col-amount">${e(fmt(x.amount))}</td>
          <td class="col-payment">${e(paymentLabel[x.payment_mode] || x.payment_mode)}</td>
          <td class="col-received">${e(x.received_by || '')}</td>
          <td class="col-ref">${e(x.cheque_number || x.transaction_ref || '')}</td>
        </tr>`).join('');
    };

    const buildSection = (label: string, emoji: string, color: string, list: MoiEntry[], total: number): string => `
      <div class="section">
        <div class="section-header" style="background:${color}">
          <span class="section-title">${emoji} ${label}</span>
          <span class="section-count">${list.length} ${list.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="sno">#</th>
              <th class="col-name">Guest Name</th>
              <th class="col-rel">Relationship</th>
              <th class="col-city">City</th>
              <th class="col-amount">Amount</th>
              <th class="col-payment">Payment</th>
              <th class="col-received">Received By</th>
              <th class="col-ref">Ref / Cheque No</th>
            </tr>
          </thead>
          <tbody>
            ${buildRows(list)}
            <tr class="total-row" style="border-top-color:${color}">
              <td colspan="4" class="total-label">Sub Total (${list.length} ${list.length === 1 ? 'entry' : 'entries'}):</td>
              <td class="total-amount" style="color:${color}">${e(fmt(total))}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>
      </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Moi Register — ${e(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; background: #fff; }

    .page-header { text-align: center; padding-bottom: 4mm; border-bottom: 2.5px solid #1a1a1a; margin-bottom: 6mm; }
    .event-badge { font-size: 9pt; background: #f0f0f0; padding: 1mm 3mm; border-radius: 1mm;
                   display: inline-block; margin-bottom: 2mm; }
    .event-title { font-size: 20pt; font-weight: bold; letter-spacing: 1px; }
    .heart { color: #c0392b; margin: 0 4px; }
    .header-sub { font-size: 9.5pt; color: #444; margin-top: 2mm; }
    .header-sub span + span::before { content: ' • '; color: #ccc; margin: 0 4px; }
    .print-note { font-size: 8pt; color: #888; margin-top: 2mm; }

    .section { margin-bottom: 5mm; break-inside: avoid; }
    .section-header { display: flex; justify-content: space-between; align-items: center;
                      color: #fff; padding: 2mm 3mm; }
    .section-title { font-size: 11pt; font-weight: bold; }
    .section-count { font-size: 8.5pt; opacity: 0.85; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #ecf0f1; padding: 1.5mm 2mm; text-align: left; font-size: 8.5pt;
         font-weight: bold; border: 1px solid #bdc3c7; }
    td { padding: 1.5mm 2mm; font-size: 8.5pt; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }

    .sno          { width: 5%; text-align: center; color: #999; }
    .col-name     { width: 17%; font-weight: 600; }
    .col-rel      { width: 13%; color: #555; font-style: italic; font-size: 8pt; }
    .col-city     { width: 9%; }
    .col-amount   { width: 12%; text-align: right; font-weight: bold;
                    font-family: 'Courier New', Courier, monospace; }
    .col-payment  { width: 9%; text-align: center; }
    .col-received { width: 13%; font-size: 8pt; }
    .col-ref      { width: 22%; font-size: 7.5pt; color: #666; }

    .total-row td    { background: #f0f7ff !important; font-weight: bold; border-top: 2px solid; }
    .total-label     { text-align: right; font-size: 9pt; }
    .total-amount    { text-align: right; font-size: 10pt; font-family: 'Courier New', Courier, monospace; }

    .summary { margin-top: 5mm; break-inside: avoid; }
    .summary-title { font-size: 11pt; font-weight: bold; text-align: center;
                     border-bottom: 1.5px solid #ccc; padding-bottom: 1.5mm; margin-bottom: 3mm; }
    .summary-grid  { display: flex; gap: 4mm; }
    .summary-card  { flex: 1; border: 1.5px solid #2c3e50; border-radius: 1mm; padding: 3mm; text-align: center; }
    .summary-value { font-size: 13pt; font-weight: bold; font-family: 'Courier New', Courier, monospace; }
    .summary-label { font-size: 8pt; color: #555; margin-top: 1mm; }
    .grand-row  { display: flex; justify-content: space-between; align-items: baseline;
                  border-top: 2px solid #1a1a1a; margin-top: 4mm; padding-top: 3mm; }
    .grand-label { font-size: 12pt; font-weight: bold; }
    .grand-value { font-size: 17pt; font-weight: bold; font-family: 'Courier New', Courier, monospace; }

    .footer { text-align: center; font-size: 7.5pt; color: #aaa;
              margin-top: 8mm; border-top: 1px solid #eee; padding-top: 3mm; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="page-header">
    <div class="event-badge">${cfg.emoji} ${e(cfg.label)}</div>
    <div class="event-title">${e(title)}</div>
    <div class="header-sub">
      ${event.family_name ? `<span>${e(event.family_name)}</span>` : ''}
      <span>${eventDate}</span>
      ${event.venue ? `<span>${e(event.venue)}</span>` : ''}
      ${event.city ? `<span>${e(event.city)}</span>` : ''}
    </div>
    <div class="print-note">
      Moi Consolidated Register &nbsp;&bull;&nbsp;
      Printed: ${e(printDateTime)} &nbsp;&bull;&nbsp;
      Total: ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}
    </div>
  </div>

  ${buildSection(cfg.sideALabel, cfg.sideAEmoji, '#1e3a5f', sideAEntries, sideATotal)}
  ${buildSection(cfg.sideBLabel, cfg.sideBEmoji, '#6b1a2a', sideBEntries, sideBTotal)}
  ${bothEntries.length > 0 ? buildSection('Both', '&#129351;', '#1a5c3a', bothEntries, bothTotal) : ''}

  <div class="summary">
    <div class="summary-title">Summary</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${e(fmt(sideATotal))}</div>
        <div class="summary-label">${e(cfg.sideALabel)} &mdash; ${sideAEntries.length} entries</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${e(fmt(sideBTotal))}</div>
        <div class="summary-label">${e(cfg.sideBLabel)} &mdash; ${sideBEntries.length} entries</div>
      </div>
      ${bothEntries.length > 0 ? `
      <div class="summary-card">
        <div class="summary-value">${e(fmt(bothTotal))}</div>
        <div class="summary-label">Both &mdash; ${bothEntries.length} entries</div>
      </div>` : ''}
    </div>
    <div class="grand-row">
      <div class="grand-label">Grand Total</div>
      <div class="grand-value">${e(fmt(grandTotal))}</div>
    </div>
  </div>

  <div class="footer">
    ${e(title)} ${e(cfg.label)} &mdash; Moi Manager &mdash; Consolidated Register
  </div>

</body>
</html>`;
  }

  private buildReceiptHtml(entry: MoiEntry, event: Event, paperSize: PaperSize): string {
    const cfg = getEventConfig(event.event_type);
    const title = getEventTitle(event);

    const widthMm = paperSize === '58' ? '58mm' : '80mm';
    const widthPx = paperSize === '58' ? '220px' : '302px';
    const fontSize = paperSize === '58' ? '10px' : '12px';
    const titleSize = paperSize === '58' ? '13px' : '16px';
    const amtSize = paperSize === '58' ? '18px' : '22px';

    const eventDate = new Date(event.event_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const now = new Date();
    const printDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const printTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const amountFormatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(entry.amount);

    const sideLabels: Record<string, string> = {
      groom: cfg.sideALabel,
      bride: cfg.sideBLabel,
      both: 'Both',
    };

    const paymentLabels: Record<string, string> = {
      cash: 'CASH', cheque: 'CHEQUE', online: 'ONLINE TRANSFER', dd: 'DEMAND DRAFT',
    };

    const e = (s: string | number | undefined): string =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const row = (label: string, value: string, bold = false): string =>
      `<tr>
        <td class="lbl">${e(label)}</td>
        <td class="val">${bold ? `<b>${value}</b>` : value}</td>
      </tr>`;

    const conditionalRow = (label: string, value: string | undefined, bold = false): string =>
      value ? row(label, e(value), bold) : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Moi Receipt #${e(String(entry.id))}</title>
  <style>
    @page { size: ${widthMm} auto; margin: 2mm 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.4;
      width: ${widthPx};
      max-width: ${widthPx};
      padding: 4mm 3mm 6mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .title    { font-size: ${titleSize}; font-weight: bold; letter-spacing: 1px; }
    .subtitle { font-size: calc(${fontSize} - 1px); letter-spacing: 0.5px; margin-top: 2px; }
    .dline { margin: 4px 0 3px; font-size: calc(${fontSize} - 1px); letter-spacing: 2px;
             white-space: nowrap; overflow: hidden; }
    .sline { margin: 3px 0; font-size: calc(${fontSize} - 1px); letter-spacing: 1px;
             white-space: nowrap; overflow: hidden; }
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
    }
    .footer { font-size: calc(${fontSize} - 1px); text-align: center; margin-top: 5px; line-height: 1.6; }
    @media print {
      body { width: ${widthMm}; }
      @page { size: ${widthMm} auto; margin: 2mm 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">MOI MANAGER</div>
    <div class="subtitle">${cfg.emoji} ${e(cfg.label)} Gift Registry Receipt</div>
  </div>

  <div class="dline">================================</div>

  <table>
    <tr>
      <td class="lbl">Event</td>
      <td class="val"><b>${e(title)}</b></td>
    </tr>
    ${event.family_name ? row('Family', e(event.family_name)) : ''}
    ${row(cfg.dateLabel, eventDate)}
    ${event.venue ? row('Venue', e(event.venue)) : ''}
  </table>

  <div class="sline">--------------------------------</div>

  <table>
    ${entry.id ? row('Receipt No', '#' + e(String(entry.id))) : ''}
    ${row('Printed', printDate + ' ' + printTime)}
  </table>

  <div class="sline">--------------------------------</div>

  <table>
    ${row('Guest Name', e(entry.guest_name), true)}
    ${conditionalRow('Relation', entry.relationship)}
    ${row('Side', sideLabels[entry.side] || e(entry.side))}
    ${conditionalRow('City', entry.city)}
    ${conditionalRow('Phone', entry.phone)}
  </table>

  <div class="amount-block">
    AMOUNT : ${e(amountFormatted)}
  </div>

  <table>
    ${row('Payment', paymentLabels[entry.payment_mode] || e(entry.payment_mode))}
    ${conditionalRow('Cheque No', entry.cheque_number)}
    ${conditionalRow('Txn Ref', entry.transaction_ref)}
    ${conditionalRow('Received By', entry.received_by)}
    ${conditionalRow('Notes', entry.notes)}
  </table>

  <div class="dline">================================</div>

  <div class="footer">
    <div>Thank you for your generous blessing!</div>
    <div>May God bless this ${e(cfg.label.toLowerCase())}</div>
  </div>

  <div class="dline">================================</div>
</body>
</html>`;
  }
}
