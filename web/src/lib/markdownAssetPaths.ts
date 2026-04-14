export function normalizeMarkdownAssetPaths(markdown: string, filePath?: string): string {
  const fileDir = filePath
    ? filePath.replace(/^\.\//, '').split('/').slice(0, -1).join('/')
    : '';

  function resolveImagePath(src: string): string {
    if (src.startsWith('/') || /^https?:\/\//.test(src) || src.startsWith('data:')) return src;

    const base = fileDir ? fileDir.split('/') : [];
    const parts = src.split('/');
    const resolved = [...base];

    for (const part of parts) {
      if (part === '..') resolved.pop();
      else if (part !== '.') resolved.push(part);
    }

    return '/raw/' + resolved.join('/');
  }

  return markdown
    .replace(/(!\[[^\]]*\]\()([^)]+)\)/g, (_, prefix, src) => `${prefix}${resolveImagePath(src)})`)
    .replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi, (_, pre, src, post) => `${pre}${resolveImagePath(src)}${post}`);
}
