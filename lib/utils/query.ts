/** Normalize free-text queries consistently. */
export function normalizeQuery(input: string): string {
  // Locale-aware normalization: strip diacritics via NFKD and lower case.
  // Collator-based compare will be handled at comparison points when needed.
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
