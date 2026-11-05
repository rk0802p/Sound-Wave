# SOUNDWAVE – Jamendo‑Powered Neo‑Brutalist Music App

A full‑stack music discovery and playlist curation app using **Vue 3**, **Pinia**, **Node/Express**, **MongoDB**, and **Jamendo** as the sole music provider. The UI follows a neo‑brutalist design inspired by **Jellykit**.

## Live

- Frontend: https://music-playlist-pp8l.vercel.app
- Backend API: https://music-playlist-nine.vercel.app
- API health: https://music-playlist-nine.vercel.app/api/test
- Repo: https://github.com/rk0802p/Sound-Wave

## Features

- Collapsible neo‑brutalist sidebar with audio‑engine settings.
- Persistent HTML5 audio player (88 px) with scrubbable timeline, volume memory, repeat/shuffle, and queue.
- Playlist CRUD, song removal, playlist deletion, and community mixtape forking.
- Strict provider policy – only Jamendo streams (CC‑licensed) are allowed.
- JWT‑protected authentication and ownership enforcement.
- Full test coverage (183 backend tests) passing.

## Development

```bash
# Backend
cd server
npm install
cp .env.example .env
npm run dev

# Frontend
cd music-playlist-frontend-vue
npm install
npm run dev   # http://localhost:5173
```

## Build & Test

```bash
npm run build --prefix music-playlist-frontend-vue
npm test --prefix server
```

## Docs & Audits

All verification reports live in the `docs/` folder.

## License

ISC
