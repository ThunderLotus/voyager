const DECORATIVE_IMAGE_URL_PATTERNS: readonly RegExp[] = [
  // Google favicon service used by ChatGPT search-result citation cards
  /google\.com\/s2\/favicons/i,
  // Generic favicon query endpoints (e.g. DuckDuckGo icons)
  /\/favicons?\?/i,
  // Static favicon files
  /\/favicon\.(ico|png|svg|gif|webp)(\?|#|$)/i,
];

export function isDecorativeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return DECORATIVE_IMAGE_URL_PATTERNS.some((pattern) => pattern.test(url));
}
