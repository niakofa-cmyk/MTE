import { execFile } from 'node:child_process';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

function levelGeometryExportPlugin(): Plugin {
  const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
  const watchedSources = new Set([
    path.resolve(import.meta.dirname, 'src/game/world.ts'),
    path.resolve(import.meta.dirname, 'src/game/region-layout.ts'),
  ]);
  let exportQueue: Promise<void> = Promise.resolve();

  const runWorker = () =>
    new Promise<string>((resolve, reject) => {
      execFile(
        'pnpm',
        ['--filter', '@workspace/scripts', 'run', 'export:level'],
        { cwd: workspaceRoot, maxBuffer: 2 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(stdout.trim());
        },
      );
    });

  const queueWorker = (server?: ViteDevServer) => {
    const next = exportQueue
      .catch(() => undefined)
      .then(runWorker)
      .then((output) => {
        if (output) {
          if (server) server.config.logger.info(output);
          else console.info(output);
        }
      });
    exportQueue = next;
    return next;
  };

  return {
    name: 'mte-level-geometry-export',
    buildStart() {
      return queueWorker();
    },
    configureServer(server) {
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      const onChange = (changedPath: string) => {
        if (!watchedSources.has(path.resolve(import.meta.dirname, changedPath))) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          void queueWorker(server).catch((error: unknown) => {
            server.config.logger.error(
              `[level-geometry-export] ${error instanceof Error ? error.message : String(error)}`,
            );
          });
        }, 200);
      };

      server.watcher.add([...watchedSources]);
      server.watcher.on('change', onChange);
      void queueWorker(server).catch((error: unknown) => {
        server.config.logger.error(
          `[level-geometry-export] ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      server.httpServer?.once('close', () => {
        server.watcher.off('change', onChange);
        if (debounceTimer) clearTimeout(debounceTimer);
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    levelGeometryExportPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'vendor-three';
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
