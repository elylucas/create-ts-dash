import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, toValidPackageName } from './args.js';

describe('parseArgs', () => {
  const originalExit = process.exit;
  const originalError = console.error;

  beforeEach(() => {
    process.exit = vi.fn() as never;
    console.error = vi.fn();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('parses project name from positional arg', () => {
    const result = parseArgs(['my-project']);
    expect(result.projectName).toBe('my-project');
  });

  it('parses --express flag', () => {
    const result = parseArgs(['my-app', '--express']);
    expect(result.server).toBe('express');
  });

  it('parses -e shorthand', () => {
    const result = parseArgs(['-e', 'my-app']);
    expect(result.server).toBe('express');
    expect(result.projectName).toBe('my-app');
  });

  it('parses --fastify flag', () => {
    const result = parseArgs(['--fastify']);
    expect(result.server).toBe('fastify');
  });

  it('parses -f shorthand', () => {
    const result = parseArgs(['-f']);
    expect(result.server).toBe('fastify');
  });

  it('parses --hono flag', () => {
    const result = parseArgs(['--hono']);
    expect(result.server).toBe('hono');
  });

  it('parses -h shorthand', () => {
    const result = parseArgs(['-h']);
    expect(result.server).toBe('hono');
  });

  it('parses --lint tooling flag', () => {
    const result = parseArgs(['--lint']);
    expect(result.tooling.has('lint')).toBe(true);
  });

  it('parses -l shorthand', () => {
    const result = parseArgs(['-l']);
    expect(result.tooling.has('lint')).toBe(true);
  });

  it('parses --vitest tooling flag', () => {
    const result = parseArgs(['--vitest']);
    expect(result.tooling.has('vitest')).toBe(true);
  });

  it('parses -t shorthand', () => {
    const result = parseArgs(['-t']);
    expect(result.tooling.has('vitest')).toBe(true);
  });

  it('parses multiple tooling flags together', () => {
    const result = parseArgs(['-l', '-t']);
    expect(result.tooling.has('lint')).toBe(true);
    expect(result.tooling.has('vitest')).toBe(true);
  });

  it('parses --yes flag', () => {
    const result = parseArgs(['--yes']);
    expect(result.yes).toBe(true);
  });

  it('parses -y shorthand', () => {
    const result = parseArgs(['-y']);
    expect(result.yes).toBe(true);
  });

  it('parses all flags together', () => {
    const result = parseArgs(['my-app', '-e', '-l', '-t', '-y']);
    expect(result.projectName).toBe('my-app');
    expect(result.server).toBe('express');
    expect(result.tooling.has('lint')).toBe(true);
    expect(result.tooling.has('vitest')).toBe(true);
    expect(result.yes).toBe(true);
  });

  it('exits with error when multiple servers specified', () => {
    parseArgs(['--express', '--fastify']);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot select multiple web servers')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('returns defaults when no args provided', () => {
    const result = parseArgs([]);
    expect(result.projectName).toBeUndefined();
    expect(result.server).toBeUndefined();
    expect(result.tooling.size).toBe(0);
    expect(result.yes).toBe(false);
  });
});

describe('toValidPackageName', () => {
  it('lowercases and trims the name', () => {
    expect(toValidPackageName('  My-Project  ')).toBe('my-project');
  });

  it('replaces spaces with hyphens', () => {
    expect(toValidPackageName('my cool project')).toBe('my-cool-project');
  });

  it('strips leading dots and underscores', () => {
    expect(toValidPackageName('.hidden')).toBe('hidden');
    expect(toValidPackageName('_private')).toBe('private');
  });

  it('removes invalid characters', () => {
    expect(toValidPackageName('my@project!name')).toBe('my-project-name');
  });

  it('handles complex names', () => {
    expect(toValidPackageName('  .My Cool Project! v2  ')).toBe('my-cool-project--v2');
  });
});
