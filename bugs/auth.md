# Authentication Flow - Bug Report

**Project**: AlphaCaption Studio
**Date**: 2026-04-25
**Scope**: Frontend (React/TypeScript) -> Backend (Flask/Python) -> Database (MySQL)

## CRITICAL BUGS

### 1. Frontend Redirect Bypass (LoginPage & SignupPage) [FIXED]
**Location**: frontend/src/components/LoginPage.tsx (lines 9-14), frontend/src/components/SignupPage.tsx (lines 9-14)

**Issue**: Token existence check has no backend validation. Any string stored in auth_token (even non-JWT) bypasses login.

**Fix**: Call /api/auth/me to validate token with backend before redirecting.

### 2. Race Condition in Registration OTP Flow
**Location**: frontend/src/components/AuthPage.tsx (lines 84-130)

**Issue**: Two-step signup has fragile state management. No lock preventing multiple concurrent OTP requests.

**Fix**: Add request-level locking before making OTP requests.

### 3. OTP Email Delivery Fail
**Location**: backend/server/routes/auth.py (lines 38-46)

**Issue**: OTP email sent via background thread. If email fails, client never receives email.

**Fix**: Track OTP delivery status or use synchronous send with error feedback.

### 4. Password Bypass on Second Registration Request
**Location**: backend/server/routes/auth.py (lines 91-115)

**Issue**: Password length validated on first request, NOT re-validated on second request.

**Fix**: Re-validate password length on second request before db.session.commit().

### 5. OTP Brute Force Vulnerability
**Location**: backend/server/routes/auth.py (lines 48-63)

**Issue**: No rate limiting on OTP verification. 6-digit OTP = 1M combinations.

**Fix**: Add rate limiting per (email,purpose) - max 10 attempts per 5 minutes.

### 6. Multiple Unverified OTPs Active
**Location**: backend/server/routes/auth.py

**Issue**: When user requests new OTP, old unverified OTPs remain valid.

**Fix**: Invalidate all previous unverified OTPs when generating new one.

## HIGH SEVERITY

### 7. Case-Sensitive Email Uniqueness
**Location**: backend/server/models/user.py (line 9)

**Issue**: MySQL unique constraint on email is case-sensitive.

### 8. Frontend Profile Missing Mobile Field Load
**Location**: frontend/src/components/ProfileSettings.tsx (lines 49-53)

**Issue**: mobile field never populated on fetch.

### 9. Confirm Password Field Sent to Backend
**Location**: frontend/src/components/signup-form.tsx (line 88)

**Issue**: confirmPassword field sent in API request.

### 10. Info Message Doesnt Clear on Error
**Location**: frontend/src/components/ResetPasswordForm.tsx

**Issue**: Success info not cleared on error.

## Summary

Total: 12 bugs identified
- CRITICAL: 6
- HIGH: 3
- LOW: 3

### Priority Fixes (P0):
1. Fix redirect bypass - add /api/auth/me validation [DONE]
2. Add OTP rate limiting
3. Invalidate old OTPs on new OTP generation
4. Re-validate password length on registration completion
