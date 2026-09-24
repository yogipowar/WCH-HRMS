const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  if (hundred) {
    parts.push(`${ONES[hundred]} Hundred`);
  }
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(ONES[rest % 10]);
  } else if (rest) {
    parts.push(ONES[rest]);
  }
  return parts.join(" ");
}

export function amountInIndianWords(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  if (rounded === 0) return "Rupees Zero Only";

  const crore = Math.floor(rounded / 10_000_000);
  const lakh = Math.floor((rounded % 10_000_000) / 100_000);
  const thousand = Math.floor((rounded % 100_000) / 1000);
  const rest = rounded % 1000;
  const parts: string[] = [];

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));

  return `Rupees ${parts.join(" ")} Only`;
}
