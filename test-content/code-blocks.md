---
title: Code Blocks
tags:
  - test
  - code
---
# Code Blocks

## JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

## Python

```python
class DataProcessor:
    def __init__(self, source):
        self.source = source
        self._cache = {}

    def process(self, key: str) -> dict:
        if key not in self._cache:
            self._cache[key] = self._fetch(key)
        return self._cache[key]

    def _fetch(self, key):
        return {"key": key, "source": self.source}
```

## TypeScript

```typescript
interface Config {
  port: number;
  host: string;
  debug?: boolean;
}

async function startServer(config: Config): Promise<void> {
  const { port, host, debug = false } = config;
  if (debug) console.log(`Starting on ${host}:${port}`);
}
```

## Shell

```bash
#!/bin/bash
set -euo pipefail

for file in *.md; do
  echo "Processing: $file"
  wc -w "$file"
done
```

## JSON

```json
{
  "name": "test-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "typescript": "^5.8.0"
  },
  "scripts": {
    "build": "tsc && vite build"
  }
}
```

## CSS

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

## SQL

```sql
SELECT u.name, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
HAVING COUNT(p.id) > 5
ORDER BY post_count DESC;
```

## No language specified

```text
This is a plain code block
with no language highlighting.
It should still render as monospace.
```

## Indented code block (4 spaces)

```text
This is also a code block
created with indentation
rather than fences.
```

## Inline code edge cases

Use `const x = 1` for constants. Backticks inside code: `` `nested` `` ticks. Empty inline code: ``(two backticks with space).
