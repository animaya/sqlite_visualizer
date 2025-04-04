/**
 * Start Development Environment Script
 * 
 * This script orchestrates the startup of server and client with proper
 * port coordination and handles cleanup on exit.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to store process info and server port
const PROCESS_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-processes.json');
const PORT_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-server-port.txt');

// Clean up any existing files from previous runs
const cleanupFiles = () => {
  try {
    if (fs.existsSync(PROCESS_INFO_FILE)) {
      fs.unlinkSync(PROCESS_INFO_FILE);
    }
    if (fs.existsSync(PORT_INFO_FILE)) {
      fs.unlinkSync(PORT_INFO_FILE);
    }
  } catch (err) {
    console.warn('Error cleaning up old files:', err);
  }
};

// Wait for server to start and get port
const waitForServer = () => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 500; // 500ms

    const checkServerPort = () => {
      attempts++;
      
      try {
        if (fs.existsSync(PORT_INFO_FILE)) {
          const portData = fs.readFileSync(PORT_INFO_FILE, 'utf8');
          const port = parseInt(portData, 10);
          
          if (!isNaN(port)) {
            console.log(`Server detected on port ${port}`);
            return resolve(port);
          }
        }
      } catch (err) {
        console.warn('Error reading server port file:', err);
      }
      
      // If we've reached max attempts, give up
      if (attempts >= maxAttempts) {
        console.warn('Timed out waiting for server to start. Continuing anyway...');
        return resolve(null);
      }
      
      // Try again after interval
      setTimeout(checkServerPort, checkInterval);
    };
    
    // Start checking
    checkServerPort();
  });
};

// Start the application components
const startApplication = async () => {
  // Clean up any existing files first
  cleanupFiles();
  
  // Start server
  console.log('Starting server...');
  const server = spawn('nodemon', ['server/app.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  // Wait for server to start and get its port
  const serverPort = await waitForServer();
  
  // Start client with server port info if available
  console.log('Starting client...');
  const clientEnv = { ...process.env, FORCE_COLOR: '1' };
  
  if (serverPort) {
    clientEnv.ACTUAL_SERVER_PORT = serverPort.toString();
  }
  
  const client = spawn('cd client && npm run dev', {
    stdio: 'inherit',
    shell: true,
    env: clientEnv
  });
  
  // Save process info for cleanup
  const processInfo = {
    server: server.pid,
    client: client.pid,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(PROCESS_INFO_FILE, JSON.stringify(processInfo, null, 2));
  
  // Handle process exits
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    cleanup();
  });
  
  client.on('close', (code) => {
    console.log(`Client process exited with code ${code}`);
    cleanup();
  });
};

// Function to clean up processes
function cleanup() {
  try {
    console.log('Cleaning up processes and temporary files...');
    
    // Read process info if it exists
    if (fs.existsSync(PROCESS_INFO_FILE)) {
      const processInfo = JSON.parse(fs.readFileSync(PROCESS_INFO_FILE, 'utf8'));
      
      // Try to kill processes if still running
      try {
        process.kill(processInfo.server, 'SIGINT');
      } catch (err) {
        // Process might not exist, which is fine
      }
      
      try {
        process.kill(processInfo.client, 'SIGINT');
      } catch (err) {
        // Process might not exist, which is fine
      }
      
      // Remove process info file
      fs.unlinkSync(PROCESS_INFO_FILE);
    }
    
    // Remove server port file if it exists
    if (fs.existsSync(PORT_INFO_FILE)) {
      fs.unlinkSync(PORT_INFO_FILE);
    }
    
    // Exit after a short delay to allow processes to terminate
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

// Handle signals for graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the application
startApplication().catch((err) => {
  console.error('Error starting application:', err);
  cleanup();
  process.exit(1);
});