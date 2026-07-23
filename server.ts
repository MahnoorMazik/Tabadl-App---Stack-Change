// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = Number(process.env.PORT || 3000);
const hostname = '0.0.0.0';

// Helper function to serve static files from public directory
function serveStaticFile(url: string | undefined, res: any): boolean {
  if (!url || url.startsWith('/api/') || url.startsWith('/_next/')) {
    return false;
  }

  try {
    // Remove query string and hash from URL
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Remove leading slash but preserve path structure
    const relativePath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
    
    // Build absolute path to public directory
    const publicDir = resolve(process.cwd(), 'public');
    const normalizedPublicDir = resolve(publicDir);
    const normalizedPublicPath = resolve(publicDir, relativePath);
    
    // Debug logging for tk-media and service images
    if (relativePath.includes('tk-media') || relativePath.includes('service-')) {
      console.log(`[Static File] Processing: url=${url}, cleanUrl=${cleanUrl}, relativePath=${relativePath}`);
      console.log(`[Static File] publicDir: ${normalizedPublicDir}`);
      console.log(`[Static File] publicPath: ${normalizedPublicPath}`);
    }
    
    // Security: ensure file is within public directory (prevents directory traversal)
    if (!normalizedPublicPath.startsWith(normalizedPublicDir)) {
      console.log(`[Static File] Security check failed: ${normalizedPublicPath} not in ${normalizedPublicDir}`);
      return false;
    }
    
    // Check if path exists and is a file (not a directory)
    if (!existsSync(normalizedPublicPath)) {
      // Try alternate path resolution for debugging
      console.log(`[Static File] File not found: ${normalizedPublicPath} (requested: ${url})`);
      console.log(`[Static File] publicDir: ${normalizedPublicDir}, relativePath: ${relativePath}`);
      return false;
    }
    
    // Check if it's a directory, not a file
    const stats = require('fs').statSync(normalizedPublicPath);
    if (stats.isDirectory()) {
      console.log(`[Static File] Path is a directory, not a file: ${normalizedPublicPath}`);
      return false;
    }
    
    if (!stats.isFile()) {
      console.log(`[Static File] Path is not a file: ${normalizedPublicPath}`);
      return false;
    }
    
    console.log(`[Static File] File found: ${normalizedPublicPath} (${stats.size} bytes)`);

    // Read file
    const fileContent = readFileSync(normalizedPublicPath);
    const ext = normalizedPublicPath.split('.').pop()?.toLowerCase() || '';
    
    // Determine content type
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'mp4': 'video/mp4',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Send response only if headers haven't been sent
    if (res.headersSent) {
      console.log(`[Static File] Cannot serve ${url}: headers already sent`);
      return false;
    }
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': fileContent.length,
    });
    res.end(fileContent);
    
    console.log(`[Static File] Served: ${url} (${contentType}, ${fileContent.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`[Static File] Error serving ${url}:`, error);
    return false;
  }
}

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Log environment for debugging
    console.log(`[Server] Starting in ${dev ? 'development' : 'production'} mode`);
    console.log(`[Server] Working directory: ${process.cwd()}`);
    console.log(`[Server] Public directory exists: ${existsSync(resolve(process.cwd(), 'public'))}`);
    if (existsSync(resolve(process.cwd(), 'public'))) {
      const publicFiles = require('fs').readdirSync(resolve(process.cwd(), 'public'));
      console.log(`[Server] Public directory contents: ${publicFiles.slice(0, 10).join(', ')}...`);
    }
    
    // Check if production build exists
    if (!dev) {
      const nextDir = resolve(process.cwd(), '.next');
      if (!existsSync(nextDir)) {
        console.error('[Server] ERROR: Production build not found in .next directory');
        console.error('[Server] Please run "npm run build" first');
        process.exit(1);
      }
      console.log('[Server] Production build found in .next directory');
    }

    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer(async (req, res) => {
      const url = req.url;
      
      // Skip socket.io requests from Next.js handler
      if (url?.startsWith('/api/socketio')) {
        return;
      }
      
      // Handle Next.js image optimization requests - redirect to original image if unoptimized
      if (url && (url.startsWith('/_next/image') || url.startsWith('/image'))) {
        // Extract the original image path from the query string
        try {
          const queryIndex = url.indexOf('?');
          if (queryIndex !== -1) {
            const queryString = url.substring(queryIndex + 1);
            const params = new URLSearchParams(queryString);
            let imageUrl = params.get('url');
            
            if (imageUrl) {
              // Decode the URL (may be encoded multiple times)
              let decodedUrl = imageUrl;
              try {
                decodedUrl = decodeURIComponent(imageUrl);
                // Sometimes URLs are encoded twice
                if (decodedUrl !== decodeURIComponent(decodedUrl)) {
                  decodedUrl = decodeURIComponent(decodedUrl);
                }
              } catch (e) {
                // If decoding fails, use original
              }
              
              // Ensure leading slash
              const originalPath = decodedUrl.startsWith('/') ? decodedUrl : `/${decodedUrl}`;
              
              console.log(`[Server] Image optimization request: ${url}`);
              console.log(`[Server] Extracted imageUrl: ${imageUrl} -> ${decodedUrl} -> ${originalPath}`);
              
              if (serveStaticFile(originalPath, res)) {
                return;
              }
            } else {
              console.log(`[Server] Image optimization request without 'url' param: ${url}`);
            }
          }
        } catch (error) {
          console.error(`[Server] Error parsing image optimization URL: ${url}`, error);
        }
      }
      
      // For static files (images, fonts, etc.), ALWAYS try our handler first
      // This ensures static files work in Docker
      const isStaticFile = url && /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|json|txt)$/i.test(url);
      
      if (isStaticFile && !url?.startsWith('/_next/') && !url?.startsWith('/api/')) {
        console.log(`[Server] Attempting to serve static file: ${url}`);
        // Try custom static file handler FIRST
        if (serveStaticFile(url, res)) {
          console.log(`[Server] Successfully served static file: ${url}`);
          return; // Successfully served
        } else {
          console.log(`[Server] Failed to serve static file: ${url}, falling back to Next.js`);
        }
      }
      
      // Let Next.js handle all other requests
      try {
        await handle(req, res);
      } catch (err) {
        console.error('[Next.js Handler] Error:', err);
        // If Next.js fails and it's a static file, try our handler as final fallback
        if (isStaticFile && url && !res.headersSent) {
          console.log(`[Server] Next.js failed, trying static file handler for: ${url}`);
          if (serveStaticFile(url, res)) {
            return;
          }
        }
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    setupSocket(io);

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${currentPort}/api/socketio`);
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
