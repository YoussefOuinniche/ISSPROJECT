function normalizeTextForKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    parsed.hash = '';

    const retainedParams = [];
    parsed.searchParams.forEach((paramValue, paramName) => {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(paramName)) {
        return;
      }

      retainedParams.push([paramName, paramValue]);
    });

    retainedParams.sort(([left], [right]) => left.localeCompare(right));
    parsed.search = '';
    retainedParams.forEach(([paramName, paramValue]) => {
      parsed.searchParams.append(paramName, paramValue);
    });

    return parsed.toString();
  } catch (_error) {
    return raw;
  }
}

function buildTrendDedupKey(item) {
  const canonicalUrl = canonicalizeUrl(item?.source_url);
  if (canonicalUrl) {
    return `url:${canonicalUrl}`;
  }

  const normalizedTitle = normalizeTextForKey(item?.title);
  const normalizedSource = normalizeTextForKey(item?.source_name || item?.source);
  return `title:${normalizedTitle}|source:${normalizedSource}`;
}

function dedupeTrendItems(items) {
  const uniqueItems = [];
  const duplicates = [];
  const seenKeys = new Set();

  for (const item of Array.isArray(items) ? items : []) {
    const key = buildTrendDedupKey(item);
    if (seenKeys.has(key)) {
      duplicates.push(item);
      continue;
    }

    seenKeys.add(key);
    uniqueItems.push(item);
  }

  return {
    items: uniqueItems,
    duplicateCount: duplicates.length,
    duplicates,
  };
}

module.exports = {
  buildTrendDedupKey,
  canonicalizeUrl,
  dedupeTrendItems,
};
