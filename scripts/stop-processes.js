/**
 * Process Cleanup Script
 * 
 * This script finds and terminates any stray development processes
 * for the SQLite Visualizer application.
 */

const findProcess = require('find-process');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Path where process info is stored
const PROCESS_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-processes.json');

// Execute a command
const execute = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Command failed: ${command}`);
        console.warn(stderr);
        resolve(null);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Kill a process by PID
const killProcess = async (pid, name) => {
  try {
    if (process.platform === 'win32') {
      await execute(`taskkill /F /PID ${pid}`);
    } else {
      await execute(`kill -9 ${pid}`);
    }
    console.log(`Killed ${name} process with PID ${pid}`);
    return true;
  } catch (err) {
    console.error(`Failed to kill ${name} process:`, err);
    return false;
  }
};

// Find and kill all Node.js processes related to the application
const findAndKillProcesses = async () => {
  // First check if we have stored PIDs
  if (fs.existsSync(PROCESS_INFO_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROCESS_INFO_FILE, 'utf8'));
      console.log('Found process info file, attempting to kill processes...');
      
      if (data.server) {
        await killProcess(data.server, 'server');
      }
      
      if (data.client) {
        await killProcess(data.client, 'client');
      }
      
      // Remove the file regardless of success
      fs.unlinkSync(PROCESS_INFO_FILE);
    } catch (err) {
      console.error('Error reading process info file:', err);
    }
  }

  // As a fallback, search for related processes
  console.log('Searching for SQLite Visualizer processes...');
  
  // Look for Vite dev server processes
  const viteProcesses = await findProcess('name', 'vite');
  const clientProcesses = viteProcesses.filter(proc => 
    proc.cmd.includes('sqlite-visualizer') || 
    proc.cmd.includes('vite')
  );
  
  // Look for server processes (nodemon or node)
  const nodeProcesses = await findProcess('name', 'node');
  const serverProcesses = nodeProcesses.filter(proc => 
    proc.cmd.includes('sqlite-visualizer') || 
    (proc.cmd.includes('node') && proc.cmd.includes('app.js'))
  );
  
  console.log(`Found ${clientProcesses.length} client processes and ${serverProcesses.length} server processes`);
  
  let killCount = 0;
  
  // Kill client processes
  for (const proc of clientProcesses) {
    const killed = await killProcess(proc.pid, 'client');
    if (killed) killCount++;
  }
  
  // Kill server processes
  for (const proc of serverProcesses) {
    const killed = await killProcess(proc.pid, 'server');
    if (killed) killCount++;
  }
  
  return killCount;
};

// Run the cleanup
findAndKillProcesses()
  .then(count => {
    console.log(`Terminated ${count} processes.`);
    console.log('Cleanup complete.');
  })
  .catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  });