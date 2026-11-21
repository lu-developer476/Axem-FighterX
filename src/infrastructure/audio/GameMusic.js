import { STAGES } from '../assets/stageAssetManifest.js';

const AUDIO_MODULES = import.meta.glob(
  '../../../art/source/effects/music/*.{wav,ogg,mp3,m4a,aac,webm}',
  { eager: true, query: '?url', import: 'default' },
);

const FORMAT_PRIORITY = Object.freeze(['ogg', 'mp3', 'wav', 'm4a', 'aac', 'webm']);
const AUDIO_MIME = Object.freeze({
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  webm: 'audio/webm',
});

function normalizeTrackStem(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{3,}/g, '--')
    .replace(/^-|-$/g, '');
}

function parseAudioPath(path, url) {
  const filename = path.split('/').pop() ?? path;
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  return {
    stem: normalizeTrackStem(stem),
    filename,
    extension: dot > 0 ? filename.slice(dot + 1).toLowerCase() : '',
    url,
  };
}

export function selectPreferredAudioSource(sources, audioElement = null) {
  const ordered = [...sources].sort((a, b) =>
    FORMAT_PRIORITY.indexOf(a.extension) - FORMAT_PRIORITY.indexOf(b.extension),
  );
  if (!audioElement || typeof audioElement.canPlayType !== 'function') return ordered[0] ?? null;
  return ordered.find((source) => {
    const mime = AUDIO_MIME[source.extension];
    return mime && audioElement.canPlayType(mime) !== '';
  }) ?? ordered[0] ?? null;
}

function buildMusicCatalog(modules) {
  const groups = new Map();
  for (const [path, url] of Object.entries(modules)) {
    const source = parseAudioPath(path, url);
    if (!source.stem || !source.extension || typeof source.url !== 'string') continue;
    const group = groups.get(source.stem) ?? [];
    group.push(source);
    groups.set(source.stem, group);
  }

  const audioElement = typeof document !== 'undefined'
    ? document.createElement('audio')
    : null;

  return Object.freeze([...groups.entries()]
    .map(([stem, sources]) => {
      const selected = selectPreferredAudioSource(sources, audioElement);
      return Object.freeze({
        id: 'music-' + stem.replace(/--+/g, '-'),
        stem,
        filename: selected.filename,
        extension: selected.extension,
        url: selected.url,
      });
    })
    .sort((a, b) => a.stem.localeCompare(b.stem)));
}

export const MUSIC_TRACKS = buildMusicCatalog(AUDIO_MODULES);

function stageSpecificTracks(stageId, tracks = MUSIC_TRACKS) {
  const id = normalizeTrackStem(stageId).replace(/--+/g, '-');
  return tracks.filter((track) =>
    track.stem === id || track.stem.startsWith(id + '--'),
  ).sort((a, b) => {
    const aDefault = a.stem.endsWith('--default') ? 0 : 1;
    const bDefault = b.stem.endsWith('--default') ? 0 : 1;
    return aDefault - bDefault || a.stem.localeCompare(b.stem);
  });
}

function isMenuTrack(track) {
  return track.stem === 'menu' || track.stem.startsWith('menu--');
}

export function selectMenuMusicTrack(tracks = MUSIC_TRACKS) {
  const explicit = tracks.filter(isMenuTrack).sort((a, b) => a.stem.localeCompare(b.stem));
  if (explicit.length) return explicit[0];
  return tracks.find((track) => track.stem === 'mecha-collection') ?? tracks[0] ?? null;
}

export function selectStageMusicTrack(stageId, tracks = MUSIC_TRACKS) {
  const specific = stageSpecificTracks(stageId, tracks);
  if (specific.length) return specific[0];

  const stageIds = STAGES.map(({ id }) => id);
  const stageIndex = Math.max(0, stageIds.indexOf(stageId));
  const stageScoped = tracks.filter((track) =>
    stageIds.some((id) => {
      const normalized = normalizeTrackStem(id).replace(/--+/g, '-');
      return track.stem === normalized || track.stem.startsWith(normalized + '--');
    }),
  );
  const generic = tracks.filter((track) => !isMenuTrack(track) && !stageScoped.includes(track));
  if (generic.length) return generic[stageIndex % generic.length];
  return selectMenuMusicTrack(tracks);
}

export function getMenuMusicTrack() {
  return selectMenuMusicTrack()?.id ?? null;
}

export function getStageMusicTrack(stageId) {
  return selectStageMusicTrack(stageId)?.id ?? null;
}

let activeSound = null;
let activeKey = null;
let requestId = 0;

export function playMusic(scene, trackId) {
  const track = MUSIC_TRACKS.find((entry) => entry.id === trackId);
  if (!track || !scene?.sound || !scene?.load) return;
  if (activeKey === track.id && activeSound?.isPlaying) return;

  activeSound?.stop();
  activeSound?.destroy();
  activeSound = null;
  activeKey = track.id;
  const currentRequest = ++requestId;

  const startPlayback = () => {
    if (currentRequest !== requestId || !scene.sys.isActive()) return;
    if (!scene.cache.audio.exists(track.id)) {
      if (currentRequest === requestId) activeKey = null;
      return;
    }

    const sound = scene.sound.add(track.id, { loop: true, volume: 0.18 });
    activeSound = sound;
    const playWhenUnlocked = () => {
      if (currentRequest !== requestId || !scene.sys.isActive()) {
        sound.stop();
        sound.destroy();
        return;
      }
      sound.play();
    };

    if (scene.sound.locked) scene.sound.once('unlocked', playWhenUnlocked);
    else playWhenUnlocked();
  };

  if (scene.cache.audio.exists(track.id)) {
    startPlayback();
    return;
  }

  scene.load.once('complete', startPlayback);
  scene.load.once('loaderror', (file) => {
    if (file?.key === track.id && currentRequest === requestId) activeKey = null;
  });
  scene.load.audio(track.id, track.url);
  scene.load.start();
}

export function playMenuMusic(scene) {
  playMusic(scene, getMenuMusicTrack());
}

export function playStageMusic(scene, stageId) {
  playMusic(scene, getStageMusicTrack(stageId));
}
