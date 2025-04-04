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
- shadcn UI components
- Chart.js for visualizations

### Backend
- Node.js
- Express.js
- better-sqlite3 for database interaction

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation
1. Clone the repository
```bash
git clone <repository-url>
cd sqlite-visualizer
```

2. Install dependencies
```bash
npm install
cd client && npm install
cd ..
```

3. Initialize the database
```bash
npm run setup-db
```

4. Start the application in development mode
```bash
npm run dev
```
This will start both the backend server and the frontend development server.

### Accessing the Application
- Frontend: http://localhost:3001 (or another port if 3001 is in use)
- Backend API: http://localhost:8765

## Development

### Project Structure
- `/server` - Backend Node.js/Express application
- `/client` - Frontend React application
- `/data` - Database files (app.sqlite and user databases)
- `/scripts` - Utility scripts for setup and maintenance

### Available Scripts
- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:server` - Start only the backend server
- `npm run dev:client` - Start only the frontend development server
- `npm run build` - Build the frontend for production
- `npm run setup-db` - Initialize the application database

### Adding a Sample Database
1. Place your SQLite database file in the `/data` directory
2. Start the application and use the "Add New Connection" form to connect to your database

## Troubleshooting

### Port Conflicts
If you encounter `EADDRINUSE` errors:
1. Check if the ports 8765 (backend) or 3001 (frontend) are already in use
2. Kill the processes using these ports
```bash
lsof -i :8765
kill -9 <PID>
```

### Database Connection Issues
- Ensure the database path is correct and accessible
- Check if the file is a valid SQLite database
- Make sure the database is not locked by another process

### Frontend/Backend Connection Issues
If the frontend can't connect to the backend:
1. Make sure both services are running
2. Check that the proxy in `client/vite.config.ts` is pointing to the correct backend URL
3. Check for CORS issues in the browser console

## Deployment

### Local Network Deployment
1. Build the frontend for production:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Access the application from other computers on the network:
```
http://<your-computer-ip>:8765
```

### Mac-Specific Configuration
For Mac deployment, you may need to:
1. Configure firewall settings to allow incoming connections
2. Set up Bonjour/mDNS for easier local network discovery
3. Consider using `pm2` for process management
