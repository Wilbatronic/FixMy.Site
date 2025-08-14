export function createPageUrl(name) {
  const safe = String(name || '').trim().toLowerCase();
  return `/${safe}`;
}


