import type { PackageManager } from './types.js';

export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
  }

  return 'npm';
}

export function getInitCommand(pm: PackageManager): string {
  switch (pm) {
    case 'yarn':
      return 'yarn init -y';
    case 'pnpm':
      return 'pnpm init';
    case 'bun':
      return 'bun init -y';
    default:
      return 'npm init -y';
  }
}

export function getAddCommand(pm: PackageManager, deps: string[]): string {
  const depsStr = deps.join(' ');
  switch (pm) {
    case 'yarn':
      return `yarn add ${depsStr}`;
    case 'pnpm':
      return `pnpm add ${depsStr}`;
    case 'bun':
      return `bun add ${depsStr}`;
    default:
      return `npm install ${depsStr}`;
  }
}
