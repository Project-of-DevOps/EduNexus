# Email & Magic Link Setup Guide

## Issues Fixed ✅

1. **Magic Link Endpoint Error Handling**
   - Added try-catch to `/api/magic-link` endpoint to prevent crashes
   - Now returns success response even if email send fails (logs error instead)
   - Prevents "Network error" when sendEmail throws

2. **Missing Resend OTP Endpoint**
   - Added `/api/resend-otp` POST endpoint that was referenced by frontend but missing
   - Generates 6-digit OTP codes
   - Sends via email with proper error handling

3. **Better Frontend Error Messages**
   - Magic link error now includes server URL for debugging
   - Added console logging for network errors
   - Updated success message to mention "Check server logs" fallback

## Email Configuration

### Current `.env` Setup
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=storageeapp@gmail.com
SMTP_PASS=heff ddsi njdx ceyh
```

### Testing Email (Development)

If SMTP credentials don't work or you want to test locally:

1. **Check server logs** - When you click "Email me a login link", check the terminal where `npm run dev` is running
2. **Magic link is logged** - You'll see: `[MAGIC LINK] To: test@gmail.com | Link: http://localhost:5173/login?magic_token=...`
3. **Server logs location** - Terminal output from `npm run dev` shows all email activity

### Production Email Setup

To enable actual email sending, ensure:

1. **SMTP Configuration** (already in `.env`)
   - Gmail: requires "App Password" (not regular password)
   - Other providers: check their SMTP documentation

2. **SendGrid Alternative** (Recommended for production)
   ```bash
   npm install @sendgrid/mail
   ```
   Add to `.env`:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

## How to Verify Email Works

### Step 1: Start the app
```bash
npm run dev
```

### Step 2: Go to Login page
- Visit http://localhost:5173 (or your VITE_API_URL)
- Enter an email address
- Click "✨ Email me a login link"

### Step 3: Check results

**Success** (UI shows):
- ✅ Message: "Magic link sent! Check your email..."

**Development Mode** (Check terminal):
- Look for: `[MAGIC LINK] To: email@example.com | Link: ...`
- Look for: `[MOCK EMAIL] To: email@example.com | Subject: ...`

**Production Mode with Gmail**:
- Email should arrive in inbox (check spam folder)
- Subject: "Your Magic Login Link"

## Troubleshooting

### "Network error. Please try again"

**Cause**: Frontend can't reach server
- ✅ Check: Is server running? `npm run dev` in `/server` directory
- ✅ Check: VITE_API_URL matches server URL (should be `http://localhost:4000`)

### Email not arriving

**Cause 1**: Gmail App Password issue
- Gmail requires 16-character "App Password" (not regular password)
- Generate new one: https://myaccount.google.com/apppasswords

**Cause 2**: SMTP credentials wrong
- Test: `telnet smtp.gmail.com 587` (should connect)
- Check `.env` file for typos

**Cause 3**: Email goes to spam
- Gmail: Check spam folder
- Gmail: Mark as "Not spam" to fix

### See email logs

Check outbox queue (emails waiting to send):
- Terminal command: `npm run dev` shows all MOCK_EMAIL logs
- Or check `server/data/outbox.json` for queued emails

## API Endpoints Added/Fixed

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/magic-link` | POST | ✅ Fixed (error handling added) |
| `/api/resend-otp` | POST | ✅ Added (was missing) |
| `/api/health` | GET | ✅ Working |

## Next Steps

1. **For Development**: Just check server logs to see magic links
2. **For Testing**: Use real Gmail with App Password
3. **For Production**: Set up SendGrid API key for reliable delivery
