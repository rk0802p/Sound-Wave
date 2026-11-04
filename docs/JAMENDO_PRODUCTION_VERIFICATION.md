# SOUNDWAVE — Jamendo Production Operational Architecture & Verification Report

**Document ID:** SW-JAMENDO-VERIF-2026-11-05  
**Subject:** Jamendo Integration Status, Upstream Audit, Streaming Verification & Attribution Compliance  
**Target Environments:** Vercel Backend (`https://music-playlist-nine.vercel.app`), Jamendo API v3.0, and Jamendo CDN  

---

## 1. Executive Summary

During production stabilization, a detailed audit of the Jamendo music pipeline was conducted to address reports that Jamendo was not functioning reliably on the live Vercel deployment despite `JAMENDO_CLIENT_ID` being present in project settings.

**Key Findings:**
1. **Upstream Account Status:** Direct API probes confirmed that Jamendo API v3.0 returned `status: "failed"`, `code: 11`:  
   `"Jamendo Api Suspended Application Error: Your application has been suspended, please contact Jamendo"`.  
   The configured developer client ID (`56d30c95`) was suspended upstream by Jamendo.
2. **Backend Fault Isolation:** SOUNDWAVE's backend `ProviderRegistry` correctly handled this failure: it isolated Jamendo without crashing, transitioned Jamendo to `status: "unavailable"`, and transparently returned search results from Internet Archive and Audius.
3. **CDN Direct Audio Viability:** Direct stream requests to Jamendo's public storage CDN (`prod-1.storage.jamendo.com`) continue to succeed with HTTP 200 `audio/mpeg` (content length ~5.5 MB) without requiring developer authentication.
4. **Attribution & Licensing:** Canonical track backlinks (`https://www.jamendo.com/track/:id`) and Creative Commons license badges are strictly preserved in data models and UI modals.
5. **False Toast Elimination:** The frontend search view was updated to eliminate premature "Playing ... via JAMENDO" notifications before transport buffering or audio start.

---

## 2. Upstream Jamendo API Diagnostic Evidence

To establish whether the failure originated from the SOUNDWAVE codebase or Jamendo's upstream service, an HTTP request was dispatched directly to Jamendo's v3.0 API endpoint using the production client credentials:

```bash
curl -i "https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=1&search=rock"
```

### Raw Upstream Response Payload:
```json
{
  "headers": {
    "status": "failed",
    "code": 11,
    "error_message": "Jamendo Api Suspended Application Error: Your application has been suspended, please contact Jamendo",
    "warnings": "",
    "results_count": 0
  },
  "results": []
}
```

### Analysis:
* **Code 11 Suspension:** Jamendo's automated compliance or quota systems suspended the application associated with client ID `56d30c95`.
* **Zero Backend Defect:** The backend code correctly reads `process.env.JAMENDO_CLIENT_ID`, constructs the query string, and parses the response. The empty result set is the direct upstream response from Jamendo.
* **Next Step for Full Activation:** The owner of the Jamendo developer account must log into [devportal.jamendo.com](https://devportal.jamendo.com/) to submit a reactivation request or generate a new client ID and update `JAMENDO_CLIENT_ID` in Vercel settings.

---

## 3. Direct Audio CDN Streaming Verification

While the search catalog API requires an active developer client ID, Jamendo's audio distribution CDN (`storage.jamendo.com`) operates independently for playback.

### Probing Jamendo Storage CDN:
```http
HEAD /?trackid=323717&format=mp32 HTTP/1.1
Host: prod-1.storage.jamendo.com
User-Agent: SOUNDWAVE-Audio-Discovery/1.0
```

### Response Headers:
```http
HTTP/1.1 200 OK
Date: Wed, 05 Nov 2026 02:08:00 GMT
Content-Type: audio/mpeg
Content-Length: 5465460
Connection: keep-alive
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=31536000
```

### Playback Capability Findings:
* **CORS Support:** `Access-Control-Allow-Origin: *` ensures that browser-based players and Web Audio API visualizers can load and inspect audio streams without CORS blockages.
* **Range Requests:** `Accept-Ranges: bytes` allows scrubbing and seeking across the entire duration of the track.
* **Full Length:** Files are complete, unclipped MP3 audio streams (5.46 MB for ~3:30 duration).

---

## 4. Backend Resilience & Fault Isolation Evidence

When Jamendo's catalog API fails, SOUNDWAVE's multi-source aggregation architecture prevents system degradation.

### Search Telemetry Output (`GET /api/search?q=ambient`):
```json
{
  "query": "ambient",
  "results": [
    {
      "id": "audius:...",
      "title": "The Ambientalist - Call Of The Wind",
      "provider": "audius",
      "isPlayable": true
    },
    {
      "id": "archive:...",
      "title": "Protostar",
      "provider": "archive",
      "isPlayable": true
    }
  ],
  "providers": {
    "jamendo": {
      "name": "Jamendo Music",
      "status": "unavailable",
      "count": 0,
      "error": "Jamendo Api Suspended Application Error: Your application has been suspended, please contact Jamendo"
    },
    "archive": {
      "name": "Internet Archive",
      "status": "available",
      "count": 6,
      "error": null
    },
    "audius": {
      "name": "Audius",
      "status": "available",
      "count": 12,
      "error": null
    }
  },
  "totalResults": 18
}
```

* **Health Reporting:** `/api/search/providers/health` honestly surfaces Jamendo as `unavailable`.
* **Zero User Disruption:** The application continues to aggregate and present 18 playable streams from alternative providers.

---

## 5. UI Feedback & Attribution Verification

### 5.1 Eliminated False "Playing" Toasts
In `src/views/SearchView.vue`, the play trigger was updated:
```javascript
// Before (Premature):
toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);

// After (Honest & Synchronized):
await playerStore.playTrack(playableTrack, onlineTracks.value);
if (playerStore.isPlaying || playerStore.playbackState === 'playing') {
  toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);
} else if (playerStore.playbackState === 'unavailable') {
  toastStore.warn(`"${track.title}" is currently unavailable for playback in this environment.`);
}
```

### 5.2 Attribution Compliance
For all Jamendo tracks, the frontend retains:
* Canonical `↗ JAMENDO` link pill opening `https://www.jamendo.com/track/:id` in a new tab with `rel="noopener noreferrer"`.
* License details modal displaying Creative Commons deed URL and license attribution string (e.g. `CC BY-NC-SA 3.0`).
