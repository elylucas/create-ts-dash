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

### Web Servers (pick one)

| Flag | Description |
|------|-------------|
| `-e, --express` | Express - Fast, unopinionated, minimalist web framework |
| `-f, --fastify` | Fastify - Fast and low overhead web framework |
| `-h, --hono` | Hono - Lightweight, ultrafast web framework |

### Tooling (pick any)

| Flag | Description |
|------|-------------|
| `-l, --lint` | ESLint + Prettier with sensible defaults |
| `-t, --vitest` | Vitest for testing |

### Other

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip all prompts and use defaults |

### Examples

```bash
# Interactive mode - prompts for project name, server, and tooling
npm create ts-new

# Create a project with defaults (no prompts, no server)
npm create ts-new my-app -y

# Create an Express project with linting and testing
npm create ts-new my-api --express --lint --vitest

# Create a Fastify project with no prompts
npm create ts-new my-api -f -y

# Create a Hono project with all tooling
npm create ts-new my-api -h -l -t -y
```

## What's Included

The generated project includes:

- TypeScript with strict configuration (latest version)
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript with watch mode
- ESM modules configured
- Git repository initialized with `.gitignore`

### Web Servers

- **Express** - The classic Node.js web framework
- **Fastify** - High performance with built-in JSON schema validation
- **Hono** - Ultrafast, works on edge runtimes too

### Tooling

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
| `dev` | Run with watch mode (with web server) |
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
