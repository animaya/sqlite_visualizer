# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Lint Commands

### Client (React/TypeScript)
- Development: `npm run dev:client` or in client directory: `npm run dev`
- Build: `npm run build` (in root) or in client directory: `npm run build`
- Lint: `npm run lint` (in client directory)
- Fix lint issues: `npm run lint:fix` (in client directory)

### Server (Node.js/Express)
- Development: `npm run dev:server`
- Start: `npm start`
- Setup database: `npm run setup-db`

### Full Application
- Development (both): `npm run dev`

## Code Style Guidelines

- **TypeScript**: Use strict type checking, prefer explicit types over `any`
- **Components**: Use functional React components with hooks
- **Formatting**: Follow existing indent style (2 spaces)
- **Naming**: 
  - React components: PascalCase
  - Functions/variables: camelCase
  - Files: Match component names (PascalCase) or feature.type.ts pattern
- **Imports**: Group by external libraries first, then internal modules
- **Error Handling**: Use try/catch with next(error) pattern in Express routes
- **Documentation**: Use JSDoc comments for functions, especially in server code
- **Styling**: Use Tailwind CSS utility classes following existing patterns