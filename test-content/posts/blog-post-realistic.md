---
title: "Building a Local-First Markdown Editor"
date: 2026-04-03
draft: false
tags: [engineering, markdown, local-first]
author: Yakko
description: A deep dive into the architecture decisions behind seams.
---
# Building a Local-First Markdown Editor

When I started building **seams**, the goal was simple: a markdown editor that feels like it belongs on your machine, not in a browser tab pretending to be a native app.

## Why local-first?

There are three reasons local-first matters for writing tools:

1. **Speed** — no network round-trips means instant saves
2. **Ownership** — your files live on your filesystem
3. **Offline** — works on a plane, in a cabin, wherever

> "The best writing tool is the one that gets out of your way."
>
> — Every writer, eventually

## The architecture

The system is split into two parts:

| Component | Technology | Role |
|-----------|-----------|------|
| Server | Fastify + chokidar | Watches files, serves API |
| Client | React + BlockNote | Rich editing experience |

### File watching

The server uses [chokidar](https://github.com/paulmillr/chokidar) to watch the content directory:

```typescript
const watcher = chokidar.watch(contentDir, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: false,
});

watcher.on("change", (filepath) => {
  broadcastUpdate(filepath);
});
```

When a file changes on disk — whether from `vim`, VS Code, or another tool — seams picks it up and pushes the update to any connected clients via WebSocket.

### Frontmatter parsing

Every markdown file can have YAML frontmatter:

```yaml
---
title: My Post
date: 2026-04-03
tags: [writing, tools]
draft: true
---
```

We parse this with `gray-matter` and expose it as editable metadata in the sidebar.

## What's next?

Here's the current roadmap:

- [x] Basic file watching and editing
- [x] Frontmatter support
- [ ] Full-text search across all files
- [ ] Image upload and management
- [ ] Custom themes
- [ ] Plugin system for extensions

---

*Last updated: April 3, 2026*
