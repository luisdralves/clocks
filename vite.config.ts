import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function getClockFolders(): string[] {
  const clocksDir = resolve(__dirname, 'src/clocks');
  if (!existsSync(clocksDir)) return [];

  return readdirSync(clocksDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function generateSitemap(siteUrl: string | undefined): Plugin {
  return {
    name: 'generate-sitemap',
    apply: 'build',
    closeBundle() {
      if (!siteUrl) {
        console.warn('VITE_SITE_URL not set, skipping sitemap and robots.txt generation');
        return;
      }

      const distDir = resolve(__dirname, 'dist');
      const clocks = getClockFolders();
      const baseUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash

      const urls = [
        { loc: `${baseUrl}/`, priority: '1.0' },
        ...clocks.map((clock) => ({
          loc: `${baseUrl}/${clock}/`,
          priority: '0.8',
        })),
      ];

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

      writeFileSync(join(distDir, 'sitemap.xml'), sitemap);

      const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
      writeFileSync(join(distDir, 'robots.txt'), robotsTxt);

      console.log(`Generated sitemap.xml and robots.txt for ${baseUrl}`);
    },
  };
}

function moveClockPages(): Plugin {
  const clockNames = getClockFolders();

  return {
    name: 'move-clock-pages',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || '';

        for (const clockName of clockNames) {
          if (url.startsWith(`/${clockName}/`) || url === `/${clockName}`) {
            const suffix = url.slice(`/${clockName}`.length) || '/';
            req.url = `/src/clocks/${clockName}${suffix === '/' ? '/index.html' : suffix}`;
            break;
          }
        }
        next();
      });
    },
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const srcClocksDir = join(distDir, 'src', 'clocks');

      const clocks = readdirSync(srcClocksDir);

      for (const clock of clocks) {
        const clockSrcDir = join(srcClocksDir, clock);
        const clockDestDir = join(distDir, clock);

        if (!statSync(clockSrcDir).isDirectory()) continue;

        mkdirSync(clockDestDir, { recursive: true });

        function copyDir(src: string, dest: string) {
          const entries = readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = join(src, entry.name);
            const destPath = join(dest, entry.name);
            if (entry.isDirectory()) {
              mkdirSync(destPath, { recursive: true });
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          }
        }

        copyDir(clockSrcDir, clockDestDir);
      }

      rmSync(join(distDir, 'src'), { recursive: true, force: true });
    },
  };
}

export const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), moveClockPages(), generateSitemap(env.VITE_SITE_URL)],
    server: {
      allowedHosts: true,
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          ...Object.fromEntries(
            getClockFolders().map((clock) => [
              clock,
              resolve(__dirname, `src/clocks/${clock}/index.html`),
            ]),
          ),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@lib': resolve(__dirname, 'src/lib'),
      },
    },
    assetsInclude: ['**/*.glsl'],
  };
});

export default config;
