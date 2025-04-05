import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import net from 'net'
import * as http from 'http'
import os from 'os'

// Check if a port is available
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(true)
      }
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port)
  })
}

// Find an available port starting from the given port
const findAvailablePort = async (startPort: number): Promise<number> => {
  let port = startPort
  const MAX_PORT = startPort + 50 // Don't check indefinitely

  while (port < MAX_PORT) {
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
    port++
  }

  console.warn(`Could not find an available port. Will try using the default port: ${startPort}`)
  return startPort
}

// Get server port by checking if the server is running
const detectRunningServerPort = async (): Promise<number> => {
  // Try to read the port from the project directory first
  const PROJECT_PORT_FILE = path.resolve(__dirname, '../server/port.txt')
  
  try {
    // First check if there's a port file in the project directory
    if (fs.existsSync(PROJECT_PORT_FILE)) {
      const port = fs.readFileSync(PROJECT_PORT_FILE, 'utf8').trim()
      const portNumber = parseInt(port, 10)
      if (!isNaN(portNumber)) {
        console.log(`Found server port ${portNumber} from project config`)
        return portNumber
      }
    }

    // Then try the temp file as a backup
    const PORT_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-server-port.txt')
    if (fs.existsSync(PORT_INFO_FILE)) {
      const port = fs.readFileSync(PORT_INFO_FILE, 'utf8').trim()
      const portNumber = parseInt(port, 10)
      if (!isNaN(portNumber)) {
        console.log(`Found server port ${portNumber} from temp file`)
        return portNumber
      }
    }
  } catch (err) {
    console.warn('Failed to read server port file:', err)
  }
  
  // Check if we can find the port in config.ts
  try {
    const CONFIG_FILE = path.resolve(__dirname, './src/config.ts')
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8')
      const portMatch = content.match(/serverPort\s*=\s*(\d+)/) || content.match(/getServerPort\(\)\s*{\s*return\s*(\d+)/)
      if (portMatch && portMatch[1]) {
        const portNumber = parseInt(portMatch[1], 10)
        console.log(`Found server port ${portNumber} from config.ts`)
        return portNumber
      }
    }
  } catch (err) {
    console.warn('Failed to read port from config.ts:', err)
  }
  
  // Default port from server's configuration
  const DEFAULT_SERVER_PORT = 8768
  
  console.log(`Using default server port ${DEFAULT_SERVER_PORT}`)
  return DEFAULT_SERVER_PORT
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // First check if a port is already specified in .vite-port
  let DEFAULT_CLIENT_PORT = 3001
  const vitePortFile = path.resolve(__dirname, '.vite-port')
  
  try {
    if (fs.existsSync(vitePortFile)) {
      const savedPort = fs.readFileSync(vitePortFile, 'utf8').trim()
      const parsedPort = parseInt(savedPort, 10)
      if (!isNaN(parsedPort)) {
        DEFAULT_CLIENT_PORT = parsedPort
        console.log(`Using previously saved client port: ${DEFAULT_CLIENT_PORT}`)
      }
    }
  } catch (err) {
    console.warn('Could not read saved port file:', err)
  }
  
  const availablePort = await findAvailablePort(DEFAULT_CLIENT_PORT)
  
  // Get server port with priorities:
  // 1. Environment variable
  // 2. Detected from files
  const serverPort = process.env.ACTUAL_SERVER_PORT 
    ? parseInt(process.env.ACTUAL_SERVER_PORT, 10) 
    : process.env.SERVER_PORT
      ? parseInt(process.env.SERVER_PORT, 10)
      : await detectRunningServerPort()

  console.log(`Client will run on port ${availablePort}`)
  console.log(`Proxying API requests to server on port ${serverPort}`)

  // Write port info to a file that can be read by npm scripts
  try {
    fs.writeFileSync(
      path.resolve(__dirname, '.vite-port'),
      availablePort.toString()
    )
    console.log(`Saved client port ${availablePort} to .vite-port`)
  } catch (err) {
    console.warn('Failed to save port information:', err)
  }

  return {
    plugins: [
      react({
        // Only disable Fast Refresh if you're experiencing issues with it
        // Comment this out to test if it works well with your setup
        // fastRefresh: false
      })
    ],
    server: {
      port: availablePort,
      strictPort: false, // Allow Vite to find another port if specified one is in use
      host: true, // Listen on all local IPs for easier network testing
      hmr: {
        // HMR configuration for more stable updates
        overlay: true, // Show errors as overlay
        port: availablePort,
        timeout: 5000 // Increased timeout for slower connections
      },
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying:', req.method, req.url);
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Improve the build process
      sourcemap: process.env.NODE_ENV !== 'production', // Generate sourcemaps in development
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: process.env.NODE_ENV === 'production',
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            chart: ['chart.js', 'react-chartjs-2'],
          },
        },
      },
      // Prevent duplicate bundling
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Show detailed build info and warn about large chunks
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
    },
    define: {
      // Define environment variables that will be available in the client code
      'process.env.VITE_CLIENT_PORT': JSON.stringify(availablePort),
      'process.env.VITE_SERVER_PORT': JSON.stringify(serverPort)
    }
  }
})