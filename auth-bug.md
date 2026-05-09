# Authentication and Authorization Workflow Bug Report

## Critical Issues

### 1. Inconsistent JWT Identity Handling
**Location:** `/server/routes/auth.py` (multiple locations)
**Issue:** Identity is stored as string during login/register (`identity=str(user.id)`) but token decoding handles both string and integer identities inconsistently.
**Impact:** Increased complexity and potential identity mismatch bugs.

### 2. Missing Token Revocation on Logout
**Location:** `/server/routes/auth.py` lines 204-208
**Issue:** Logout endpoint returns success but doesn't invalidate tokens (stateless JWT limitation not addressed).
**Impact:** Stolen tokens remain valid until expiration; no way to force logout all sessions.

### 3. Missing Rate Limiting on Auth Endpoints
**Location:** Auth routes (login, register, password reset)
**Issue:** No rate limiting on authentication endpoints.
**Impact:** Vulnerable to brute force attacks, account creation spam, and email flooding.

### 4. Admin Role Escalation Vulnerability
**Location:** `/server/routes/admin.py` lines 128-130
**Issue:** Admin user management allows modifying user roles without validation to prevent privilege escalation.
**Impact:** Regular admin could elevate own privileges or create super_admin accounts.

### 5. Insecure JWT Token Decoding Fallback
**Location:** `/server/routes/auth.py` lines 232-241
**Issue:** Token verification failure falls back to decoding without signature verification.
**Impact:** Potential acceptance of forged tokens if JWT configuration issues occur.

## Medium Priority Issues

### 6. Missing Last Login Tracking
**Location:** User model lacks `last_login_at` column
**Impact:** Cannot identify inactive users or implement login-based features.

### 7. Password Change Doesn't Invalidate Sessions
**Location:** `/server/routes/auth.py` lines 313-358
**Issue:** Changing password doesn't invalidate existing tokens.
**Impact:** Stolen tokens remain usable after password change until expiration.

### 8. Missing Account Lockout
**Location:** Login endpoint (line 94)
**Issue:** No account lockout after failed login attempts.
**Impact:** Vulnerable to brute force attacks.

### 9. Non-RESTful HTTP Status Codes
**Location:** `/server/routes/admin.py`
**Issue:** DELETE operations return 200 OK instead of 204 No Content.
**Impact:** Minor API inconsistency.

## Recommendations

### Immediate Fixes:
1. Standardize JWT identity handling (use integers consistently)
2. Implement token blacklisting or short expiration for better logout
3. Add rate limiting to auth endpoints (login/register/reset)
4. Add validation to prevent admin role escalation
5. Remove insecure JWT decoding fallback

### Additional Improvements:
6. Add last_login_at tracking to User model
7. Implement session invalidation on password/role changes
8. Add account lockout after failed attempts
9. Use proper HTTP status codes (204 for DELETE)