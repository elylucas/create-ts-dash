export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type ServerKey = 'express' | 'fastify' | 'hono';
export type ToolingKey = 'lint' | 'vitest';

export interface ServerOption {
  label: string;
  value: ServerKey;
  description: string;
  dependencies: string[];
  template: string;
}

export interface ToolingOption {
  label: string;
  value: ToolingKey;
  description: string;
  dependencies: string[];
}

export interface CliArgs {
  projectName?: string;
  server?: ServerKey;
  tooling: Set<ToolingKey>;
  yes: boolean;
}
