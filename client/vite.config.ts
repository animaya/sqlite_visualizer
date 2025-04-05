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
  // Try to read the port from the temp file written by the server
  const PORT_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-server-port.txt')
  
  try {
    if (fs.existsSync(PORT_INFO_FILE)) {
      const port = fs.readFileSync(PORT_INFO_FILE, 'utf8')
      const portNumber = parseInt(port, 10)
      console.log(`Found server port ${portNumber} from info file`)
      return portNumber
    }
  } catch (err) {
    console.warn('Failed to read server port info file:', err)
  }
  
  // Default port from server's configuration
  const DEFAULT_SERVER_PORT = 8765
  
  console.log(`Using server port ${DEFAULT_SERVER_PORT}`)
  return DEFAULT_SERVER_PORT
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const DEFAULT_CLIENT_PORT = 3001
  const availablePort = await findAvailablePort(DEFAULT_CLIENT_PORT)
  const serverPort = process.env.ACTUAL_SERVER_PORT 
    ? parseInt(process.env.ACTUAL_SERVER_PORT, 10) 
    : await detectRunningServerPort()

  console.log(`Client will run on port ${availablePort}`)
  console.log(`Proxying API requests to server on port ${serverPort}`)

  // Write port info to a temporary file that can be read by npm scripts
  fs.writeFileSync(
    path.resolve(__dirname, '.vite-port'),
    availablePort.toString()
  )

  return {
    plugins: [
      react({
        // Disable Fast Refresh to prevent React duplicate rendering in development
        fastRefresh: false
      })
    ],
    server: {
      port: availablePort,
      strictPort: false, // Allow Vite to find another port if specified one is in use
      hmr: {
        // Configure HMR for more stable updates
        overlay: false,
        port: availablePort
      },
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Avoid potential rendering issues
    esbuild: {
      jsxInject: `import React from 'react'`
    },
    build: {
      // Improve the build process
      sourcemap: false,
      minify: 'terser',
      // Prevent duplicate bundling
      commonjsOptions: {
        include: [/node_modules/],
      }
    }
  }
})