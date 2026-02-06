import { describe, it, expect, afterEach } from 'vitest';
import {
  detectPackageManager,
  getInitCommand,
  getAddCommand,
} from './package-manager.js';

describe('detectPackageManager', () => {
  const originalUserAgent = process.env.npm_config_user_agent;

  afterEach(() => {
    if (originalUserAgent !== undefined) {
      process.env.npm_config_user_agent = originalUserAgent;
    } else {
      delete process.env.npm_config_user_agent;
    }
  });

  it('returns npm by default', () => {
    delete process.env.npm_config_user_agent;
    expect(detectPackageManager()).toBe('npm');
  });

  it('detects yarn', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.0 npm/? node/v18.0.0';
    expect(detectPackageManager()).toBe('yarn');
  });

  it('detects pnpm', () => {
    process.env.npm_config_user_agent = 'pnpm/8.0.0 npm/? node/v18.0.0';
    expect(detectPackageManager()).toBe('pnpm');
  });

  it('detects bun', () => {
    process.env.npm_config_user_agent = 'bun/1.0.0 npm/? node/v18.0.0';
    expect(detectPackageManager()).toBe('bun');
  });
});

describe('getInitCommand', () => {
  it('returns npm init -y for npm', () => {
    expect(getInitCommand('npm')).toBe('npm init -y');
  });

  it('returns yarn init -y for yarn', () => {
    expect(getInitCommand('yarn')).toBe('yarn init -y');
  });

  it('returns pnpm init for pnpm', () => {
    expect(getInitCommand('pnpm')).toBe('pnpm init');
  });

  it('returns bun init -y for bun', () => {
    expect(getInitCommand('bun')).toBe('bun init -y');
  });
});

describe('getAddCommand', () => {
  it('returns npm install for npm', () => {
    expect(getAddCommand('npm', ['foo', 'bar'])).toBe('npm install foo bar');
  });

  it('returns yarn add for yarn', () => {
    expect(getAddCommand('yarn', ['foo'])).toBe('yarn add foo');
  });

  it('returns pnpm add for pnpm', () => {
    expect(getAddCommand('pnpm', ['foo', 'bar'])).toBe('pnpm add foo bar');
  });

  it('returns bun add for bun', () => {
    expect(getAddCommand('bun', ['foo'])).toBe('bun add foo');
  });
});
