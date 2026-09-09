const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const TEENS = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number): string {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ""}`.trim();
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h ? `${ONES[h]} Hundred` : "";
  const tail = rest ? twoDigit(rest) : "";
  return [head, tail].filter(Boolean).join(" ");
}

/** Indian numbering: crore / lakh / thousand. */
export function amountInIndianWords(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const cents = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(cents / 100);
  const paise = cents % 100;
  if (rupees === 0 && paise === 0) return "Zero Rupees only";

  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigit(crore)} Crore`);
  if (lakh) parts.push(`${threeDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigit(thousand)} Thousand`);
  if (hundred) parts.push(threeDigit(hundred));

  const rupeePart = rupees === 0 ? "Zero Rupees" : `${parts.join(" ")} ${rupees === 1 ? "Rupee" : "Rupees"}`;
  const paisePart = paise ? ` and ${twoDigit(paise)} ${paise === 1 ? "Paisa" : "Paise"}` : "";
  return `${rupeePart}${paisePart} only`;
}
