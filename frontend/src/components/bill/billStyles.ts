/** Self-contained utility-bill stylesheet. Used on screen and injected into the print iframe. */
export const BILL_PRINT_CSS = `
.wbill {
  --ink: #12324a;
  --rule: #1b4d6b;
  --muted: #4a6576;
  --paper: #ffffff;
  --stamp-due: #b42318;
  --stamp-paid: #1b7a3d;
  box-sizing: border-box;
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  color: var(--ink);
  background: var(--paper);
  font-family: "Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif;
  font-size: 12px;
  line-height: 1.35;
  border: 2px solid var(--rule);
  padding: 14px 16px 12px;
  position: relative;
}
.wbill *,
.wbill *::before,
.wbill *::after { box-sizing: border-box; }

.wbill-letterhead {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 10px;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 3px solid var(--rule);
}
.wbill-mark {
  width: 42px;
  height: 42px;
  border: 2px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wbill-mark svg { width: 26px; height: 26px; fill: var(--rule); }
.wbill-org {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.15;
}
.wbill-doc-title {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.wbill-head-meta {
  text-align: right;
  font-size: 11px;
  color: var(--muted);
}
.wbill-head-meta strong {
  display: block;
  color: var(--ink);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.wbill-banner {
  margin: 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  padding: 6px 2px;
}
.wbill-banner-kicker {
  font-weight: 800;
  letter-spacing: 0.18em;
  font-size: 11px;
  text-transform: uppercase;
}
.wbill-banner-period {
  font-weight: 700;
  font-size: 13px;
}

.wbill-stamp {
  position: absolute;
  top: 86px;
  right: 22px;
  border: 3px solid var(--stamp-due);
  color: var(--stamp-due);
  font-weight: 800;
  letter-spacing: 0.18em;
  padding: 4px 10px;
  transform: rotate(-12deg);
  font-size: 16px;
  line-height: 1;
  opacity: 0.88;
  pointer-events: none;
  text-transform: uppercase;
}
.wbill-stamp.is-paid {
  border-color: var(--stamp-paid);
  color: var(--stamp-paid);
}

.wbill-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-top: 12px;
  border: 1px solid var(--rule);
}
.wbill-panel {
  padding: 8px 10px;
}
.wbill-panel + .wbill-panel {
  border-left: 1px solid var(--rule);
}
.wbill-panel h3 {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 800;
}
.wbill-kv {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 2px 8px;
  margin: 0;
}
.wbill-kv dt {
  margin: 0;
  color: var(--muted);
}
.wbill-kv dd {
  margin: 0;
  font-weight: 600;
  word-break: break-word;
}
.wbill-mono { font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace; letter-spacing: 0.02em; }

.wbill table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}
.wbill caption {
  caption-side: top;
  text-align: left;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 0 4px;
}
.wbill th,
.wbill td {
  border: 1px solid var(--rule);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}
.wbill th {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--muted);
}
.wbill td.num,
.wbill th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.wbill-total-row td {
  font-weight: 800;
  font-size: 13px;
}
.wbill-amount-box {
  margin-top: 12px;
  border: 2px solid var(--rule);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding: 8px 10px;
  gap: 12px;
}
.wbill-amount-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.wbill-amount-words {
  margin-top: 2px;
  font-size: 11px;
  font-style: italic;
}
.wbill-amount-figure {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wbill-photo {
  margin-top: 12px;
  border: 1px solid var(--rule);
  padding: 8px;
  text-align: center;
}
.wbill-photo p {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.wbill-photo img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.wbill-notes {
  margin-top: 10px;
  font-size: 10.5px;
  color: var(--muted);
}
.wbill-notes strong { color: var(--ink); }

.wbill-cut {
  margin: 14px 0 10px;
  border-top: 1.5px dashed var(--rule);
  position: relative;
  height: 0;
}
.wbill-cut span {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -55%);
  background: var(--paper);
  padding: 0 8px;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}

.wbill-foil {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.9fr 1fr;
  gap: 0;
  border: 1px solid var(--rule);
  font-size: 11px;
}
.wbill-foil div {
  padding: 7px 8px;
}
.wbill-foil div + div { border-left: 1px solid var(--rule); }
.wbill-foil label {
  display: block;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 800;
  margin-bottom: 2px;
}
.wbill-foil b { font-size: 12px; }

.wbill-foot {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 9.5px;
  color: var(--muted);
}

@media print {
  .wbill {
    border-width: 1.5px;
    max-width: none;
    padding: 0;
  }
}
`.trim();
