---
title: Complex Frontmatter
date: '2026-04-03T00:00:00.000Z'
draft: false
author:
  name: Test User
  email: test@example.com
tags:
  - markdown
  - test
  - frontmatter
  - edge-cases
category: testing
priority: 1
metadata:
  word_count: 0
  reading_time: 1 min
  featured: true
description: >
  This is a multiline description that uses YAML folded scalar syntax to span
  multiple lines but renders as one.
notes: |
  This is a literal block scalar.
  Each line break is preserved.
  Even this one.
empty_field: null
boolean_true: true
boolean_false: false
numeric: 42
float_value: 3.14
null_value: null
url: 'https://example.com/path?query=value&other=thing'
---
# Complex Frontmatter Test

This file tests how seams handles complex YAML frontmatter with nested objects, arrays, multiline strings, various data types, and edge cases.

The content itself is minimal — the frontmatter is the test.
