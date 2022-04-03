import {
  defineConfig,
  splitVendorChunkPlugin,
} from 'vite'
import vue from '@vitejs/plugin-vue'
import {
  getConsts,
  getGitRevision,
  readFileAsync,
} from './utils';
import { resolve } from "path";
import { outputManifest } from './sw.plugin';
import { OutputChunk } from 'rollup';
import checker from 'vite-plugin-checker'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(async ({command, mode}) => {
  let key, cert, ca, gitHash;
  if (command === 'serve') {
    [key, cert, ca, gitHash] = await Promise.all([
      readFileAsync('./certs/private.key.pem'),
      readFileAsync('./certs/server.crt.pem'),
      readFileAsync('./certs/root.cr.pem'),
      getGitRevision()
    ]);
  } else {
    gitHash = await getGitRevision();
  }

  const PYCHAT_CONSTS = getConsts(gitHash, command);
  const srcDir = resolve(__dirname, '..', 'src');
  const distDir = resolve(__dirname, '..', 'dist');
  const nodeModulesDir = resolve(__dirname, '..', 'node_modules');
  const swFilePath = resolve(srcDir, 'ts', 'sw.ts');
  return {
    resolve: {
      alias: [
        {find: '@', replacement: srcDir},
      ],
    },
    ...(PYCHAT_CONSTS.PUBLIC_PATH ? {base: PYCHAT_CONSTS.PUBLIC_PATH} : null),
    root: srcDir,
    plugins: [
      vue(),
      checker({
          typescript: true,
          vueTsc: true,
          ...(command === 'serve' ? {eslint: {
            lintCommand: 'eslint --ext .ts,.vue --max-warnings=0 src',
          }}: null)
        }
      ),
      splitVendorChunkPlugin(),
      outputManifest({swFilePath}),
      viteStaticCopy({
        targets: [
          {
            src: `${resolve(nodeModulesDir, 'emoji-datasource-apple/img/apple/64')}/*`,
            dest: 'smileys'
          }
        ]
      })
    ],
    build: {
      emptyOutDir: true,
      assetsInlineLimit: 0,
      minify: !PYCHAT_CONSTS.IS_DEBUG,
      outDir: distDir,
      rollupOptions: {
        input: {
          index: resolve(srcDir, 'index.html'), //index should be inside src, otherwise vite won't return it by default
          sw: swFilePath,
        },
        output: {
          assetFileNames: (assetInfo) => {
            let dirName = '';
            if (/\.(mp3|wav)$/.test(assetInfo.name!)) {
              dirName = `sounds/`;
            } else if (/emoji-datasource-apple/.test(assetInfo.name!)) {
              dirName = `smileys/`;
            } else if (/((fonts?\/.*\.svg)|(\.(woff2?|eot|ttf|otf)))(\?.*)?/.test(assetInfo.name!)) {
              dirName = `font/`;
            } else if (/assets\/flags\/.*\.png$/.test(assetInfo.name!)) {
              dirName = `flags/`;
            } else if (/\.(png|jpg|svg|gif|ico)$/.test(assetInfo.name!)) {
              dirName = `img/`;
            } else if (/\.css$/.test(assetInfo.name!)) {
              dirName = `css/`;
            }
            return `${dirName}[name]-[hash].[ext]`
          },
          chunkFileNames(assetInfo: OutputChunk) {
            if (Object.keys(assetInfo.modules).find(a => a.indexOf('node_modules/spainter/') >= 0)) {
              return 'js/spainter-[hash].js'
            }
            if (assetInfo?.facadeModuleId && assetInfo.facadeModuleId.indexOf('node_modules/highlight.js') >= 0) {
              return 'js/highlightjs-[hash].js'
            }
            return 'js/[name]-[hash].js';
          },
          entryFileNames(assetInfo: OutputChunk) {
            if (assetInfo.facadeModuleId == swFilePath) {
              return 'sw.js';
            } else {
              return 'js/[name]-[hash].js';
            }
          },
        },
      },
    },
    server: {
      port: 8080,
      https: {
        key,
        cert,
        ca,
      },
    },
    define: {
      PYCHAT_CONSTS: JSON.stringify(PYCHAT_CONSTS)
    }
  }
});
