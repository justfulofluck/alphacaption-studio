# AlphaCaption Studio - Backend API

Flask + MySQL backend for AlphaCaption Studio.

## Setup

### 1. Install Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SECRET_KEY=your-secure-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=alphacaption

GEMINI_API_KEY=your-google-gemini-api-key
```

### 3. Create MySQL Database

```sql
CREATE DATABASE alphacaption CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Server

```bash
python app.py
```

Server runs on http://localhost:5000

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project (with audio file) |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Captions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/captions/:id/transcribe` | Transcribe audio |
| POST | `/api/captions/:id/align` | Align transcript with audio |
| GET | `/api/captions/:id` | Get captions |
| PUT | `/api/captions/:id` | Update captions |
| POST | `/api/captions/:id/sync` | Re-sync captions |
| GET | `/api/captions/:id/export` | Export as SRT |

## API Usage Examples

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "John"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Create Project with Audio
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@audio.mp3" \
  -F "name=My Podcast"
```

### Transcribe
```bash
curl -X POST http://localhost:5000/api/captions/1/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Align Captions
```bash
curl -X POST http://localhost:5000/api/captions/1/align \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Hello world, this is a test."}'
```

### Export SRT
```bash
curl -O http://localhost:5000/api/captions/1/export \
  -H "Authorization: Bearer YOUR_TOKEN"
```
