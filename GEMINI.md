This project uses Vitest for testing. Each test file is placed in the same directory as its corresponding implementation file (for example, `src/impl/browser/exports/entrypoints/shared_worker.ts` 🤝 `src/impl/browser/exports/entrypoints/shared_worker.test.ts`).

The test command is `bun run test`. The aim within this project is 100% coverage for every file. If you are working on tests, it is advisable to see how other tests are performed by reading a share of `*.test.ts` files from across the project.

All package management and running should be performed with `bun`.

Prefer TypeScript `const enum`s, using default numbering, over text enums.
