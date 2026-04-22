# AlphaCaption Studio - Authentication Documentation

## Overview

This document describes the authentication system for AlphaCaption Studio, including API endpoints, flow, error handling, and security measures.

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│  MySQL DB   │
│  (React)    │◀────│  (Flask)    │◀────│  (Users)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ LocalStorage│     │  JWT Token  │
│  (token)    │     │  (24 hours) │
└─────────────┘     └─────────────┘
```

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get current user |
| PUT | `/api/auth/me` | ✅ | Update profile |
| POST | `/api/auth/change-password` | ✅ | Change password |

---

## Request/Response Format

### Register
**Request:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "credits": 10,
    "created_at": "2024-01-01T00:00:00"
  },
  "token": "eyJhbGciOiJIUzI1..."
}
```

### Login
**Request:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "credits": 10
  },
  "token": "eyJhbGciOiJIUzI1..."
}
```

### Get Current User
**Request:**
```json
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "credits": 10,
  "created_at": "2024-01-01T00:00:00"
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|----------------|
| 400 | Bad Request | Missing fields, invalid format |
| 401 | Unauthorized | Invalid credentials, expired token |
| 404 | Not Found | User not found |
| 409 | Conflict | Email already exists |

### Error Codes

| Error Message | Status Code | Cause |
|---------------|-------------|-------|
| `No data provided` | 400 | Empty request body |
| `Email and password are required` | 400 | Missing email or password |
| `Password must be at least 6 characters` | 400 | Password too short |
| `Email already registered` | 409 | Duplicate email |
| `Invalid email or password` | 401 | Wrong credentials |
| `Current password is incorrect` | 401 | Wrong current password |
| `New password must be at least 6 characters` | 400 | New password too short |
| `User not found` | 404 | User ID doesn't exist |

---

## Security Measures

### 1. Password Hashing
- Uses `bcrypt` for password hashing
- Passwords are never stored in plain text
- Salt is automatically generated

```python
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
```

### 2. JWT Authentication
- Token expires in 24 hours
- Token contains user ID as identity
- Stored in localStorage on client

```python
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
```

### 3. Input Validation
- Email is normalized (lowercase, trimmed)
- Password minimum 6 characters
- Input sanitization

### 4. CORS Configuration
- Only API routes are exposed
- All origins allowed (`*`)

---

## Frontend Integration

### Storing Token
```typescript
// After login
localStorage.setItem('token', response.data.token);
```

### Using Token
```typescript
// API client automatically adds token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Logout
```typescript
localStorage.removeItem('token');
window.location.href = '/login';
```

---

## Known Issues & Limitations

### 1. No Email Verification
- Users can register without verifying email
- No password reset flow implemented

### 2. No Refresh Token
- Only access token (24 hours)
- User needs to re-login after expiration

### 3. No Rate Limiting
- Vulnerable to brute force attacks
- Consider adding Flask-Limiter

### 4. CORS Allows All Origins
- Security risk for production
- Should restrict to frontend domain

---

## Recommendations for Production

### 1. Add Email Verification
```python
- Send verification email on registration
- Add `email_verified` field to User model
- Require verification before login
```

### 2. Add Password Reset
```python
- Generate reset token
- Send reset link via email
- Expire token after 1 hour
```

### 3. Add Refresh Token
```python
- Implement refresh token endpoint
- Store refresh token in httpOnly cookie
- Extend session duration
```

### 4. Add Rate Limiting
```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address)
limiter.limit("5 per minute")(auth_bp)
```

### 5. Restrict CORS
```python
CORS(app, resources={r"/api/*": {"origins": "https://yourdomain.com"}})
```

---

## File Structure

```
server/
├── app.py                    # Flask app with JWT config
├── config.py                 # JWT settings
├── models/
│   └── user.py              # User model
└── routes/
    └── auth.py              # Auth endpoints
```

---

## Testing Auth Endpoints

### Using curl

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Get current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

---

## Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    plan VARCHAR(20) DEFAULT 'free',
    credits INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
