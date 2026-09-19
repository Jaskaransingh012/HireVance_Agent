// URL canonicalization: strips tracking params & fragments so that
// the same opportunity posted with different UTM tags is recognized
// as identical.

const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^ref$/i,
  /^ref_src$/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_(cid|eid)$/i,
  /^igshid$/i,
  /^source$/i,
  /^campaign$/i,
  /^si$/i,
];

function isTrackingParam(key) {
  return TRACKING_PARAM_PATTERNS.some((re) => re.test(key));
}

/**
 * Produce a stable canonical form of a URL:
 * - lowercases scheme + host
 * - strips fragment
 * - removes tracking query params
 * - sorts remaining query params for determinism
 * - removes trailing slash (except root)
 */
function canonicalizeUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    // Not a valid absolute URL; return as-is (caller should validate upstream).
    return rawUrl.trim();
  }

  u.hash = '';

  const keptParams = [];
  for (const [key, value] of u.searchParams.entries()) {
    if (!isTrackingParam(key)) {
      keptParams.push([key, value]);
    }
  }
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  u.search = '';
  for (const [key, value] of keptParams) {
    u.searchParams.append(key, value);
  }

  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();

  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  u.pathname = pathname;

  return u.toString();
}

module.exports = { canonicalizeUrl };
