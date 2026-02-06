# create-ts-new

Scaffold a new minimal TypeScript project with a single command.

## Usage

```bash
npm create ts-new my-app
```

Or with other package managers:

```bash
yarn create ts-new my-app
pnpm create ts-new my-app
bun create ts-new my-app
```

You can also run without a project name to be prompted interactively:

```bash
npm create ts-new
```

## Options

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip all prompts and use defaults |
| `-e, --express` | Include Express.js with a basic server setup |
| `-l, --lint` | Include ESLint and Prettier with sensible defaults |
| `-t, --vitest` | Include Vitest for testing |

### Examples

```bash
# Interactive mode - prompts for project name and features
npm create ts-new

# Create a project with defaults (no prompts)
npm create ts-new my-app -y

# Create an Express project with linting
npm create ts-new my-api --express --lint

# Create a project with all features, no prompts
npm create ts-new my-api -e -l -t -y
```

## What's Included

The generated project includes:

- TypeScript with strict configuration (latest version)
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript with watch mode
- ESM modules configured
- Git repository initialized with `.gitignore`

### Optional Features

- **Express** - Basic Express.js server setup
- **ESLint + Prettier** - Linting and formatting with:
  - TypeScript ESLint recommended rules
  - Prettier integration
  - Sensible defaults (unused vars with `_` prefix allowed, consistent type imports)
- **Vitest** - Fast unit testing with an example test file

Dependencies are always installed at their latest versions.

## Project Structure

```
my-app/
├── src/
│   ├── index.ts        # Entry point
│   └── example.test.ts # (with --vitest)
├── package.json
├── tsconfig.json
├── eslint.config.js    # (with --lint)
├── .prettierrc         # (with --lint)
└── .gitignore
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `start` | Run with watch mode |
| `lint` | Run ESLint (with `--lint`) |
| `lint:fix` | Run ESLint and fix issues (with `--lint`) |
| `format` | Format code with Prettier (with `--lint`) |
| `test` | Run Vitest in watch mode (with `--vitest`) |
| `test:run` | Run Vitest once (with `--vitest`) |

## Getting Started

After creating your project:

```bash
cd my-app
npm run start
```

This starts the TypeScript file in watch mode - any changes you make will automatically reload.

## License

MIT
