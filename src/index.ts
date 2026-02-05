#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'yarn': return 'yarn';
    case 'pnpm': return 'pnpm install';
    case 'bun': return 'bun install';
    default: return 'npm install';
  }
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
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
  }

  console.log(`\nScaffolding project in ${root}...`);

  // Copy template files
  const templateDir = path.resolve(__dirname, '..', 'template');
  copyDir(templateDir, root);

  // Update package.json with project name
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = packageName;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Initialize git
  console.log('\nInitializing git repository...');
  try {
    execSync('git init', { cwd: root, stdio: 'ignore' });

    // Create .gitignore
    fs.writeFileSync(
      path.join(root, '.gitignore'),
      'node_modules\ndist\n.DS_Store\n'
    );

    console.log('Git repository initialized.');
  } catch {
    console.log('Could not initialize git repository.');
  }

  // Install dependencies
  const pm = detectPackageManager();
  const installCmd = getInstallCommand(pm);

  console.log(`\nInstalling dependencies with ${pm}...`);
  try {
    execSync(installCmd, { cwd: root, stdio: 'inherit' });
  } catch {
    console.log(`\nFailed to install dependencies. Run "${installCmd}" manually.`);
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
