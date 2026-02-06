import type { ServerKey, ServerOption, ToolingKey, ToolingOption } from './types.js';

export const servers: ServerOption[] = [
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

export const tooling: ToolingOption[] = [
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

export const tsconfig = {
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

export const eslintConfig = `import eslint from '@eslint/js';
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

export const prettierConfigFile = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
`;

export const vitestExample = `import { describe, it, expect } from 'vitest';

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

export const defaultTemplate = `console.log('Hello, world!');
`;

export function getIndexTemplate(server?: ServerKey): string {
  if (server) {
    const serverConfig = servers.find((s) => s.value === server);
    if (serverConfig) {
      return serverConfig.template;
    }
  }
  return defaultTemplate;
}

export function getScripts(
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
