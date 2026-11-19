import availableFiles from 'virtual:sprite-sheets';
import {
  characterAnimationData,
  sheetFile,
  sheetTextureKey,
} from './characterAnimationData.js';

const base = import.meta.env.BASE_URL;
const available = new Set(availableFiles);

/**
 * Hojas de sprites declaradas en characterAnimationData que existen de verdad
 * en el proyecto (detectadas al compilar).
 * @returns {{ rangerId: string, state: string, key: string, url: string, frames: number, frameRate?: number }[]}
 */
export function listAvailableSheets() {
  const sheets = [];
  for (const [rangerId, data] of Object.entries(characterAnimationData)) {
    for (const [state, sheet] of Object.entries(data.sheets)) {
      const file = sheetFile(rangerId, state);
      if (!available.has(file)) continue;
      sheets.push({
        rangerId,
        state,
        key: sheetTextureKey(rangerId, state),
        url: `${base}assets/sprites/rangers/${file}`,
        frames: sheet.frames,
        frameRate: sheet.frameRate,
      });
    }
  }
  return sheets;
}
