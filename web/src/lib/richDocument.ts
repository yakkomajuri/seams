import type { SeamsBlock, SeamsEditor, SeamsPartialBlock } from './editorSchema';

type SourceSegment =
  | { kind: 'markdown'; source: string }
  | { kind: 'blockquote'; source: string }
  | { kind: 'mdxRaw'; source: string }
  | { kind: 'details'; open: boolean; summary: string; children: SourceSegment[]; raw: string };

interface SegmentOptions {
  mdx: boolean;
}

export function isMdxFile(path?: string): boolean {
  return path?.toLowerCase().endsWith('.mdx') ?? false;
}

export function collapseListGaps(markdown: string): string {
  return markdown.replace(/^([ \t]*[-*+\d.]+[ \t]+.*)\n\n(?=[ \t]*[-*+\d.]+[ \t]+)/gm, '$1\n');
}

export async function importRichDocument(
  editor: SeamsEditor,
  source: string,
  path?: string,
): Promise<SeamsPartialBlock[]> {
  const normalized = normalizeNewlines(source);
  const options = { mdx: isMdxFile(path) };
  const segments = segmentDocument(normalized, options);
  const blocks = await materializeSegments(editor, segments, options);

  if (blocks.length > 0) {
    return blocks;
  }

  return editor.tryParseMarkdownToBlocks('');
}

export async function exportRichDocument(
  editor: SeamsEditor,
  blocks: SeamsBlock[],
): Promise<string> {
  return serializeBlockGroup(editor, blocks);
}

async function materializeSegments(
  editor: SeamsEditor,
  segments: SourceSegment[],
  options: SegmentOptions,
): Promise<SeamsPartialBlock[]> {
  const blocks: SeamsPartialBlock[] = [];

  for (const segment of segments) {
    if (segment.kind === 'markdown') {
      const parsed = await editor.tryParseMarkdownToBlocks(segment.source);
      blocks.push(...normalizeImportedBlocks(parsed as SeamsPartialBlock[]));
      continue;
    }

    if (segment.kind === 'blockquote') {
      blocks.push(await materializeBlockquoteSegment(editor, segment.source, options));
      continue;
    }

    if (segment.kind === 'mdxRaw') {
      blocks.push({
        type: 'mdxRaw',
        props: { raw: segment.source },
        content: undefined,
        children: [],
      } as any);
      continue;
    }

    const summaryContent = await parseSummaryContent(editor, segment.summary);
    if (summaryContent === null) {
      blocks.push({
        type: 'mdxRaw',
        props: { raw: segment.raw },
        content: undefined,
        children: [],
      } as any);
      continue;
    }

    blocks.push({
      type: 'details',
      props: { open: segment.open },
      content: summaryContent as any,
      children: await materializeSegments(editor, segment.children, options),
    } as any);
  }

  return blocks;
}

async function materializeBlockquoteSegment(
  editor: SeamsEditor,
  source: string,
  options: SegmentOptions,
): Promise<SeamsPartialBlock> {
  const innerSource = source
    .split('\n')
    .map((line) => line.replace(/^>[ \t]?/, ''))
    .join('\n');
  const innerSegments = segmentDocument(innerSource, options);
  const innerBlocks = await materializeSegments(editor, innerSegments, options);
  const normalizedChildren = normalizeImportedBlocks(innerBlocks);
  const firstChild = normalizedChildren[0];

  if (
    firstChild?.type === 'paragraph' &&
    hasInlineContent(firstChild.content)
  ) {
    return {
      type: 'quote',
      content: firstChild.content,
      children: [
        ...((firstChild.children ?? []) as SeamsPartialBlock[]),
        ...normalizedChildren.slice(1),
      ] as any,
    } as any;
  }

  return {
    type: 'quote',
    content: '',
    children: normalizedChildren as any,
  } as any;
}

async function parseSummaryContent(
  editor: SeamsEditor,
  summary: string,
): Promise<any | null> {
  const raw = summary.trim();
  if (!raw) return '';
  if (containsLikelyInlineMdx(raw)) return null;

  const parsed = await editor.tryParseMarkdownToBlocks(raw);
  if (parsed.length !== 1) return null;
  if (parsed[0].type !== 'paragraph' || parsed[0].children.length > 0) return null;
  return parsed[0].content as any;
}

async function serializeBlockGroup(editor: SeamsEditor, blocks: SeamsBlock[]): Promise<string> {
  const parts: string[] = [];
  let standardChunk: SeamsBlock[] = [];

  async function flushStandardChunk() {
    if (!standardChunk.length) return;
    const markdown = collapseListGaps((await editor.blocksToMarkdownLossy(standardChunk)).trim());
    if (markdown) parts.push(markdown);
    standardChunk = [];
  }

  for (const block of blocks) {
    if (isMdxRawBlock(block)) {
      await flushStandardChunk();
      const raw = block.props.raw.trim();
      if (raw) parts.push(raw);
      continue;
    }

    if (isDetailsBlock(block)) {
      await flushStandardChunk();
      parts.push(await serializeDetailsBlock(editor, block));
      continue;
    }

    if (isQuoteBlock(block)) {
      await flushStandardChunk();
      parts.push(await serializeQuoteBlock(editor, block));
      continue;
    }

    standardChunk.push(block);
  }

  await flushStandardChunk();
  return parts.filter(Boolean).join('\n\n').trimEnd();
}

async function serializeDetailsBlock(editor: SeamsEditor, block: SeamsBlock): Promise<string> {
  const summaryHtml = await serializeInlineContentToHtml(editor, block.content ?? '');
  const body = await serializeBlockGroup(editor, block.children);
  const open = isDetailsBlock(block) && block.props.open ? ' open' : '';

  if (!body) {
    return `<details${open}>\n<summary>${summaryHtml}</summary>\n</details>`;
  }

  return `<details${open}>\n<summary>${summaryHtml}</summary>\n\n${body}\n</details>`;
}

async function serializeQuoteBlock(
  editor: SeamsEditor,
  block: SeamsBlock & { type: 'quote' },
): Promise<string> {
  const parts: string[] = [];

  const inlineMarkdown = await serializeInlineContentToMarkdown(
    editor,
    Array.isArray(block.content) ? block.content : block.content ?? '',
  );
  if (inlineMarkdown) {
    parts.push(inlineMarkdown);
  }

  const childMarkdown = await serializeBlockGroup(editor, block.children);
  if (childMarkdown) {
    parts.push(childMarkdown);
  }

  const content = parts.join('\n\n').trim();
  if (!content) {
    return '>';
  }

  return content
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

async function serializeInlineContentToHtml(
  editor: SeamsEditor,
  content: any,
): Promise<string> {
  const html = (await editor.blocksToHTMLLossy([{ type: 'paragraph', content } as SeamsPartialBlock])).trim();
  const paragraphMatch = html.match(/^<p>([\s\S]*)<\/p>$/);
  return paragraphMatch ? paragraphMatch[1] : html;
}

async function serializeInlineContentToMarkdown(
  editor: SeamsEditor,
  content: any,
): Promise<string> {
  if (
    content == null ||
    content === '' ||
    (Array.isArray(content) && content.length === 0)
  ) {
    return '';
  }

  return collapseListGaps(
    (await editor.blocksToMarkdownLossy([{ type: 'paragraph', content } as SeamsPartialBlock])).trim(),
  );
}

function normalizeImportedBlocks(blocks: SeamsPartialBlock[]): SeamsPartialBlock[] {
  return blocks.map((block) => normalizeImportedBlock(block));
}

function normalizeImportedBlock(block: SeamsPartialBlock): SeamsPartialBlock {
  const normalizedChildren = normalizeImportedBlocks((block.children ?? []) as SeamsPartialBlock[]);
  const normalizedBlock: SeamsPartialBlock = {
    ...block,
    children: normalizedChildren as any,
  };

  if (block.type !== 'quote' || hasInlineContent(block.content)) {
    return normalizedBlock;
  }

  const firstChild = normalizedChildren[0];
  if (!firstChild || firstChild.type !== 'paragraph' || !hasInlineContent(firstChild.content)) {
    return normalizedBlock;
  }

  return {
    ...normalizedBlock,
    content: firstChild.content,
    children: [...((firstChild.children ?? []) as SeamsPartialBlock[]), ...normalizedChildren.slice(1)] as any,
  } as SeamsPartialBlock;
}

function hasInlineContent(content: SeamsPartialBlock['content']): boolean {
  if (typeof content === 'string') return content.length > 0;
  return Array.isArray(content) && content.length > 0;
}

function segmentDocument(source: string, options: SegmentOptions): SourceSegment[] {
  const segments: SourceSegment[] = [];
  const lines = splitLines(source);

  let textBuffer = '';
  let inFence: string | null = null;
  let index = 0;

  function flushTextBuffer() {
    if (!textBuffer.trim()) {
      textBuffer = '';
      return;
    }
    pushTextSegments(segments, textBuffer, options);
    textBuffer = '';
  }

  while (index < lines.length) {
    const line = lines[index];

    const fence = getFenceMarker(line.text);
    if (fence) {
      if (inFence === fence) inFence = null;
      else if (!inFence) inFence = fence;
      textBuffer += line.full;
      index += 1;
      continue;
    }

    if (!inFence) {
      if (startsTopLevelBlockquote(line.text)) {
        flushTextBuffer();
        const [raw, nextIndex] = collectBlockquoteBlock(lines, index);
        if (raw.trim()) segments.push({ kind: 'blockquote', source: raw.trim() });
        index = nextIndex;
        continue;
      }

      if (startsDetailsBlock(line.text)) {
        flushTextBuffer();
        const [raw, nextIndex] = collectTagBlock(lines, index, 'details');
        const details = parseDetailsSegment(raw, options);
        if (details) {
          segments.push(details);
        } else if (raw.trim()) {
          segments.push({ kind: 'mdxRaw', source: raw.trim() });
        }
        index = nextIndex;
        continue;
      }

      if (options.mdx && startsMdxJsxBlock(line.text)) {
        flushTextBuffer();
        const tagName = getOpeningTagName(line.text);
        if (tagName) {
          const [raw, nextIndex] = collectTagBlock(lines, index, tagName);
          if (raw.trim()) segments.push({ kind: 'mdxRaw', source: raw.trim() });
          index = nextIndex;
          continue;
        }
      }

      if (options.mdx && startsMdxEsmBlock(line.text)) {
        flushTextBuffer();
        const [raw, nextIndex] = collectEsmBlock(lines, index);
        if (raw.trim()) segments.push({ kind: 'mdxRaw', source: raw.trim() });
        index = nextIndex;
        continue;
      }

      if (options.mdx && startsMdxExpressionBlock(line.text)) {
        flushTextBuffer();
        const [raw, nextIndex] = collectBraceBlock(lines, index);
        if (raw.trim()) segments.push({ kind: 'mdxRaw', source: raw.trim() });
        index = nextIndex;
        continue;
      }
    }

    textBuffer += line.full;
    index += 1;
  }

  flushTextBuffer();
  return segments;
}

function pushTextSegments(segments: SourceSegment[], text: string, options: SegmentOptions) {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (!options.mdx || !containsLikelyInlineMdx(trimmed)) {
    pushMarkdownSegment(segments, trimmed);
    return;
  }

  for (const block of splitLooseBlocks(trimmed)) {
    if (!block.trim()) continue;
    if (containsLikelyInlineMdx(block)) {
      segments.push({ kind: 'mdxRaw', source: block.trim() });
      continue;
    }
    pushMarkdownSegment(segments, block.trim());
  }
}

function pushMarkdownSegment(segments: SourceSegment[], source: string) {
  if (!source) return;
  const previous = segments[segments.length - 1];
  if (previous?.kind === 'markdown') {
    previous.source = `${previous.source}\n\n${source}`.trim();
    return;
  }
  segments.push({ kind: 'markdown', source });
}

function parseDetailsSegment(raw: string, options: SegmentOptions): SourceSegment | null {
  const normalized = raw.trim();
  if (!normalized.startsWith('<details')) return null;

  const openingTagEnd = findTagEnd(normalized, 0);
  if (openingTagEnd <= 0) return null;

  const closingTagIndex = normalized.toLowerCase().lastIndexOf('</details>');
  if (closingTagIndex < 0) return null;

  const openingTag = normalized.slice(0, openingTagEnd);
  const inner = normalized.slice(openingTagEnd, closingTagIndex);
  const summaryStart = inner.search(/<summary(?:\s|>)/i);
  if (summaryStart < 0) return null;
  if (inner.slice(0, summaryStart).trim()) return null;

  const absoluteSummaryStart = openingTagEnd + summaryStart;
  const summaryOpenEnd = findTagEnd(normalized, absoluteSummaryStart);
  if (summaryOpenEnd <= 0) return null;

  const summaryCloseIndex = normalized.toLowerCase().indexOf('</summary>', summaryOpenEnd);
  if (summaryCloseIndex < 0) return null;

  const summary = normalized.slice(summaryOpenEnd, summaryCloseIndex).trim();
  const body = normalized
    .slice(summaryCloseIndex + '</summary>'.length, closingTagIndex)
    .replace(/^\s*\n?/, '')
    .replace(/\n?\s*$/, '');

  return {
    kind: 'details',
    open: parseOpenAttribute(openingTag),
    summary,
    children: body ? segmentDocument(body, options) : [],
    raw: normalized,
  };
}

function parseOpenAttribute(tag: string): boolean {
  if (/open\s*=\s*\{false\}/i.test(tag)) return false;
  if (/open\s*=\s*["']false["']/i.test(tag)) return false;
  return /\bopen\b/i.test(tag);
}

function splitLooseBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = splitLines(text);

  let inFence: string | null = null;
  let current = '';

  for (const line of lines) {
    const fence = getFenceMarker(line.text);
    if (fence) {
      if (inFence === fence) inFence = null;
      else if (!inFence) inFence = fence;
      current += line.full;
      continue;
    }

    if (!inFence && !line.text.trim()) {
      if (current.trim()) {
        blocks.push(current.trim());
        current = '';
      }
      continue;
    }

    current += line.full;
  }

  if (current.trim()) {
    blocks.push(current.trim());
  }

  return blocks;
}

function containsLikelyInlineMdx(source: string): boolean {
  const stripped = stripCode(source);
  return /<([A-Z][\w-]*)(?:\.[\w-]+)*(?=[\s/>])/.test(stripped);
}

function stripCode(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`]*`/g, ' ');
}

function startsDetailsBlock(line: string): boolean {
  return /^[ \t]{0,3}<details(?:\s|>)/i.test(line);
}

function startsTopLevelBlockquote(line: string): boolean {
  return /^>/.test(line);
}

function startsMdxJsxBlock(line: string): boolean {
  return /^[ \t]{0,3}<([A-Z][\w-]*)(?:\.[\w-]+)*(?=[\s/>])/.test(line);
}

function startsMdxEsmBlock(line: string): boolean {
  return /^[ \t]{0,3}(?:import|export)\b/.test(line);
}

function startsMdxExpressionBlock(line: string): boolean {
  return /^[ \t]{0,3}\{/.test(line);
}

function getOpeningTagName(line: string): string | null {
  const match = line.match(/^[ \t]{0,3}<([A-Z][\w-]*(?:\.[\w-]+)*)(?=[\s/>])/);
  return match?.[1] ?? null;
}

function collectTagBlock(lines: LineRecord[], startIndex: number, tagName: string): [string, number] {
  const opening = lines[startIndex].text;
  const openingTagEnd = findTagEnd(opening, opening.indexOf('<'));
  const openingTag = opening.slice(0, openingTagEnd).trimEnd();

  if (openingTag.endsWith('/>')) {
    return [lines[startIndex].text, startIndex + 1];
  }

  let depth = 1;
  let inFence: string | null = null;
  let raw = '';
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    raw += line.full;

    const fence = getFenceMarker(line.text);
    if (fence) {
      if (inFence === fence) inFence = null;
      else if (!inFence) inFence = fence;
      index += 1;
      continue;
    }

    if (!inFence) {
      const text = index === startIndex ? line.text.slice(openingTagEnd) : line.text;
      depth += countOpeningTags(text, tagName);
      depth -= countClosingTags(text, tagName);
      if (depth <= 0) {
        return [raw.trim(), index + 1];
      }
    }

    index += 1;
  }

  return [raw.trim(), lines.length];
}

function collectEsmBlock(lines: LineRecord[], startIndex: number): [string, number] {
  let raw = '';
  let index = startIndex;
  let balance = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (index > startIndex && !line.text.trim() && balance <= 0) break;
    raw += line.full;
    balance += countChars(line.text, '{') - countChars(line.text, '}');
    balance += countChars(line.text, '(') - countChars(line.text, ')');
    if (balance <= 0 && /;\s*$/.test(line.text.trim())) {
      index += 1;
      break;
    }
    index += 1;
  }

  return [raw.trim(), index];
}

function collectBraceBlock(lines: LineRecord[], startIndex: number): [string, number] {
  let raw = '';
  let index = startIndex;
  let balance = 0;
  let started = false;

  while (index < lines.length) {
    const line = lines[index];
    if (index > startIndex && !line.text.trim() && started && balance <= 0) break;

    raw += line.full;
    balance += countChars(line.text, '{');
    balance -= countChars(line.text, '}');
    started = true;

    index += 1;
    if (started && balance <= 0) break;
  }

  return [raw.trim(), index];
}

function collectBlockquoteBlock(lines: LineRecord[], startIndex: number): [string, number] {
  let raw = '';
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!startsTopLevelBlockquote(line.text)) break;
    raw += line.full;
    index += 1;
  }

  return [raw.trimEnd(), index];
}

function countOpeningTags(source: string, tagName: string): number {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}(?=[\\s/>])`, 'g');
  let count = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = findTagEnd(source, start);
    if (end > 0 && !source.slice(start, end).trimEnd().endsWith('/>')) {
      count += 1;
    }
  }
  return count;
}

function countClosingTags(source: string, tagName: string): number {
  const pattern = new RegExp(`</${escapeRegExp(tagName)}\\s*>`, 'gi');
  return [...source.matchAll(pattern)].length;
}

function findTagEnd(source: string, startIndex: number): number {
  let quote: '"' | '\'' | '`' | null = null;
  let braceDepth = 0;

  for (let index = startIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      continue;
    }

    if (char === '>' && braceDepth === 0) {
      return index + 1;
    }
  }

  return -1;
}

function countChars(source: string, target: string): number {
  let count = 0;
  for (const char of source) {
    if (char === target) count += 1;
  }
  return count;
}

function getFenceMarker(line: string): string | null {
  const match = line.match(/^[ \t]*(```+|~~~+)/);
  return match?.[1] ?? null;
}

function normalizeNewlines(source: string): string {
  return source.replace(/\r\n/g, '\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface LineRecord {
  full: string;
  text: string;
}

function splitLines(source: string): LineRecord[] {
  if (!source) return [];

  return source.match(/[^\n]*\n|[^\n]+/g)?.map((full) => ({
    full,
    text: full.endsWith('\n') ? full.slice(0, -1) : full,
  })) ?? [];
}

function isDetailsBlock(block: SeamsBlock): block is SeamsBlock & { type: 'details'; props: { open: boolean } } {
  return block.type === 'details';
}

function isMdxRawBlock(block: SeamsBlock): block is SeamsBlock & { type: 'mdxRaw'; props: { raw: string } } {
  return block.type === 'mdxRaw';
}

function isQuoteBlock(block: SeamsBlock): block is SeamsBlock & { type: 'quote' } {
  return block.type === 'quote';
}
