const PLACEHOLDER_PATTERN = /\{[^{}]+\}/gu;
const MARKER_PATTERN = /\[[A-Z][A-Z0-9_]*\]/gu;

export function flattenLocalizationTree(value, prefix = '', result = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenLocalizationTree(child, prefix ? `${prefix}.${key}` : key, result);
    }
  } else {
    result.set(prefix, value);
  }
  return result;
}

export function extractLocalizationTokens(value, pattern) {
  return typeof value === 'string' ? [...value.matchAll(pattern)].map(([token]) => token).sort() : [];
}

function sameTokens(left, right) {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

export function validateLocalizationDictionary(base, candidate, { ignoredPaths = [] } = {}) {
  const ignored = new Set(ignoredPaths);
  const baseEntries = flattenLocalizationTree(base);
  const candidateEntries = flattenLocalizationTree(candidate);
  const issues = [];
  for (const key of baseEntries.keys()) {
    if (!candidateEntries.has(key) && !ignored.has(key)) issues.push({ type: 'missing-key', key });
  }
  for (const key of candidateEntries.keys()) {
    if (!baseEntries.has(key) && !ignored.has(key)) issues.push({ type: 'extra-key', key });
  }
  for (const [key, baseValue] of baseEntries) {
    if (ignored.has(key) || !candidateEntries.has(key)) continue;
    const candidateValue = candidateEntries.get(key);
    const placeholders = extractLocalizationTokens(baseValue, PLACEHOLDER_PATTERN);
    const candidatePlaceholders = extractLocalizationTokens(candidateValue, PLACEHOLDER_PATTERN);
    if (!sameTokens(placeholders, candidatePlaceholders)) issues.push({ type: 'placeholder-parity', key });
    const markers = extractLocalizationTokens(baseValue, MARKER_PATTERN);
    const candidateMarkers = extractLocalizationTokens(candidateValue, MARKER_PATTERN);
    if (!sameTokens(markers, candidateMarkers)) issues.push({ type: 'marker-parity', key });
    if (typeof baseValue === 'string' && typeof candidateValue === 'string'
      && (baseValue.match(/\n/gu)?.length ?? 0) !== (candidateValue.match(/\n/gu)?.length ?? 0)) {
      issues.push({ type: 'newline-parity', key });
    }
  }
  return issues;
}

export function findUnsupportedLocaleReferences(value, supportedLocales, path = '', issues = []) {
  if (!value || typeof value !== 'object') return issues;
  if (Array.isArray(value)) {
    value.forEach((child, index) => findUnsupportedLocaleReferences(child, supportedLocales, `${path}[${index}]`, issues));
    return issues;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'en')) {
    for (const locale of Object.keys(value)) {
      if (!supportedLocales.includes(locale)) issues.push({ type: 'unsupported-locale', key: path, locale });
    }
    return issues;
  }
  for (const [key, child] of Object.entries(value)) {
    findUnsupportedLocaleReferences(child, supportedLocales, path ? `${path}.${key}` : key, issues);
  }
  return issues;
}
