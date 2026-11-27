import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The enrollment service and the shared install module must never pull in the API's env config
// (which demands JWT_SECRET, REDIS_URL, ...) or its DI container (which wires the Wazuh client).
const SRC = join(import.meta.dirname, '../../src');
const FORBIDDEN = [/config\/env\.config/, /infrastructure\/di\//, /integrations\/wazuh/];

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : path.endsWith('.ts') ? [path] : [];
  });

// Follows relative imports from the entry files, so an indirect import is caught too.
const reachableFrom = (entries: string[]): Set<string> => {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from '(\.{1,2}\/[^']+\.ts)'/g)) {
      queue.push(join(file, '..', match[1] as string));
    }
  }
  return seen;
};

describe('enrollment service isolation', () => {
  it.each([
    ['the enrollment service', filesUnder(join(SRC, 'enroll'))],
    ['the shared install module', filesUnder(join(SRC, 'shared'))],
  ])('%s never reaches the API config, DI or Wazuh client', (_label, entries) => {
    const offenders = [...reachableFrom(entries)]
      .map((file) => relative(SRC, file).replaceAll('\\', '/'))
      .filter((file) => FORBIDDEN.some((pattern) => pattern.test(file)));
    expect(offenders).toEqual([]);
  });
});
