const NBSP = " ";

/** 12 500,00 ₴ — formatted by hand so server and browser output always match. */
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  const [int, frac] = Math.abs(amount).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${grouped},${frac}${NBSP}₴`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function parseMoney(text: string): number {
  return Number(text.replace(",", "."));
}

/** "olena.koval@firm.ua" → "Olena Koval": shown only until the person enters their real name. */
export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[._\-+]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : email;
}
