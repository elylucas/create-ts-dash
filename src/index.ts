#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import prompts from 'prompts';

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

type ServerKey = 'express' | 'fastify' | 'hono';
type ToolingKey = 'lint' | 'vitest';

interface ServerOption {
  label: string;
  value: ServerKey;
  description: string;
  dependencies: string[];
  template: string;
}

interface ToolingOption {
  label: string;
  value: ToolingKey;
  description: string;
  dependencies: string[];
}

const servers: ServerOption[] = [
  {
    label: 'Express',
    value: 'express',
    description: 'Fast, unopinionated, minimalist web framework',
    dependencies: ['express', '@types/express'],
    template: `import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});
`,
  },
  {
    label: 'Fastify',
    value: 'fastify',
    description: 'Fast and low overhead web framework',
    dependencies: ['fastify'],
    template: `import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.get('/', async () => {
  return { hello: 'world' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
`,
  },
  {
    label: 'Hono',
    value: 'hono',
    description: 'Lightweight, ultrafast web framework',
    dependencies: ['hono', '@hono/node-server'],
    template: `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello, world!');
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(\`Server running at http://localhost:\${info.port}\`);
});
`,
  },
];

const tooling: ToolingOption[] = [
  {
    label: 'ESLint + Prettier',
    value: 'lint',
    description: 'Add linting and formatting',
    dependencies: [
      'eslint',
      'prettier',
      '@eslint/js',
      'typescript-eslint',
      'eslint-config-prettier',
      'eslint-plugin-prettier',
    ],
  },
  {
    label: 'Vitest',
    value: 'vitest',
    description: 'Add Vitest for testing',
    dependencies: ['vitest'],
  },
];

interface CliArgs {
  projectName?: string;
  server?: ServerKey;
  tooling: Set<ToolingKey>;
  yes: boolean;
}

function parseArgs(args: string[]): CliArgs {
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

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
  }

  return 'npm';
}

function getInitCommand(pm: PackageManager): string {
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

function getAddCommand(pm: PackageManager, deps: string[]): string {
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

function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-');
}

const tsconfig = {
  compilerOptions: {
    module: 'es2022',
    target: 'esnext',
    outDir: './dist',
    rootDir: './src',
    moduleResolution: 'bundler',
    types: ['node'],
    sourceMap: true,
    declaration: true,
    declarationMap: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    strict: true,
    verbatimModuleSyntax: true,
    isolatedModules: true,
    noUncheckedSideEffectImports: true,
    moduleDetection: 'force',
    skipLibCheck: true,
  },
};

const eslintConfig = `import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  }
);
`;

const prettierConfigFile = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
`;

const vitestExample = `import { describe, it, expect } from 'vitest';

function sum(a: number, b: number): number {
  return a + b;
}

describe('sum', () => {
  it('adds two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(sum(-1, 1)).toBe(0);
  });
});
`;

const defaultTemplate = `console.log('Hello, world!');
`;

function getIndexTemplate(server?: ServerKey): string {
  if (server) {
    const serverConfig = servers.find((s) => s.value === server);
    if (serverConfig) {
      return serverConfig.template;
    }
  }
  return defaultTemplate;
}

function getScripts(
  server: ServerKey | undefined,
  selectedTooling: Set<ToolingKey>
): Record<string, string> {
  const scripts: Record<string, string> = {
    start: 'tsx watch ./src/index.ts',
    build: 'rimraf ./dist && tsc',
  };

  if (server) {
    scripts.dev = 'tsx watch ./src/index.ts';
  }

  if (selectedTooling.has('lint')) {
    scripts.lint = 'eslint src/';
    scripts['lint:fix'] = 'eslint src/ --fix';
    scripts.format = 'prettier --write src/';
  }

  if (selectedTooling.has('vitest')) {
    scripts.test = 'vitest';
    scripts['test:run'] = 'vitest run';
  }

  return scripts;
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));
  let { projectName, server: selectedServer, tooling: selectedTooling, yes: skipPrompts } = cliArgs;

  const onCancel = () => {
    console.log('\nOperation cancelled.');
    process.exit(0);
  };

  if (!projectName) {
    if (skipPrompts) {
      projectName = 'ts-project';
    } else {
      const response = await prompts(
        {
          type: 'text',
          name: 'projectName',
          message: 'Project name:',
          initial: 'ts-project',
        },
        { onCancel }
      );
      projectName = response.projectName;
    }
  }

  // Server selection (single select)
  if (!skipPrompts && selectedServer === undefined) {
    const response = await prompts(
      {
        type: 'select',
        name: 'server',
        message: 'Select a web server:',
        choices: [
          { title: 'None', value: 'none', description: 'No web server' },
          ...servers.map((s) => ({
            title: s.label,
            value: s.value,
            description: s.description,
          })),
        ],
        initial: 0,
      },
      { onCancel }
    );
    selectedServer = response.server === 'none' ? undefined : response.server;
  }

  // Tooling selection (multi select)
  if (!skipPrompts && selectedTooling.size === 0) {
    const response = await prompts(
      {
        type: 'multiselect',
        name: 'tooling',
        message: 'Select additional tooling:',
        choices: tooling.map((t) => ({
          title: t.label,
          value: t.value,
          description: t.description,
        })),
        hint: '- Space to select. Return to submit',
      },
      { onCancel }
    );
    selectedTooling = new Set(response.tooling as ToolingKey[]);
  }

  if (!projectName) {
    console.log('Project name is required.');
    process.exit(1);
  }

  const packageName = toValidPackageName(projectName);
  const root = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(root)) {
    const files = fs.readdirSync(root);
    if (files.length > 0) {
      if (skipPrompts) {
        console.log(`Directory "${projectName}" is not empty. Aborting.`);
        process.exit(1);
      }

      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${projectName}" is not empty. Remove existing files and continue?`,
        initial: false,
      });

      if (!overwrite) {
        console.log('Operation cancelled.');
        process.exit(0);
      }

      for (const file of files) {
        fs.rmSync(path.join(root, file), { recursive: true, force: true });
      }
    }
  } else {
    fs.mkdirSync(root, { recursive: true });
  }

  const pm = detectPackageManager();

  console.log(`\nScaffolding project in ${root}...`);

  // Initialize package.json
  console.log(`\nInitializing project with ${pm}...`);
  execSync(getInitCommand(pm), { cwd: root, stdio: 'ignore' });

  // Update package.json
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = packageName;
  pkg.type = 'module';
  pkg.scripts = getScripts(selectedServer, selectedTooling);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Collect dependencies
  const deps = ['tsx', 'typescript', '@types/node', 'rimraf'];

  if (selectedServer) {
    const serverConfig = servers.find((s) => s.value === selectedServer);
    if (serverConfig) {
      deps.push(...serverConfig.dependencies);
    }
  }

  for (const tool of tooling) {
    if (selectedTooling.has(tool.value)) {
      deps.push(...tool.dependencies);
    }
  }

  // Install dependencies
  console.log('\nInstalling dependencies...');
  try {
    execSync(getAddCommand(pm, deps), { cwd: root, stdio: 'inherit' });
  } catch {
    console.log(`\nFailed to install dependencies.`);
    process.exit(1);
  }

  // Create tsconfig.json
  fs.writeFileSync(
    path.join(root, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2) + '\n'
  );

  // Create src/index.ts
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'index.ts'), getIndexTemplate(selectedServer));

  // Create ESLint and Prettier configs if lint feature is selected
  if (selectedTooling.has('lint')) {
    fs.writeFileSync(path.join(root, 'eslint.config.js'), eslintConfig);
    fs.writeFileSync(path.join(root, '.prettierrc'), prettierConfigFile);
  }

  // Create example test file if vitest is selected
  if (selectedTooling.has('vitest')) {
    fs.writeFileSync(path.join(root, 'src', 'example.test.ts'), vitestExample);
  }

  // Initialize git
  console.log('\nInitializing git repository...');
  try {
    execSync('git init', { cwd: root, stdio: 'ignore' });
    fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\ndist\n.DS_Store\n');
    console.log('Git repository initialized.');
  } catch {
    console.log('Could not initialize git repository.');
  }

  // Done
  console.log('\nDone! To get started:\n');
  if (root !== process.cwd()) {
    console.log(`  cd ${projectName}`);
  }
  console.log(`  ${pm === 'npm' ? 'npm run' : pm} start\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
