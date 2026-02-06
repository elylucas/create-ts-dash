import type { CliArgs, ServerKey } from './types.js';

export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    projectName: undefined,
    server: undefined,
    tooling: new Set(),
    yes: false,
  };

  const serverFlags: ServerKey[] = [];

  for (const arg of args) {
    if (arg === '--express' || arg === '-e') {
      serverFlags.push('express');
    } else if (arg === '--fastify' || arg === '-f') {
      serverFlags.push('fastify');
    } else if (arg === '--hono' || arg === '-h') {
      serverFlags.push('hono');
    } else if (arg === '--lint' || arg === '-l') {
      result.tooling.add('lint');
    } else if (arg === '--vitest' || arg === '-t') {
      result.tooling.add('vitest');
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (!arg.startsWith('-')) {
      result.projectName = arg;
    }
  }

  if (serverFlags.length > 1) {
    console.error(
      `Error: Cannot select multiple web servers. You specified: ${serverFlags.join(', ')}`
    );
    process.exit(1);
  }

  if (serverFlags.length === 1) {
    result.server = serverFlags[0];
  }

  return result;
}

export function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-');
}
