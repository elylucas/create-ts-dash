import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');
const TEST_TIMEOUT = 120_000;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'create-ts-dash-test-'));
}

function runCli(cwd: string, args: string[]): string {
  return execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
    cwd,
    encoding: 'utf-8',
    timeout: 90_000,
    env: { ...process.env, npm_config_user_agent: undefined },
  });
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

function waitForServer(child: ChildProcess, port: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start within ${timeoutMs}ms`));
    }, timeoutMs);

    const tryConnect = () => {
      httpGet(`http://localhost:${port}/`)
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(() => {
          setTimeout(tryConnect, 500);
        });
    };

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    // Give the process a moment to start before polling
    setTimeout(tryConnect, 1000);
  });
}

function killProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.killed || child.exitCode !== null) {
      resolve();
      return;
    }
    child.on('exit', () => resolve());
    child.kill('SIGTERM');
    // Force kill after 5s if still alive
    setTimeout(() => {
      if (!child.killed && child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 5000);
  });
}

function patchPort(filePath: string, port: number): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/port:\s*3000/g, `port: ${port}`);
  content = content.replace(/const port = 3000/g, `const port = ${port}`);
  fs.writeFileSync(filePath, content);
}

// ─── Test Suites ─────────────────────────────────────────────

describe('E2E: CLI project scaffolding', () => {
  // Build before all E2E tests
  beforeAll(() => {
    execSync('npm run build', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'ignore',
    });
  });

  // ─── Permutation 1: no server, no tooling ───

  describe('no server, no tooling', () => {
    let tmpDir: string;
    const projectName = 'test-bare';

    beforeAll(() => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '-y']);
    }, TEST_TIMEOUT);

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates the project directory', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName))).toBe(true);
    });

    it('creates package.json with type module', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      expect(pkg.type).toBe('module');
    });

    it('has correct scripts in package.json', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.start).toBe('tsx watch ./src/index.ts');
      expect(scripts.build).toBe('rimraf ./dist && tsc');
      expect(scripts.dev).toBeUndefined();
      expect(scripts.lint).toBeUndefined();
      expect(scripts.test).toBeUndefined();
    });

    it('creates tsconfig.json', () => {
      const tsconfig = readJson(path.join(tmpDir, projectName, 'tsconfig.json'));
      const opts = tsconfig.compilerOptions as Record<string, unknown>;
      expect(opts.strict).toBe(true);
      expect(opts.module).toBe('es2022');
    });

    it('creates src/index.ts with default template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("console.log('Hello, world!')");
    });

    it('creates .gitignore', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules');
      expect(content).toContain('dist');
    });

    it('installs node_modules', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'node_modules'))).toBe(true);
    });

    it('does not create lint config files', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'eslint.config.js'))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, projectName, '.prettierrc'))).toBe(false);
    });

    it('does not create test files', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'src', 'example.test.ts'))).toBe(false);
    });

    it('builds successfully', () => {
      expect(() => {
        execSync('npm run build', {
          cwd: path.join(tmpDir, projectName),
          stdio: 'ignore',
          timeout: 30_000,
        });
      }).not.toThrow();
    });
  });

  // ─── Permutation 2: express, no tooling ───

  describe('express, no tooling', () => {
    let tmpDir: string;
    let serverProcess: ChildProcess | null = null;
    const projectName = 'test-express';
    const port = 3101;

    beforeAll(async () => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--express', '-y']);
      patchPort(path.join(tmpDir, projectName, 'src', 'index.ts'), port);
    }, TEST_TIMEOUT);

    afterAll(async () => {
      if (serverProcess) await killProcess(serverProcess);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates package.json with dev script', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.dev).toBe('tsx watch ./src/index.ts');
    });

    it('creates src/index.ts with express template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("import express from 'express'");
    });

    it('installs express dependency', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps.express).toBeDefined();
    });

    it(
      'serves Hello, world! on GET /',
      async () => {
        const projectDir = path.join(tmpDir, projectName);
        serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'test' },
        });

        await waitForServer(serverProcess, port);
        const response = await httpGet(`http://localhost:${port}/`);
        expect(response.status).toBe(200);
        expect(response.body).toBe('Hello, world!');
      },
      TEST_TIMEOUT
    );
  });

  // ─── Permutation 3: fastify, no tooling ───

  describe('fastify, no tooling', () => {
    let tmpDir: string;
    let serverProcess: ChildProcess | null = null;
    const projectName = 'test-fastify';
    const port = 3102;

    beforeAll(async () => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--fastify', '-y']);
      patchPort(path.join(tmpDir, projectName, 'src', 'index.ts'), port);
    }, TEST_TIMEOUT);

    afterAll(async () => {
      if (serverProcess) await killProcess(serverProcess);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates src/index.ts with fastify template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("import Fastify from 'fastify'");
    });

    it('installs fastify dependency', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps.fastify).toBeDefined();
    });

    it(
      'serves {"hello":"world"} on GET /',
      async () => {
        const projectDir = path.join(tmpDir, projectName);
        serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'test' },
        });

        await waitForServer(serverProcess, port);
        const response = await httpGet(`http://localhost:${port}/`);
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toEqual({ hello: 'world' });
      },
      TEST_TIMEOUT
    );
  });

  // ─── Permutation 4: hono, no tooling ───

  describe('hono, no tooling', () => {
    let tmpDir: string;
    let serverProcess: ChildProcess | null = null;
    const projectName = 'test-hono';
    const port = 3103;

    beforeAll(async () => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--hono', '-y']);
      patchPort(path.join(tmpDir, projectName, 'src', 'index.ts'), port);
    }, TEST_TIMEOUT);

    afterAll(async () => {
      if (serverProcess) await killProcess(serverProcess);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates src/index.ts with hono template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("import { Hono } from 'hono'");
      expect(content).toContain('@hono/node-server');
    });

    it('installs hono dependencies', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps.hono).toBeDefined();
      expect(deps['@hono/node-server']).toBeDefined();
    });

    it(
      'serves Hello, world! on GET /',
      async () => {
        const projectDir = path.join(tmpDir, projectName);
        serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'test' },
        });

        await waitForServer(serverProcess, port);
        const response = await httpGet(`http://localhost:${port}/`);
        expect(response.status).toBe(200);
        expect(response.body).toBe('Hello, world!');
      },
      TEST_TIMEOUT
    );
  });

  // ─── Permutation 5: express + lint + vitest ───

  describe('express with lint and vitest tooling', () => {
    let tmpDir: string;
    const projectName = 'test-express-full';

    beforeAll(() => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--express', '--lint', '--vitest', '-y']);
    }, TEST_TIMEOUT);

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates package.json with all scripts', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.start).toBeDefined();
      expect(scripts.build).toBeDefined();
      expect(scripts.dev).toBeDefined();
      expect(scripts.lint).toBe('eslint src/');
      expect(scripts['lint:fix']).toBe('eslint src/ --fix');
      expect(scripts.format).toBe('prettier --write src/');
      expect(scripts.test).toBe('vitest');
      expect(scripts['test:run']).toBe('vitest run');
    });

    it('creates eslint.config.js', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'eslint.config.js'), 'utf-8');
      expect(content).toContain('typescript-eslint');
      expect(content).toContain('eslint-config-prettier');
    });

    it('creates .prettierrc', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, '.prettierrc'), 'utf-8');
      const config = JSON.parse(content);
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(true);
    });

    it('creates example.test.ts', () => {
      const content = fs.readFileSync(
        path.join(tmpDir, projectName, 'src', 'example.test.ts'),
        'utf-8'
      );
      expect(content).toContain("import { describe, it, expect } from 'vitest'");
      expect(content).toContain('function sum');
    });

    it('installs express and tooling dependencies', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps.express).toBeDefined();
      expect(deps.eslint).toBeDefined();
      expect(deps.prettier).toBeDefined();
      expect(deps.vitest).toBeDefined();
    });
  });

  // ─── Permutation 6: fastify + vitest ───

  describe('fastify with vitest tooling', () => {
    let tmpDir: string;
    const projectName = 'test-fastify-vitest';

    beforeAll(() => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--fastify', '--vitest', '-y']);
    }, TEST_TIMEOUT);

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates package.json with test scripts but no lint scripts', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.test).toBe('vitest');
      expect(scripts['test:run']).toBe('vitest run');
      expect(scripts.dev).toBeDefined();
      expect(scripts.lint).toBeUndefined();
    });

    it('creates example.test.ts', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'src', 'example.test.ts'))).toBe(true);
    });

    it('does not create lint config files', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'eslint.config.js'))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, projectName, '.prettierrc'))).toBe(false);
    });

    it('creates src/index.ts with fastify template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("import Fastify from 'fastify'");
    });
  });

  // ─── Permutation 7: no server + lint ───

  describe('no server with lint tooling', () => {
    let tmpDir: string;
    const projectName = 'test-lint-only';

    beforeAll(() => {
      tmpDir = createTempDir();
      runCli(tmpDir, [projectName, '--lint', '-y']);
    }, TEST_TIMEOUT);

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates package.json with lint scripts but no dev or test scripts', () => {
      const pkg = readJson(path.join(tmpDir, projectName, 'package.json'));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.lint).toBe('eslint src/');
      expect(scripts['lint:fix']).toBe('eslint src/ --fix');
      expect(scripts.format).toBe('prettier --write src/');
      expect(scripts.dev).toBeUndefined();
      expect(scripts.test).toBeUndefined();
    });

    it('creates eslint.config.js', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'eslint.config.js'))).toBe(true);
    });

    it('creates .prettierrc', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, '.prettierrc'))).toBe(true);
    });

    it('creates src/index.ts with default template', () => {
      const content = fs.readFileSync(path.join(tmpDir, projectName, 'src', 'index.ts'), 'utf-8');
      expect(content).toContain("console.log('Hello, world!')");
    });

    it('does not create test files', () => {
      expect(fs.existsSync(path.join(tmpDir, projectName, 'src', 'example.test.ts'))).toBe(false);
    });

    it('builds successfully', () => {
      expect(() => {
        execSync('npm run build', {
          cwd: path.join(tmpDir, projectName),
          stdio: 'ignore',
          timeout: 30_000,
        });
      }).not.toThrow();
    });
  });
});
