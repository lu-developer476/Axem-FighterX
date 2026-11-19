import { characterAnimationData, sheetFile, sheetTextureKey } from './characterAnimationData.js';

// Hojas de sprites opcionales: art/source/<ranger>/<estado>.png
const sheetFiles = import.meta.glob('/art/source/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PREFIX = '/art/source/';
const available = new Map(
  Object.entries(sheetFiles).map(([path, url]) => [path.slice(PREFIX.length), url]),
);

/**
 * Hojas de sprites declaradas en characterAnimationData que existen de verdad
 * en el proyecto (detectadas al compilar).
 * @returns {{ rangerId: string, state: string, key: string, url: string, frames: number,
 *             frameRate?: number, nativeSize?: { width: number, height: number } }[]}
 */
export function listAvailableSheets() {
  const sheets = [];
  for (const [rangerId, data] of Object.entries(characterAnimationData)) {
    for (const [state, sheet] of Object.entries(data.sheets)) {
      const url = available.get(sheetFile(rangerId, state));
      if (!url) continue;
      sheets.push({
        rangerId,
        state,
        key: sheetTextureKey(rangerId, state),
        url,
        frames: sheet.frames,
        frameRate: sheet.frameRate,
        nativeSize: sheet.nativeSize,
      });
    }
  }
  return sheets;
}
