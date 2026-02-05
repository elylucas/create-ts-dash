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

### Examples

```bash
# Interactive mode - prompts for project name and options
npm create ts-new

# Create a project with defaults (no prompts)
npm create ts-new my-app -y

# Create an Express project
npm create ts-new my-api --express

# Create an Express project with no prompts
npm create ts-new my-api -e -y
```

## What's Included

The generated project includes:

- TypeScript with strict configuration (latest version)
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript with watch mode
- ESM modules configured
- Git repository initialized with `.gitignore`
- Optional: Express.js with a basic server setup

Dependencies are always installed at their latest versions.

## Project Structure

```
my-app/
├── src/
│   └── index.ts      # Entry point
├── package.json
├── tsconfig.json
└── .gitignore
```

## Getting Started

After creating your project:

```bash
cd my-app
npm run start
```

This starts the TypeScript file in watch mode - any changes you make will automatically reload.

## License

MIT
