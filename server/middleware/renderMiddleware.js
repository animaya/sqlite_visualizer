/**
 * Server-side rendering middleware for SQLite Visualizer
 * This middleware ensures that the proper CSS is injected into the HTML response
 */
const path = require('path');
const fs = require('fs');

/**
 * Middleware to inject Tailwind CSS into the HTML response
 */
function injectTailwindCSS(req, res, next) {
  // Only intercept HTML requests
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      // Inject Tailwind CSS link
      body = body.replace(
        '</head>',
        `<link rel="stylesheet" href="/css/tailwind.css">
        </head>`
      );
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Serve the Tailwind CSS file
 */
function serveTailwindCSS(req, res, next) {
  if (req.path === '/css/tailwind.css') {
    try {
      // Path to the compiled Tailwind CSS file
      const cssPath = path.resolve(__dirname, '../../client/dist/assets/index.css');
      
      // Check if the file exists
      if (fs.existsSync(cssPath)) {
        return res.sendFile(cssPath);
      }
      
      // Fallback to the development CSS file
      const devCssPath = path.resolve(__dirname, '../../client/src/index.css');
      if (fs.existsSync(devCssPath)) {
        return res.sendFile(devCssPath);
      }
      
      // If neither file exists, return a 404
      return res.status(404).send('CSS file not found');
    } catch (error) {
      console.error('Error serving Tailwind CSS:', error);
      return res.status(500).send('Error serving CSS file');
    }
  }
  
  next();
}

module.exports = {
  injectTailwindCSS,
  serveTailwindCSS
};
