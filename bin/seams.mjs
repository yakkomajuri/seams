#!/usr/bin/env node
import('../dist/cli.js').catch(async () => {
  await import('../src/cli.ts');
});
