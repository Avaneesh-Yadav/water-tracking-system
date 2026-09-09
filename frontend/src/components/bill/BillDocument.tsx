import React from "react";
import type { BillData } from "@/services/apiService";
import { amountInIndianWords } from "@/utils/amountInWords";

type Props = {
  bill: BillData;
  photoUrl?: string | null;
};

function nth(d: number) {
  if (d >= 11 && d <= 13) return "th";
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function billNumber(bill: BillData): string {
  const short = (bill.consumption_uuid || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  const period = `${bill.year}${String(bill.month).slice(0, 3).toUpperCase()}`;
  return `WB/${period}/${short || bill.connection_id}`;
}

export function BillDocument({ bill, photoUrl }: Props) {
  const paid = String(bill.payment_status || "").toUpperCase() === "PAID";
  const liters = Number(bill.consumption_liters) || 0;
  const rate = Number(bill.rate_per_liter) || 0;
  const amount = Number(bill.amount) || 0;
  const issued = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="wbill">
      <div className={`wbill-stamp${paid ? " is-paid" : ""}`}>{paid ? "Paid" : "Unpaid"}</div>

      <header className="wbill-letterhead">
        <div className="wbill-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 2.2S6.5 9.1 6.5 13.4A5.5 5.5 0 0 0 12 18.9a5.5 5.5 0 0 0 5.5-5.5C17.5 9.1 12 2.2 12 2.2zm0 14.2a2.7 2.7 0 0 1-2.7-2.7c0-1.8 2-4.6 2.7-5.8.7 1.2 2.7 4 2.7 5.8A2.7 2.7 0 0 1 12 16.4z" />
          </svg>
        </div>
        <div>
          <div className="wbill-org">{bill.organization_name}</div>
          <div className="wbill-doc-title">Water supply bill · Demand notice</div>
        </div>
        <div className="wbill-head-meta">
          <strong>{billNumber(bill)}</strong>
          Issued {issued}
        </div>
      </header>

      <div className="wbill-banner">
        <span className="wbill-banner-kicker">Consumer copy</span>
        <span className="wbill-banner-period">
          Billing period {bill.month} {bill.year}
        </span>
      </div>

      <div className="wbill-grid">
        <section className="wbill-panel">
          <h3>Consumer</h3>
          <dl className="wbill-kv">
            <dt>Name</dt>
            <dd>{bill.full_name || "—"}</dd>
            <dt>Mobile</dt>
            <dd>{bill.mobile_number || "—"}</dd>
            <dt>Address</dt>
            <dd>{bill.address || "—"}</dd>
          </dl>
        </section>
        <section className="wbill-panel">
          <h3>Connection</h3>
          <dl className="wbill-kv">
            <dt>Connection ID</dt>
            <dd className="wbill-mono">{bill.connection_id || "—"}</dd>
            <dt>Due day</dt>
            <dd>
              {bill.bill_due_day}
              {nth(bill.bill_due_day)} of the month
            </dd>
            <dt>Status</dt>
            <dd>{paid ? "Paid" : "Unpaid"}</dd>
          </dl>
        </section>
      </div>

      <table>
        <caption>Meter reading</caption>
        <thead>
          <tr>
            <th>Previous</th>
            <th>Current</th>
            <th className="num">Consumption</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{bill.previous_meter_reading != null ? Number(bill.previous_meter_reading).toLocaleString("en-IN") : "—"}</td>
            <td>{bill.current_meter_reading != null ? Number(bill.current_meter_reading).toLocaleString("en-IN") : "—"}</td>
            <td className="num">{liters.toLocaleString("en-IN")} L</td>
          </tr>
        </tbody>
      </table>

      <table>
        <caption>Particulars</caption>
        <thead>
          <tr>
            <th>Charge</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Water charges</td>
            <td className="num">{liters.toLocaleString("en-IN")} L</td>
            <td className="num">₹{rate.toFixed(2)} / L</td>
            <td className="num">{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr className="wbill-total-row">
            <td colSpan={3}>Amount payable</td>
            <td className="num">
              ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="wbill-amount-box">
        <div>
          <div className="wbill-amount-label">Amount in words</div>
          <div className="wbill-amount-words">{amountInIndianWords(amount)}</div>
        </div>
        <div className="wbill-amount-figure">
          ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {photoUrl ? (
        <div className="wbill-photo">
          <p>Meter photograph</p>
          <img src={photoUrl} alt="Meter reading" />
        </div>
      ) : null}

      <p className="wbill-notes">
        <strong>Payment:</strong> Please pay by the {bill.bill_due_day}
        {nth(bill.bill_due_day)} of the month where applicable. This is a computer-generated
        bill and does not require a signature.
      </p>

      <div className="wbill-cut">
        <span>Detach counterfoil</span>
      </div>

      <div className="wbill-foil">
        <div>
          <label>Connection</label>
          <b className="wbill-mono">{bill.connection_id || "—"}</b>
        </div>
        <div>
          <label>Period</label>
          <b>
            {bill.month} {bill.year}
          </b>
        </div>
        <div>
          <label>Amount</label>
          <b>₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        </div>
        <div>
          <label>Status</label>
          <b>{paid ? "Paid" : "Unpaid"}</b>
        </div>
      </div>

      <div className="wbill-foot">
        <span>{bill.organization_name}</span>
        <span>Retain this copy for your records</span>
      </div>
    </article>
  );
}
