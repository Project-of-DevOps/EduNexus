# Quick Start Guide - Google OAuth & Magic Link

## ⚡ 5-Minute Setup

### Step 1: Create `.env.local` (1 minute)
```bash
# In project root directory, create .env.local file with:

VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
```

**Where to find credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy Project URL and Anon Key

### Step 2: Get Google Credentials (2 minutes)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Copy Client ID and Client Secret

### Step 3: Configure Supabase (2 minutes)
1. Supabase Dashboard → Authentication → Providers
2. Enable **Google**
3. Paste Client ID and Client Secret
4. Enable **Email**
5. Save

### Step 4: Test
```bash
npm run dev
# Open http://localhost:5173
# Try both authentication methods
```

---

## 🔍 What Works Now

✅ **Google OAuth Button**
- Click "Continue with Google"
- Opens Google login dialog
- Auto-creates user account
- Redirects to dashboard

✅ **Magic Link Button**
- Enter email
- Click "✨ Magic Link"
- Check email for link
- Click link to verify
- Redirects to dashboard

---

## 🐛 Troubleshooting

### Google OAuth Not Working

**Issue:** Redirect loop or blank page  
**Fix:** Check redirect URI in Google Cloud Console matches:
```
https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
```

**Issue:** "Client ID not found"  
**Fix:** Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Issue:** Popup blocked  
**Fix:** Check browser popup blocker, Chrome may require explicit allow

### Magic Link Not Working

**Issue:** Email not received  
**Fix:** 
1. Check spam folder
2. Verify email provider in Supabase
3. For local testing, use [MailHog](https://github.com/mailhog/mailhog)

**Issue:** Invalid token error  
**Fix:** Link may be expired (24 hour limit) or already used

---

## 📚 Full Documentation

For detailed information, see:
- **GOOGLE_OAUTH_MAGIC_LINK_SETUP.md** - Complete setup guide
- **AUTHENTICATION_FLOW_SUMMARY.md** - Visual flows and diagrams
- **AUTHENTICATION_UI_VISUAL_GUIDE.md** - UI/UX details
- **IMPLEMENTATION_COMPLETE_SUMMARY.md** - Full implementation overview

---

## 🚀 Next Steps

1. ✅ Configure Supabase credentials
2. ✅ Setup Google OAuth in Google Cloud Console
3. ✅ Enable email provider in Supabase
4. ✅ Test locally
5. ✅ Deploy to production

---

## 📞 Quick Links

- [Supabase Documentation](https://supabase.com/docs)
- [Google OAuth Setup](https://console.cloud.google.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Project Repository](../README.md)

---

**Time to Setup:** 5 minutes  
**Time to Test:** 10 minutes  
**Time to Deploy:** 5 minutes  
**Total:** ~20 minutes from start to production-ready

Good luck! 🎉
