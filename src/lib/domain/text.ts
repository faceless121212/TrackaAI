const SLUG_MAX = 40;

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");
}

// "Engineering" → "ENG", "Mobile App" → "MA". Returns "" when nothing valid fits.
export function suggestKeyPrefix(name: string): string {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const raw = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] ?? "").slice(0, 3);
  const prefix = raw.replace(/^[0-9]+/, "").slice(0, 5);
  return prefix.length >= 2 ? prefix : "";
}

export function parseEmailList(text: string): string[] {
  const emails = text
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)];
}
