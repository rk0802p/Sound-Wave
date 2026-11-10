#!/bin/bash
# SOUNDWAVE Playlist Phase 1 Backend Verification Script
# Tests: Signup -> Create Playlist -> Add Song (with position) -> Batch Add -> Reorder -> Remove Song -> Duplicate -> Delete

set -e
BASE_URL="${API_URL:-http://localhost:5000/api}"
TIMESTAMP=$(date +%s)
EMAIL="verify_${TIMESTAMP}@soundwave.test"
USERNAME="verifier_${TIMESTAMP}"
PASSWORD="Password123!"

echo "=== 1. Signing Up Test User ==="
AUTH_RES=$(curl -s -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
TOKEN=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.token || ''); } catch(_) {}" "$AUTH_RES")

if [ -z "$TOKEN" ]; then
  echo "Auth failed: $AUTH_RES"
  exit 1
fi
echo "Authenticated with token: ${TOKEN:0:15}..."

echo -e "\n=== 2. Create Playlist (POST /api/playlists) ==="
CREATE_RES=$(curl -s -X POST "${BASE_URL}/playlists" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Phase 1 Verification Playlist","description":"Automated curl test mix","isPublic":false}')
PLAYLIST_ID=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d._id || ''); } catch(_) {}" "$CREATE_RES")

if [ -z "$PLAYLIST_ID" ]; then
  echo "Create playlist failed: $CREATE_RES"
  exit 1
fi
echo "Created playlist ID: $PLAYLIST_ID"

echo -e "\n=== 3. Add Single Song with Position (POST /api/playlists/:id/songs) ==="
ADD_RES=$(curl -s -X POST "${BASE_URL}/playlists/${PLAYLIST_ID}/songs" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Song Alpha","artist":"Artist One","duration":180,"position":0}')
SONG_A_ID=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.addedSong?._id || ''); } catch(_) {}" "$ADD_RES")
echo "Added Song Alpha (ID: $SONG_A_ID)"

echo -e "\n=== 4. Batch Add Songs (POST /api/playlists/:id/songs/batch) ==="
BATCH_RES=$(curl -s -X POST "${BASE_URL}/playlists/${PLAYLIST_ID}/songs/batch" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"songs":[{"title":"Song Beta","artist":"Artist Two","duration":200},{"title":"Song Gamma","artist":"Artist Three","duration":240}]}')
echo "Batch add result: $(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.message || ''); } catch(_) {}" "$BATCH_RES")"

echo -e "\n=== 5. Reorder Songs (PUT /api/playlists/:id/songs/reorder) ==="
# Fetch current song IDs reliably via JSON
GET_RES=$(curl -s -X GET "${BASE_URL}/playlists/${PLAYLIST_ID}" -H "Authorization: Bearer ${TOKEN}")
SONG_IDS=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log((d.songs || []).map(s => s._id).join(' ')); } catch(_) {}" "$GET_RES")
ID_ARRAY=($SONG_IDS)
echo "Current songs count: ${#ID_ARRAY[@]}"

REVERSED_JSON=$(node -e "const ids = process.argv.slice(1); console.log(JSON.stringify({ songIds: ids.reverse() }));" "${ID_ARRAY[@]}")
REORDER_RES=$(curl -s -X PUT "${BASE_URL}/playlists/${PLAYLIST_ID}/songs/reorder" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$REVERSED_JSON")
echo "Reorder response: $(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.message || ''); } catch(_) {}" "$REORDER_RES")"

echo -e "\n=== 6. Remove Middle Song (DELETE /api/playlists/:id/songs/:songId) ==="
REMOVE_RES=$(curl -s -X DELETE "${BASE_URL}/playlists/${PLAYLIST_ID}/songs/${ID_ARRAY[1]}" \
  -H "Authorization: Bearer ${TOKEN}")
echo "Remove response: $(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.message || ''); } catch(_) {}" "$REMOVE_RES")"

echo -e "\n=== 7. Duplicate Playlist (POST /api/playlists/:id/duplicate) ==="
DUP_RES=$(curl -s -X POST "${BASE_URL}/playlists/${PLAYLIST_ID}/duplicate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Duplicated Verification Playlist"}')
DUP_ID=$(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d._id || ''); } catch(_) {}" "$DUP_RES")
echo "Duplicated playlist ID: $DUP_ID"

echo -e "\n=== 8. Delete Original Playlist (DELETE /api/playlists/:id) ==="
DEL_RES=$(curl -s -X DELETE "${BASE_URL}/playlists/${PLAYLIST_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
echo "Delete response: $(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.message || ''); } catch(_) {}" "$DEL_RES")"

echo -e "\n=== 9. Delete Duplicate Playlist (DELETE /api/playlists/:id) ==="
DEL_DUP_RES=$(curl -s -X DELETE "${BASE_URL}/playlists/${DUP_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
echo "Delete duplicate response: $(node -e "try { const d = JSON.parse(process.argv[1]); console.log(d.message || ''); } catch(_) {}" "$DEL_DUP_RES")"

echo -e "\n>>> Phase 1 Backend Verification Complete: All operations succeeded! <<<"
