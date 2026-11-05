/** Ship PDF character maps and fallback fonts locally for complete text extraction. */
import { readdir, readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

export function pdfAssets(): Plugin {
  return {
    name: 'local-pdf-text-assets',
    apply: 'build',
    async buildStart() {
      for (const directory of ['cmaps', 'standard_fonts']) {
        const location = new URL(`../node_modules/pdfjs-dist/${directory}/`, import.meta.url);

        for (const filename of await readdir(location)) {
          this.emitFile({
            type: 'asset',
            fileName: `pdfjs/${directory}/${filename}`,
            source: await readFile(new URL(filename, location)),
          });
        }
      }
    },
  };
}
