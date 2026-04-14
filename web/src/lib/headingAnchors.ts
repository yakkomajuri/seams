const SPECIAL_CHAR_MAP: Record<string, string> = {
  '&': ' and ',
  '@': ' at ',
  'ß': 'ss',
  'ẞ': 'ss',
  'æ': 'ae',
  'Æ': 'ae',
  'œ': 'oe',
  'Œ': 'oe',
  'ø': 'o',
  'Ø': 'o',
  'å': 'a',
  'Å': 'a',
  'đ': 'd',
  'Đ': 'd',
  'ð': 'd',
  'Ð': 'd',
  'þ': 'th',
  'Þ': 'th',
  'ł': 'l',
  'Ł': 'l',
  'ħ': 'h',
  'Ħ': 'h',
  'ı': 'i',
  'ĸ': 'k',
  'ŋ': 'n',
  'Ŋ': 'n',
};

function mapSpecialCharacters(text: string): string {
  return Array.from(text, (char) => SPECIAL_CHAR_MAP[char] ?? char).join('');
}

function getHeadingElements(container: ParentNode): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-content-type="heading"] > .bn-inline-content'),
  );
}

export function decodeHeadingHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return '';

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function headingAnchorSlug(text: string): string {
  const slug = mapSpecialCharacters(text.trim())
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

export function buildHeadingAnchorSlugs(texts: Iterable<string>): string[] {
  const seen = new Map<string, number>();

  return Array.from(texts, (text) => {
    const base = headingAnchorSlug(text);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

export function syncHeadingAnchorIds(container: ParentNode): string[] {
  const headings = getHeadingElements(container);
  const anchors = buildHeadingAnchorSlugs(
    headings.map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
  );

  headings.forEach((heading, index) => {
    const anchor = anchors[index];
    heading.id = anchor;
    heading.setAttribute('data-heading-anchor', anchor);
  });

  return anchors;
}

export function scrollToHeadingAnchor(container: ParentNode, hash: string): boolean {
  const targetId = decodeHeadingHash(hash);
  if (!targetId) return false;

  const target = getHeadingElements(container).find((heading) => heading.id === targetId);
  if (!target) return false;

  target.scrollIntoView({ block: 'start', behavior: 'auto' });
  return true;
}
