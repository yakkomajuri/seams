---
title: Deeply Nested Structures
---
# Deeply Nested Structures

## Nested list inside blockquote inside list

* Outer list item

> Blockquote inside a list

* Nested list inside blockquote inside list
  * Even deeper
    * Deepest

Back to blockquote

* Next outer item

## Complex nesting

1. First ordered item

> A blockquote under an ordered item

> Double-nested blockquote

```python
# Code inside double-nested blockquote inside ordered list
x = 42
```

1. Second ordered item with a table

| Key | Value |
| --- | ----- |
| A   | 1     |
| B   | 2     |

1. Third item with task list
   * [x] Sub-task done
   * [ ] Sub-task pending
     * [x] Sub-sub-task

## Paragraph stress test

Short paragraph.

A medium paragraph with some **bold**, some *italic*, some `code`, and a [link](https://example.com) to test how inline formatting interacts within normal body text flow.

A longer paragraph that mixes many features. Here we have **bold text** followed by *italic text* and then some `inline code`. We also reference a [link with text](https://example.com), include ~~strikethrough~~, and embed an image reference

![BlockNote image](https://via.placeholder.com/1)

inline. The goal is to verify that the editor handles all of these inline elements correctly when they appear together in a dense paragraph without any line breaks between them, which is a common pattern in real-world writing.
