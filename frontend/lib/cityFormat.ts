const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const normalizeCityKey = (value: string) =>
  normalizeWhitespace(value || '').toLowerCase();

const capitalizeToken = (token: string) =>
  token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : '';

export const formatCityName = (value: string) => {
  const normalized = normalizeWhitespace(value || '');
  if (!normalized) return '';

  return normalized
    .split(' ')
    .map((part) =>
      part
        .split('-')
        .map(capitalizeToken)
        .join('-')
    )
    .join(' ');
};
