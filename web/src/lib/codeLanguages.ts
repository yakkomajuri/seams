export type CodeLanguageOption = {
  value: string;
  label: string;
  aliases?: string[];
};

export const CODE_BLOCK_LANGUAGE_OPTIONS: CodeLanguageOption[] = [
  { value: 'text',       label: 'Plain text', aliases: ['plaintext', 'txt'] },
  { value: 'bash',       label: 'Bash',       aliases: ['sh', 'zsh', 'shell'] },
  { value: 'c',          label: 'C' },
  { value: 'cpp',        label: 'C++',        aliases: ['c++'] },
  { value: 'css',        label: 'CSS' },
  { value: 'go',         label: 'Go' },
  { value: 'html',       label: 'HTML',       aliases: ['xhtml'] },
  { value: 'java',       label: 'Java' },
  { value: 'javascript', label: 'JavaScript', aliases: ['js', 'ecmascript', 'node'] },
  { value: 'json',       label: 'JSON',       aliases: ['json5'] },
  { value: 'markdown',   label: 'Markdown',   aliases: ['md'] },
  { value: 'python',     label: 'Python' },
  { value: 'rust',       label: 'Rust' },
  { value: 'sql',        label: 'SQL' },
  { value: 'typescript', label: 'TypeScript', aliases: ['ts'] },
  { value: 'xml',        label: 'XML',        aliases: ['rss', 'wsdl', 'xsd'] },
  { value: 'yaml',       label: 'YAML',       aliases: ['yml'] },
];

export const BLOCKNOTE_SUPPORTED_LANGUAGES = Object.fromEntries(
  CODE_BLOCK_LANGUAGE_OPTIONS.map(({ value, label, aliases }) => [
    value,
    { name: label, aliases },
  ]),
);

export const SHIKI_LANGUAGES = CODE_BLOCK_LANGUAGE_OPTIONS
  .map((language) => language.value)
  .filter((language) => language !== 'text');

export function resolveCodeLanguage(input: string): string {
  if (!input) return 'text';
  const lower = input.toLowerCase();
  for (const opt of CODE_BLOCK_LANGUAGE_OPTIONS) {
    if (opt.value === lower) return opt.value;
    if (opt.aliases?.includes(lower)) return opt.value;
  }
  return 'text';
}
