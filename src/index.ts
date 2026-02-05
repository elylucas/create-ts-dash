#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import prompts from 'prompts';

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

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
    case 'yarn': return 'yarn init -y';
    case 'pnpm': return 'pnpm init';
    case 'bun': return 'bun init -y';
    default: return 'npm init -y';
  }
}

function getAddCommand(pm: PackageManager, deps: string[]): string {
  const depsStr = deps.join(' ');
  switch (pm) {
    case 'yarn': return `yarn add ${depsStr}`;
    case 'pnpm': return `pnpm add ${depsStr}`;
    case 'bun': return `bun add ${depsStr}`;
    default: return `npm install ${depsStr}`;
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let projectName = args[0];

  if (!projectName) {
    const response = await prompts(
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'ts-project',
      },
      {
        onCancel: () => {
          console.log('\nOperation cancelled.');
          process.exit(0);
        },
      }
    );
    projectName = response.projectName;
  }

  const packageName = toValidPackageName(projectName);
  const root = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(root)) {
    const files = fs.readdirSync(root);
    if (files.length > 0) {
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
  pkg.scripts = {
    start: 'tsx watch ./src/index.ts',
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Install dependencies
  console.log('\nInstalling dependencies...');
  const deps = ['tsx', 'typescript', '@types/node'];
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
  fs.writeFileSync(
    path.join(root, 'src', 'index.ts'),
    `console.log('Hello, world!');\n`
  );

  // Initialize git
  console.log('\nInitializing git repository...');
  try {
    execSync('git init', { cwd: root, stdio: 'ignore' });
    fs.writeFileSync(
      path.join(root, '.gitignore'),
      'node_modules\ndist\n.DS_Store\n'
    );
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
