const axios = require('axios');
const Parser = require('rss-parser');

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT = 'SkillPulse Trends Ingestion/1.0 (+https://skillpulse.local)';

let parserInstance = null;

function getParser() {
  if (!parserInstance) {
    parserInstance = new Parser({
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['content:encodedSnippet', 'contentEncodedSnippet'],
          ['dc:creator', 'creator'],
        ],
      },
    });
  }

  return parserInstance;
}

function sanitizeXml(xml) {
  return String(xml || '')
    .replace(/&(?!#\d+;|#x[0-9a-f]+;|[a-z][a-z0-9]+;)/gi, '&amp;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

async function fetchXmlWithAxios(source) {
  const response = await axios.get(source.url, {
    timeout: DEFAULT_TIMEOUT_MS,
    responseType: 'text',
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });

  return String(response.data || '');
}

async function fetchRssFeed(source, options = {}) {
  const parser = getParser();
  let feed;

  try {
    feed = await parser.parseURL(source.url);
  } catch (error) {
    console.warn('[TrendsIngestion] parser.parseURL failed, retrying with sanitized XML', {
      sourceName: source.name,
      url: source.url,
      error: String(error?.message || error || 'Unknown parse error'),
    });

    const xml = await fetchXmlWithAxios(source);
    feed = await parser.parseString(sanitizeXml(xml));
  }

  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.min(100, Number(options.limit)))
    : 25;
  const items = Array.isArray(feed?.items) ? feed.items.slice(0, limit) : [];

  return {
    feed,
    items,
  };
}

module.exports = {
  fetchRssFeed,
};
