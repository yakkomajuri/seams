---
title: Edge Cases
tags:
  - test
  - edge-cases
---
# Edge Cases

## Very long line

This is an extremely long line that should test how the editor handles horizontal overflow or wrapping behavior when a single paragraph contains a lot of text without any line breaks at all, going on and on for quite a while to really stress-test the rendering and make sure nothing breaks or becomes unreadable in the process, and maybe even a bit more text here for good measure.

## Empty sections

### This section is empty

### This one too

### Content resumes here

Back to normal.

## Special Markdown characters that need escaping

*not italic*

**not bold**

# not a heading

* not a list

[not a link](https://example.com)

> not a blockquote

## HTML entities

© — … → ← ♥ ✓

## Raw HTML (if supported)

<details open>
<summary>hello</summary>
</details>

<details open>
<summary>some text out</summary>
</details>

what

Highlighted text in a paragraph.

Ctrl + C to copy.

## Unicode

Emoji: 🚀 🎉 ✅ ❌ 🔥 💡 ⚡ 🎯

CJK: 你好世界 こんにちは世界 안녕하세요

RTL: مرحبا بالعالم

Math symbols: ∑ ∏ ∫ √ ∞ ≠ ≤ ≥ ± × ÷

Arrows: → ← ↑ ↓ ↔ ⇒ ⇐ ⇑ ⇓

## Consecutive blank lines

The above had three blank lines (should collapse to one).

## Trailing whitespace

This line has trailing spaces.\
This line has trailing tabs.

## Mixed indentation

```text
Tab-indented line.
Space-indented line (4 spaces).
```

Two-space indent.
