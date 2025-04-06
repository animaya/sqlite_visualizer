# CLAUDE.md - Development Guidelines

## Build, Test, and Lint Commands

### Client (React/TypeScript)
- Build: `npm run build` or `cd client && npm run build`
- Lint: `cd client && npm run lint`
- Lint and fix: `cd client && npm run lint:fix`
- Start client: `cd client && npm run dev`

### Server (Node.js)
- Start server: `npm run dev:server`
- Run both client and server: `npm run dev`
- Setup database: `npm run setup-db`
- Stop all processes: `npm run stop`
- node version v23.4.0

## Code Style Guidelines

- **Formatting**: Use consistent indentation (2 spaces) for all files
- **Naming**: 
  - React components: PascalCase (e.g., `DataTable.tsx`)
  - TypeScript/JavaScript files: camelCase
  - CSS classes: kebab-case
- **Imports**: Group imports by standard libraries, external packages, then local files
- **Error Handling**: Provide context in error messages, use try/catch blocks appropriately
- **Types**: Use TypeScript interfaces/types for all components and functions
- **File Structure**: Follow the established pattern of components, pages, services, utils
- **API Endpoints**: Document endpoints with JSDoc comments
- **Code Organization**: Keep components focused and composable
- **Documentation**: Add JSDoc comments for functions and components

## Guidelines
- masterplan located here /Users/amirahmetzanov/go/sqlite_visualizer/SQLite_Visualizer_Masterplan.md
- style and design guide located here /Users/amirahmetzanov/go/sqlite_visualizer/SQLite_Visualizer_Style_Guide_Design_System.md
- technical design guide located here /Users/amirahmetzanov/go/sqlite_visualizer/SQLite_Visualizer_Technical_Design_Document.md