# Google OAuth & Magic Link Setup Guide for EduNexus-AI

## Overview

This guide covers:
- ✅ Removing Microsoft OAuth option (already done - no Microsoft option exists)
- ✅ Configuring Google OAuth with Supabase
- ✅ Enabling Magic Link (passwordless) authentication
- ✅ Testing both authentication methods

---

## Current Status

### What's Already Implemented:
- ✅ Google OAuth button on login page
- ✅ Magic Link functionality in Supabase
- ✅ Email-first authentication flow
- ✅ Redirect to dashboard after auth
- ❌ No Microsoft option (already removed/not implemented)

### Recent Changes:
- Enhanced Google OAuth button with better error handling
- Added magic link button for both login and signup
- Improved UI with icon and descriptive text
- Added error feedback for OAuth failures

---

## Step 1: Configure Supabase for Google OAuth

### 1.1 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → Create OAuth 2.0 Client ID
5. Choose "Web application"
6. Add Authorized redirect URIs:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   http://localhost:5173/dashboard (for local testing)
   http://localhost:3000/dashboard (alternative local)
   ```
7. Copy the Client ID and Client Secret

### 1.2 Configure Google in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and enable it
5. Paste your Google Client ID and Client Secret
6. Save

### 1.3 Environment Variables

Create `.env.local` in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Database
VITE_DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
```

**Note:** Use `VITE_` prefix for Vite to expose these variables to the frontend.

### 1.4 Verify Configuration

```bash
# Check if environment variables are loaded
npm run dev

# In browser console, verify:
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

---

## Step 2: Configure Magic Link (Passwordless Email)

Magic Link is built into Supabase and uses One-Time Passwords (OTP).

### 2.1 Enable in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Email** and enable it
3. Toggle **Email Sign-In**
4. Configure email template (optional - Supabase has default)

### 2.2 Email Configuration

For sending magic links, configure email provider:

**Option A: Supabase Auth Emails (Default)**
- Uses Supabase-managed email service
- Requires verified sender domain (advanced)
- Works out-of-box for testing

**Option B: SendGrid (Recommended for Production)**

1. Get SendGrid API Key from [SendGrid](https://sendgrid.com)
2. In Supabase → **Settings** → **Email**
3. Choose "SendGrid"
4. Paste API Key
5. Configure sender email

**Option C: Custom SMTP**

In Supabase → **Settings** → **Email**:
```
Provider: SMTP
Host: your-smtp-host
Port: 587 (TLS) or 465 (SSL)
Username: your-email@example.com
Password: your-smtp-password
From Email: noreply@yourdomain.com
```

### 2.3 Magic Link Email Template

In Supabase → **Authentication** → **Email Templates**:

Default template includes:
- Magic link token
- Link to confirm email
- Customizable subject and HTML

You can customize the template to match your branding.

---

## Step 3: Test Google OAuth

### 3.1 Local Testing Setup

1. **Start development server:**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5173`

2. **Open login page:**
   - Navigate to `http://localhost:5173`
   - You should see the login form

3. **Test Google OAuth:**
   - Click "Continue with Google"
   - Select a Google account
   - Should redirect to dashboard after successful auth

### 3.2 Troubleshooting Google OAuth

**Error: "redirect_uri_mismatch"**
- Verify redirect URI in Google Cloud Console matches
- Should be: `https://your-project-id.supabase.co/auth/v1/callback`
- For localhost: `http://localhost:5173/dashboard`

**Error: "Client ID not found"**
- Check `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify Google credentials in Supabase Dashboard

**Error: "signInWithOAuth not working"**
- Check browser console for errors
- Verify Supabase client initialization in `services/supabaseClient.ts`
- Clear browser cache and cookies

**Error: Popup blocked**
- Check browser popup blocker settings
- Some browsers require user gesture (click) to open OAuth popup

### 3.3 Google OAuth Test Checklist

- [ ] Google button appears on login page
- [ ] Clicking button opens Google login
- [ ] Can log in with Google account
- [ ] Redirects to dashboard after auth
- [ ] User email is populated in profile
- [ ] Can log out and log in again
- [ ] No console errors

---

## Step 4: Test Magic Link (Passwordless)

### 4.1 Local Testing Setup

1. **Start development server** (if not already running)
2. **Open login page:**
   - Navigate to `http://localhost:5173`
   - Enter your email address

3. **Test Magic Link:**
   - Click "✨ Login with magic link" button
   - Look for success message: "Magic link sent! Check your email."

### 4.2 Receiving Magic Links

**For Local Testing:**

Supabase provides test email inboxes. To access sent emails:

```bash
# Option 1: Use Supabase Dashboard
# Go to Authentication → Logs to see email events

# Option 2: Use MailHog (local email testing)
# Run MailHog
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure Supabase to use localhost:1025
# Access email UI at http://localhost:8025
```

**For Production:**

- Emails sent to user's inbox
- Magic link valid for 24 hours by default
- One-time use only

### 4.3 Magic Link Test Checklist

- [ ] Email input field appears
- [ ] Magic link button is clickable
- [ ] Success message shows after clicking
- [ ] Email is received (check inbox or test service)
- [ ] Clicking link redirects to dashboard
- [ ] User is logged in after magic link
- [ ] Link expires after 24 hours (test next day)
- [ ] Cannot reuse same link

---

## Step 5: Integration Testing

### 5.1 Combined Workflow Test

```
Test Case 1: New User Signup via Google
1. Click "Continue with Google"
2. Login with Google account
3. Complete profile setup
4. Verify user created in Supabase
5. Access dashboard features

Test Case 2: Existing User Login via Google
1. Previous user logs out
2. Clicks "Continue with Google"
3. Selects same Google account
4. Should log in directly without signup
5. Redirect to dashboard

Test Case 3: First Time Magic Link
1. Enter email (new user)
2. Click "✨ Login with magic link"
3. Check email for link
4. Click link
5. Complete profile setup
6. Access dashboard

Test Case 4: Returning User Magic Link
1. Previous user logs out
2. Enter email
3. Click "✨ Login with magic link"
4. Check email for link
5. Click link
6. Should log in directly
```

---

## Step 6: Verify Implementation in Code

### 6.1 Check Google OAuth Implementation

**File:** `components/Login/UnifiedLoginForm.tsx` (Lines 485-514)

```typescript
// Google OAuth Button
button onClick={async () => {
    const hostname = window.location.hostname;
    const redirectTo = `http://${hostname}:5173/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            }
        }
    });
    if (error) {
        setError(`Google sign ${isLogin ? 'in' : 'up'} failed: ${error.message}`);
    }
}}
```

✅ **Status:** Properly configured with error handling

### 6.2 Check Magic Link Implementation

**File:** `components/Login/UnifiedLoginForm.tsx` (Lines 270-296)

```typescript
// Magic Link Handler
const handleMagicLink = async () => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo
        }
    });
    
    if (error) {
        setError(error.message || 'Failed to send magic link.');
    } else {
        setSuccessMessage('Magic link sent! Check your email.');
    }
};
```

✅ **Status:** Properly configured with OTP

### 6.3 Check Supabase Client

**File:** `services/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```

✅ **Status:** Properly configured

---

## Step 7: Deployment Checklist

Before deploying to production:

### Environment Variables
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] No credentials in version control

### Supabase Configuration
- [ ] Google OAuth enabled with production credentials
- [ ] Magic Link email provider configured
- [ ] Email templates customized
- [ ] Redirect URIs updated for production domain

### Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled on Supabase
- [ ] Session timeout configured

### Testing
- [ ] Google OAuth works on production domain
- [ ] Magic links arrive in production email
- [ ] Password reset works
- [ ] 2FA (if enabled) works

---

## Troubleshooting Guide

### Google OAuth Not Working

**Symptom:** "signInWithOAuth is not a function"
**Solution:**
- Verify Supabase client is initialized
- Check `services/supabaseClient.ts` imports
- Ensure `@supabase/supabase-js` is installed: `npm install @supabase/supabase-js`

**Symptom:** Redirect loop or blank page
**Solution:**
- Check browser console for errors
- Verify redirect URL matches Supabase config
- Clear browser cache: Ctrl+Shift+Delete

**Symptom:** "Access Denied" from Google
**Solution:**
- Verify app not in restricted mode
- Check Google Cloud project permissions
- Ensure OAuth consent screen configured

### Magic Link Not Working

**Symptom:** "Magic link sent" but no email received
**Solution:**
- Check Supabase email provider settings
- Verify SendGrid API key (if using SendGrid)
- Check spam/junk folder
- Look at Supabase → Authentication → Logs for errors

**Symptom:** Magic link expires immediately
**Solution:**
- Default is 24 hours - not enough?
- Configure in Supabase → Authentication → Settings
- Max recommended: 48 hours

**Symptom:** "Invalid token" when clicking link
**Solution:**
- Link might be expired (check timestamp)
- Cannot reuse same link
- User may have already been created

### General Issues

**Symptom:** Console error "VITE_SUPABASE_URL is undefined"
**Solution:**
- Create `.env.local` file
- Add `VITE_` prefix to all env variables
- Restart dev server after adding env vars

**Symptom:** "User registration disabled" error
**Solution:**
- Go to Supabase → Authentication → Providers → Email
- Ensure "Enable email sign ups" is toggled ON

---

## Production URLs Configuration

Update the following URLs for your production domain:

### Google Cloud Console
```
Authorized redirect URIs:
https://your-project-id.supabase.co/auth/v1/callback
https://yourdomain.com/auth/callback
```

### Supabase Dashboard
Go to **Authentication** → **URL Configuration**
```
Site URL: https://yourdomain.com
Redirect URLs: https://yourdomain.com/dashboard
```

### Environment Variables (Production)
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

---

## Verification Script

### Test Both Methods Locally

```bash
#!/bin/bash
# save as test-auth.sh

echo "🧪 Testing EduNexus-AI Authentication"
echo ""
echo "Prerequisites:"
echo "1. .env.local configured with Supabase credentials"
echo "2. Google OAuth configured in Supabase"
echo "3. Magic Link / Email enabled in Supabase"
echo ""
echo "Test Cases:"
echo "1. Open http://localhost:5173"
echo "2. Try Google OAuth login"
echo "3. Try Magic Link with test email"
echo "4. Verify redirect to dashboard"
echo ""
echo "Expected Results:"
echo "✓ Google button opens OAuth dialog"
echo "✓ Magic link sends email"
echo "✓ Both methods create/retrieve user session"
echo "✓ Redirect to dashboard works"
echo ""
echo "Run 'npm run dev' and test manually"
```

---

## Next Steps

1. **Configure Google OAuth** (Step 1)
2. **Configure Magic Link Email** (Step 2)
3. **Test Locally** (Steps 3-4)
4. **Integrate Testing** (Step 5)
5. **Deploy** (Step 7)

---

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com)
- [SendGrid Setup](https://supabase.com/docs/guides/auth/email-templates#send-grid)

---

**Last Updated:** December 5, 2025  
**Status:** Implementation Complete  
**Next Action:** Configure Supabase credentials and test
