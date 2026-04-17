const { inferTrendDomain, normalizeCategoryList } = require('./domainInference');
const { canonicalizeUrl } = require('./deduplication');

const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 4000;

const HTML_ENTITY_MAP = Object.freeze({
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&apos;': '\'',
  '&nbsp;': ' ',
});

function stripCdata(value) {
  return String(value || '')
    .replace(/^<!\[CDATA\[/i, '')
    .replace(/\]\]>$/i, '');
}

function decodeHtmlEntities(value) {
  let output = String(value || '');

  Object.entries(HTML_ENTITY_MAP).forEach(([entity, replacement]) => {
    output = output.split(entity).join(replacement);
  });

  output = output.replace(/&#(\d+);/g, (_match, codePoint) => {
    const numeric = Number(codePoint);
    return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
  });

  output = output.replace(/&#x([0-9a-f]+);/gi, (_match, hexCodePoint) => {
    const numeric = Number.parseInt(hexCodePoint, 16);
    return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
  });

  return output;
}

function cleanHtmlText(value) {
  return decodeHtmlEntities(
    stripCdata(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return '';

  const characters = Array.from(text);
  if (characters.length <= maxLength) {
    return text;
  }

  return `${characters.slice(0, Math.max(0, maxLength - 1)).join('')}…`;
}

function normalizePublishedAt(item) {
  const candidates = [
    item?.isoDate,
    item?.pubDate,
    item?.published,
    item?.date,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function resolveSourceUrl(item, source) {
  const candidates = [
    item?.link,
    item?.guid,
    item?.id,
    source?.homepage,
  ];

  for (const candidate of candidates) {
    const url = canonicalizeUrl(candidate);
    if (url) {
      return url;
    }
  }

  return '';
}

function resolveDescription(item) {
  const candidates = [
    item?.contentSnippet,
    item?.summary,
    item?.contentEncodedSnippet,
    item?.contentEncoded,
    item?.content,
    item?.description,
  ];

  for (const candidate of candidates) {
    const cleaned = cleanHtmlText(candidate);
    if (cleaned) {
      return truncateText(cleaned, MAX_DESCRIPTION_LENGTH);
    }
  }

  return '';
}

function resolveTitle(item) {
  const title = cleanHtmlText(item?.title);
  return truncateText(title, MAX_TITLE_LENGTH);
}

function normalizeTrendItem(item, source, options = {}) {
  const title = resolveTitle(item);
  if (!title) {
    return null;
  }

  const description = resolveDescription(item);
  const categories = normalizeCategoryList(item?.categories || item?.category);
  const sourceUrl = resolveSourceUrl(item, source);
  const publishedAt = normalizePublishedAt(item);
  const scrapedAt = String(options.scrapedAt || new Date().toISOString());

  return {
    domain: inferTrendDomain({
      title,
      description,
      categories,
      source,
    }),
    title,
    description,
    source: String(source?.name || '').trim() || 'Unknown Source',
    source_name: String(source?.name || '').trim() || 'Unknown Source',
    source_url: sourceUrl,
    published_at: publishedAt,
    scraped_at: scrapedAt,
  };
}

module.exports = {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  cleanHtmlText,
  normalizePublishedAt,
  normalizeTrendItem,
  truncateText,
};
