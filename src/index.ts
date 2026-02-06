#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import prompts from 'prompts';
import type { ToolingKey } from './types.js';
import { parseArgs, toValidPackageName } from './args.js';
import { detectPackageManager, getInitCommand, getAddCommand } from './package-manager.js';
import {
  servers,
  tooling,
  tsconfig,
  eslintConfig,
  prettierConfigFile,
  vitestExample,
  getIndexTemplate,
  getScripts,
} from './templates.js';

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));
  const { yes: skipPrompts } = cliArgs;
  let { projectName, server: selectedServer, tooling: selectedTooling } = cliArgs;

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
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n');

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
