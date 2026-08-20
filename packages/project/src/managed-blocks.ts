import { fail } from './errors.js';

export type Newline = '\n' | '\r\n';
export type BlockStyle = 'schema-1' | 'legacy' | 'gitignore';

export const SCHEMA1_START = '<!-- wizloft-harness:start -->';
export const SCHEMA1_END = '<!-- wizloft-harness:end -->';
export const LEGACY_START = '<!-- HARNESS:BEGIN -->';
export const LEGACY_END = '<!-- HARNESS:END -->';
export const GITIGNORE_START = '# wizloft-harness:start';
export const GITIGNORE_END = '# wizloft-harness:end';

export type ManagedBlockKind = 'markdown' | 'gitignore';

type FileLine = {
  readonly text: string;
  readonly eol: '' | Newline;
};

export type ParsedManagedBlock = {
  readonly kind: ManagedBlockKind;
  readonly style: BlockStyle;
  readonly startLine: number;
  readonly endLine: number;
  readonly interior: string;
  readonly newline: Newline;
};

export type ParsedManagedFile =
  | { readonly status: 'empty' | 'absent-block'; readonly newline: Newline }
  | { readonly status: 'block'; readonly newline: Newline; readonly block: ParsedManagedBlock };

function detectNewline(text: string): Newline {
  const stripped = text.replaceAll('\r\n', '');
  const hasCrlf = text.includes('\r\n');
  const hasLf = stripped.includes('\n');
  if (hasCrlf && hasLf) {
    fail('MANAGED_BLOCK_CONFLICT', 'Managed file has mixed LF and CRLF line endings');
  }
  return hasCrlf ? '\r\n' : '\n';
}

function splitFileLines(text: string, newline: Newline): FileLine[] {
  if (text.length === 0) return [];
  const parts = text.split(newline);
  const lines: FileLine[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const isLast = index === parts.length - 1;
    if (isLast && parts[index] === '' && parts.length > 1) break;
    lines.push({
      text: parts[index] ?? '',
      eol: isLast ? '' : newline,
    });
  }
  return lines;
}

function joinFileLines(lines: readonly FileLine[]): string {
  return lines.map((line) => `${line.text}${line.eol}`).join('');
}

function markerOnLine(line: string, marker: string, relativePath: string): boolean {
  if (line === marker) return true;
  if (line.includes(marker)) {
    fail('MANAGED_BLOCK_CONFLICT', `Managed marker must be a standalone line in ${relativePath}`, {
      path: relativePath,
      line,
    });
  }
  return false;
}

function parsePair(
  lines: readonly FileLine[],
  relativePath: string,
  kind: ManagedBlockKind,
  style: BlockStyle,
  start: string,
  end: string,
  newline: Newline,
): ParsedManagedBlock | undefined {
  const starts: number[] = [];
  const ends: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.text ?? '';
    if (markerOnLine(line, start, relativePath)) starts.push(index);
    if (markerOnLine(line, end, relativePath)) ends.push(index);
  }

  if (starts.length === 0 && ends.length === 0) return undefined;
  if (starts.length !== 1 || ends.length !== 1) {
    fail(
      'MANAGED_BLOCK_CONFLICT',
      `Managed file ${relativePath} has multiple, nested, or unclosed Harness blocks`,
      { path: relativePath },
    );
  }
  const startLine = starts[0];
  const endLine = ends[0];
  if (startLine === undefined || endLine === undefined || endLine <= startLine) {
    fail(
      'MANAGED_BLOCK_CONFLICT',
      `Managed file ${relativePath} has nested or unclosed Harness blocks`,
      { path: relativePath },
    );
  }
  const interiorLines = lines.slice(startLine + 1, endLine);
  return Object.freeze({
    kind,
    style,
    startLine,
    endLine,
    interior: interiorLines.map((line) => line.text).join(newline),
    newline,
  });
}

export function parseManagedFile(
  text: string | undefined,
  relativePath: string,
  kind: ManagedBlockKind,
): ParsedManagedFile {
  if (text === undefined) {
    return Object.freeze({ status: 'empty', newline: '\n' });
  }
  const newline = text.length === 0 ? '\n' : detectNewline(text);
  const lines = splitFileLines(text, newline);
  if (kind === 'gitignore') {
    const block = parsePair(
      lines,
      relativePath,
      kind,
      'gitignore',
      GITIGNORE_START,
      GITIGNORE_END,
      newline,
    );
    if (block === undefined) return Object.freeze({ status: 'absent-block', newline });
    return Object.freeze({ status: 'block', newline, block });
  }

  const schema1 = parsePair(
    lines,
    relativePath,
    kind,
    'schema-1',
    SCHEMA1_START,
    SCHEMA1_END,
    newline,
  );
  const legacy = parsePair(lines, relativePath, kind, 'legacy', LEGACY_START, LEGACY_END, newline);
  if (schema1 !== undefined && legacy !== undefined) {
    fail(
      'MANAGED_BLOCK_CONFLICT',
      `Managed file ${relativePath} contains both legacy and schema-1 Harness blocks`,
      { path: relativePath },
    );
  }
  const block = schema1 ?? legacy;
  if (block === undefined) return Object.freeze({ status: 'absent-block', newline });
  return Object.freeze({ status: 'block', newline, block });
}

export function applyNewline(text: string, newline: Newline): string {
  return text.replaceAll('\r\n', '\n').split('\n').join(newline);
}

export function renderManagedBlock(
  kind: ManagedBlockKind,
  interior: string,
  newline: Newline,
): string {
  const [start, end] =
    kind === 'gitignore' ? [GITIGNORE_START, GITIGNORE_END] : [SCHEMA1_START, SCHEMA1_END];
  const body = applyNewline(interior, newline);
  const interiorBlock = body.length === 0 ? '' : `${body}${newline}`;
  return `${start}${newline}${interiorBlock}${end}${newline}`;
}

function blockLines(
  kind: ManagedBlockKind,
  interior: string,
  newline: Newline,
  trailingNewline: boolean,
): FileLine[] {
  const lines = splitFileLines(renderManagedBlock(kind, interior, newline), newline);
  if (trailingNewline || lines.length === 0) return lines;
  const last = lines[lines.length - 1];
  if (last === undefined) return lines;
  return [...lines.slice(0, -1), { text: last.text, eol: '' }];
}

export function upsertManagedBlock(
  original: string | undefined,
  relativePath: string,
  kind: ManagedBlockKind,
  interior: string,
): { readonly action: 'create' | 'update-block'; readonly contents: string } {
  if (original === undefined) {
    return Object.freeze({
      action: 'create',
      contents: renderManagedBlock(kind, interior, '\n'),
    });
  }
  const parsed = parseManagedFile(original, relativePath, kind);
  const newline = parsed.newline;
  if (parsed.status !== 'block') {
    if (original.length === 0) {
      return Object.freeze({
        action: 'update-block',
        contents: renderManagedBlock(kind, interior, newline),
      });
    }
    const existing = splitFileLines(original, newline);
    const last = existing[existing.length - 1];
    const hadFinalNewline = last !== undefined && last.eol !== '';
    if (hadFinalNewline) {
      return Object.freeze({
        action: 'update-block',
        contents: `${original}${renderManagedBlock(kind, interior, newline)}`,
      });
    }
    const prefix = existing.slice(0, -1);
    const lastText = last?.text ?? '';
    const contents = joinFileLines([
      ...prefix,
      { text: lastText, eol: newline },
      ...blockLines(kind, interior, newline, false),
    ]);
    return Object.freeze({ action: 'update-block', contents });
  }

  const lines = splitFileLines(original, newline);
  const before = lines.slice(0, parsed.block.startLine);
  const after = lines.slice(parsed.block.endLine + 1);
  const endLine = lines[parsed.block.endLine];
  const trailingNewline = after.length > 0 || endLine?.eol !== '';
  const contents = joinFileLines([
    ...before,
    ...blockLines(kind, interior, newline, trailingNewline),
    ...after,
  ]);
  return Object.freeze({ action: 'update-block', contents });
}

export function removeManagedBlock(
  original: string,
  relativePath: string,
  kind: ManagedBlockKind,
): { readonly action: 'remove-block'; readonly contents: string } | undefined {
  const parsed = parseManagedFile(original, relativePath, kind);
  if (parsed.status !== 'block') return undefined;
  const lines = splitFileLines(original, parsed.newline);
  const before = lines.slice(0, parsed.block.startLine);
  const after = lines.slice(parsed.block.endLine + 1);
  const endLine = lines[parsed.block.endLine];
  let prefix = before;
  if (after.length === 0 && endLine?.eol === '' && prefix.length > 0) {
    const last = prefix[prefix.length - 1];
    if (last !== undefined) {
      prefix = [...prefix.slice(0, -1), { text: last.text, eol: '' }];
    }
  }
  return Object.freeze({ action: 'remove-block', contents: joinFileLines([...prefix, ...after]) });
}

export function blockMatches(
  original: string | undefined,
  relativePath: string,
  kind: ManagedBlockKind,
  interior: string,
): boolean {
  if (original === undefined) return false;
  const parsed = parseManagedFile(original, relativePath, kind);
  if (parsed.status !== 'block' || parsed.block.style === 'legacy') return false;
  return upsertManagedBlock(original, relativePath, kind, interior).contents === original;
}
