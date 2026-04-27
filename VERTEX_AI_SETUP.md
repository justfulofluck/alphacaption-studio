# Vertex AI Integration Setup Guide

## What Was Changed

This project now uses **Google Cloud Vertex AI** (Gemini) for audio transcription with a service account.

### Architecture
- **Frontend**: React app uploads audio, creates project, and calls backend APIs
- **Backend**: Flask server handles transcription using Vertex AI with service account credentials
- **Authentication**: Service account JSON file (not exposed to frontend)

---

## Step 1: Place Your Service Account JSON

You should have received a JSON file from Google Cloud (service account key).

**Copy it to this location:**
```
server/credentials/vcaption-srt-key.json
```

**Important**: The `server/credentials/` folder is in `.gitignore` to prevent accidentally committing your private key.

---

## Step 2: Install Python Dependencies

```bash
cd server
pip install -r requirements.txt
```

This installs `google-cloud-aiplatform` which includes the Vertex AI SDK.

---

## Step 3: Verify GCP Configuration

Your `server/.env` file should contain:

```env
# Existing settings...
GCP_PROJECT_ID=vcaptiona-srt-494215
GCP_REGION=us-central1
GCP_CREDENTIALS_PATH=./credentials/vcaption-srt-key.json
```

If these are not set correctly, update them.

---

## Step 4: Enable Vertex AI API in GCP Console

1. Go to https://console.cloud.google.com/apis/library
2. Make sure you're in project **vcaptiona-srt-494215**
3. Search for **Vertex AI API**
4. Click **Enable** (if not already enabled)
5. Also enable **Cloud Storage API** (optional but recommended)

---

## Step 5: Grant Service Account Permissions

Your service account `vcaption-srt@vcaptiona-srt-494215.iam.gserviceaccount.com` needs the **Vertex AI User** role.

1. Go to https://console.cloud.google.com/iam-admin/iam
2. Find the service account in the list
3. If it doesn't have **Vertex AI User** (`roles/aiplatform.user`), click **GRANT ACCESS**
4. Add the role, save

---

## Step 6: Start the Backend Server

```bash
cd server
python app.py
```

The server will start on http://localhost:5000

**Test health:** Visit http://localhost:5000/api/health (should return `{"status":"healthy"}`)

---

## Step 7: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on http://localhost:3000

---

## Step 8: Verify Credentials

The first time you click **"Transcribe Audio"**, the server will:

1. Load service account JSON from `server/credentials/vcaption-srt-key.json`
2. Initialize Vertex AI with your project ID
3. Call Gemini to transcribe the uploaded audio

If credentials are invalid, you'll see an error in the browser alert and server console.

---

## How It Works (Flow)

```
1. User uploads audio file in UI
   ↓
   Frontend: POST /api/projects (multipart upload)
   ↓
   Backend: Saves file to server/uploads/, creates Project record
   ↓
   Frontend receives projectId

2. User clicks "Transcribe Audio (AI)"
   ↓
   Frontend: POST /api/captions/:id/transcribe
   ↓
   Backend: VertexService.transcribe(audio_path)
   ↓
   Vertex AI: Receives audio + prompt, returns JSON { language, transcript }
   ↓
   Backend: Updates project status, returns transcript to frontend
   ↓
   Frontend: Displays transcript in editor

3. User clicks "Auto-Detect Timings"
   ↓
   Frontend: POST /api/captions/:id/align { transcript }
   ↓
   Backend: VertexService.align_transcript(audio_path, transcript)
   ↓
   Vertex AI: Returns caption segments with timestamps
   ↓
   Backend: Saves segments to database
   ↓
   Frontend: Shows captions on waveform

4. User can edit segments manually, then "Export SRT"
   ↓
   Frontend downloads .srt file
```

---

## Environment Variables Reference

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (server/.env)
```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=alphacaption

GCP_PROJECT_ID=vcaptiona-srt-494215
GCP_REGION=us-central1
GCP_CREDENTIALS_PATH=./server/credentials/vcaption-srt-key.json

FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:5000
```

---

## Model Configuration

The Vertex AI model used is configurable via environment variable `GEMINI_MODEL`.

Default: `gemini-1.5-pro-001`

To change, add to `server/.env`:
```env
GEMINI_MODEL=gemini-2.0-flash-exp
```

Available models in Vertex AI (check Model Garden in GCP Console):
- `gemini-1.5-pro-001` (high quality, recommended)
- `gemini-1.5-flash-001` (faster, cheaper)
- `gemini-2.0-flash-exp` (latest, experimental)

---

## Troubleshooting

### Error: "Credentials file not found"
- Ensure `server/credentials/vcaption-srt-key.json` exists
- Check path in `GCP_CREDENTIALS_PATH` is correct relative to server directory

### Error: "GCP_PROJECT_ID not configured"
- Add `GCP_PROJECT_ID` to `server/.env`

### Error: "Vertex AI API has not been used before"
- Enable Vertex AI API in GCP Console
- Wait 1-2 minutes after enabling

### Error: "Permission denied" or "403"
- Service account needs **Vertex AI User** role
- Go to IAM → grant role to service account

### Audio upload fails (413/Request Entity Too Large)
- Increase `MAX_CONTENT_LENGTH` in `server/config.py`
- Or reduce audio file size (recommended max: 20MB for Gemini 1.5 Pro)

### Transcription returns empty transcript
- Check that audio file contains clear speech
- Try a shorter audio clip (< 1 min) to test
- Check server logs for errors from Vertex AI

### CORS errors
- Backend already has CORS enabled for all origins
- Ensure frontend is running on port 3000 (or update FRONTEND_URL in server .env)

---

## Notes

- **No API keys in frontend**: The Gemini API key is never exposed to the browser.
- **Service account security**: Keep `vcaption-srt-key.json` secret; never commit it.
- **Cost**: Vertex AI charges per minute of audio processed. Monitor usage in GCP Billing Console.
- **Audio length**: Gemini 1.5 Pro supports up to ~2 hours of audio per request (context window), but practical limits apply.

---

## Next Steps (Optional Improvements)

1. **Add project selection** from dashboard (currently only new projects work)
2. **Implement GCS integration**: Store audio files in Google Cloud Storage instead of local server
3. **Add transcription progress indicator** (status polling)
4. **Support batch transcription** (multiple files)
5. **Add user feedback** for Vertex AI errors (better error messages)
6. **Add model selector UI** (if multiple models enabled in GCP)
7. **Implement automatic retry** on quota errors

---

**You're all set!** Start the servers and transcribe some audio.
