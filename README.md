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

## What's Included

The generated project includes:

- TypeScript 5.x with strict configuration
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript with watch mode
- ESM modules configured
- Git repository initialized with `.gitignore`

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
