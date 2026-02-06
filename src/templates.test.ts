import { describe, it, expect } from 'vitest';
import { getIndexTemplate, getScripts } from './templates.js';

describe('getIndexTemplate', () => {
  it('returns default template when no server specified', () => {
    const template = getIndexTemplate();
    expect(template).toContain("console.log('Hello, world!')");
  });

  it('returns default template for undefined server', () => {
    const template = getIndexTemplate(undefined);
    expect(template).toContain("console.log('Hello, world!')");
  });

  it('returns express template', () => {
    const template = getIndexTemplate('express');
    expect(template).toContain("import express from 'express'");
    expect(template).toContain('app.listen');
  });

  it('returns fastify template', () => {
    const template = getIndexTemplate('fastify');
    expect(template).toContain("import Fastify from 'fastify'");
    expect(template).toContain('fastify.listen');
  });

  it('returns hono template', () => {
    const template = getIndexTemplate('hono');
    expect(template).toContain("import { Hono } from 'hono'");
    expect(template).toContain('@hono/node-server');
  });
});

describe('getScripts', () => {
  it('returns base scripts when no server or tooling', () => {
    const scripts = getScripts(undefined, new Set());
    expect(scripts.start).toBe('tsx watch ./src/index.ts');
    expect(scripts.build).toBe('rimraf ./dist && tsc');
    expect(scripts.dev).toBeUndefined();
    expect(scripts.lint).toBeUndefined();
    expect(scripts.test).toBeUndefined();
  });

  it('adds dev script when server is selected', () => {
    const scripts = getScripts('express', new Set());
    expect(scripts.dev).toBe('tsx watch ./src/index.ts');
  });

  it('adds lint scripts when lint tooling is selected', () => {
    const scripts = getScripts(undefined, new Set(['lint'] as const));
    expect(scripts.lint).toBe('eslint src/');
    expect(scripts['lint:fix']).toBe('eslint src/ --fix');
    expect(scripts.format).toBe('prettier --write src/');
  });

  it('adds test scripts when vitest tooling is selected', () => {
    const scripts = getScripts(undefined, new Set(['vitest'] as const));
    expect(scripts.test).toBe('vitest');
    expect(scripts['test:run']).toBe('vitest run');
  });

  it('adds all scripts when server and all tooling selected', () => {
    const scripts = getScripts('fastify', new Set(['lint', 'vitest'] as const));
    expect(scripts.start).toBeDefined();
    expect(scripts.build).toBeDefined();
    expect(scripts.dev).toBeDefined();
    expect(scripts.lint).toBeDefined();
    expect(scripts['lint:fix']).toBeDefined();
    expect(scripts.format).toBeDefined();
    expect(scripts.test).toBeDefined();
    expect(scripts['test:run']).toBeDefined();
  });
});
