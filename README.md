# SQLite Visualizer

A clean, user-friendly web application that visualizes SQLite database content in both tabular and chart formats, allowing for simple data exploration and insight generation without requiring SQL knowledge.

## Features

- Connect to SQLite databases via localhost
- View database content in clean, responsive table format
- Generate visualizations (bar charts, pie charts, line graphs)
- Use pre-configured visualization templates for common business insights
- Save and export visualizations

## Technology Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- shadcn UI for components
- Chart.js for visualizations

### Backend
- Node.js
- Express.js
- better-sqlite3 for database interaction

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sqlite-visualizer.git
   cd sqlite-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

3. Initialize the application database:
   ```bash
   npm run setup-db
   ```

## Development

1. Start the development server (both backend and frontend):
   ```bash
   npm run dev
   ```
   
   This will start:
   - Backend server at http://localhost:3000
   - Frontend at http://localhost:3011

2. For separate development:
   - Backend only: `npm run dev:server`
   - Frontend only: `npm run dev:client`

## Deployment

To deploy on a local Mac within an office network:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Access the application at http://localhost:3000

4. Share with colleagues on the same network using your machine's network IP:
   ```bash
   # Find your IP
   ipconfig getifaddr en0  # for Wi-Fi
   # or
   ipconfig getifaddr en1  # for Ethernet
   ```
   
   Then they can access the app at http://YOUR_IP:3000
