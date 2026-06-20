# VoiceDraft

VoiceDraft is a mobile-first, offline-capable PWA for recording voiceovers in
small clips while keeping a script visible. Clips are stored locally, can be
trimmed or replayed, and export as one WAV file.

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Storage and privacy

- Scripts and settings use `localStorage`.
- Audio clips use IndexedDB.
- Recording, trimming, playback, and WAV export run entirely in the browser.
- There is no backend, account, analytics, or cloud sync.

## Deployment

Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
