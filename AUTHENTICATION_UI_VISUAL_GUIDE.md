# Visual Guide: Authentication UI

## Login Page Layout

### Current Login Page Structure
```
┌──────────────────────────────────────────┐
│         EduNexus Sign In                  │
│                                          │
│  📚 Logo & Branding                      │
│  "The intelligent platform for modern   │
│   education"                             │
├──────────────────────────────────────────┤
│                                          │
│  STEP 1: Email Entry                     │
│  ────────────────────                    │
│                                          │
│  Email Address:                          │
│  ┌────────────────────────────────────┐  │
│  │ you@example.com                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Continue Button]                       │
│                                          │
│  ────── Or continue with ──────          │
│                                          │
│  [🔵 Continue with Google]               │
│                                          │
│  [✨ ✨ Login with magic link]            │
│                                          │
│  Don't have account? Sign up →           │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🔒 Secure Session | 2FA Supported       │
│  🟢 Systems Operational                  │
│                                          │
└──────────────────────────────────────────┘
```

### STEP 2: Role & Password Selection
```
┌──────────────────────────────────────────┐
│         EduNexus Sign In                  │
├──────────────────────────────────────────┤
│                                          │
│  [A] you@example.com        [← Change]   │
│                                          │
│  I am a...                               │
│  ┌────────────────────────────────────┐  │
│  │ Management           ▼             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Organization Type:                      │
│  ◉ School    ○ Institute                │
│                                          │
│  Unique ID:                              │
│  ┌────────────────────────────────────┐  │
│  │ [Your ID / Code]                   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Password:                               │
│  ┌────────────────────────────────────┐  │
│  │ ••••••••              [Show]        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [← Change Email]  [Forgot Password?]   │
│                                          │
│  [Sign In Button]                        │
│                                          │
│  [✨ ✨ Login with magic link]           │
│                                          │
└──────────────────────────────────────────┘
```

---

## Button Details

### Google OAuth Button
```
Location: Step 1 (Email Entry)
Position: Below "Continue" button
Size: Full width
Height: 36px (py-2 px-4)

Visual:
┌──────────────────────────────┐
│ 🔵 Continue with Google      │
└──────────────────────────────┘

States:
- Default:  White background, gray text, 1px border
- Hover:    Light gray background
- Active:   Scale 0.98 (press effect)
- Disabled: None (always enabled if email entered)

Icon: SVG Google logo (20x20px)
Text: "Continue with Google"
```

### Magic Link Button
```
Location: Step 1 (Email Entry)
Position: Below Google button
Size: Full width
Height: 36px (py-2 px-4)

Visual:
┌──────────────────────────────┐
│ ✨ Login with magic link    │
│      (or "Sign up with...")  │
└──────────────────────────────┘

States:
- Default:  White background, gray text, 1px border
- Hover:    Light gray background
- Active:   Scale 0.98 (press effect)
- Disabled: Gray background, when email empty

Icon: SVG magic wand (20x20px)
Text: "✨ {Login|Sign up} with magic link"
```

---

## Button Behavior Flow

### When User Enters Email

```
User types email
         ↓
Email format validated
         ↓
On Continue button click:
├─ Valid email   → Show Step 2 (Role & Password)
└─ Invalid email → Show error message

Magic Link button state:
├─ Email valid   → Enabled (clickable)
└─ Email empty   → Disabled (grayed out)

Google button state:
├─ Always        → Enabled (clickable)
```

### When User Clicks "Continue with Google"

```
1. Supabase OAuth dialog opens (popup)
   └─ User selects Google account
   
2. Redirect to Google login (if not already logged in)
   └─ User enters credentials
   
3. User grants app permissions
   └─ "Allow EduNexus to access your profile"
   
4. Redirect back to app
   └─ Session created
   
5. Redirect to dashboard
   └─ User logged in
```

### When User Clicks "Magic Link" Button

```
1. Supabase sends OTP to email
   └─ Success message shows: "Magic link sent! Check your email."
   
2. User goes to email inbox
   └─ Email from noreply@supabase.co
   
3. User clicks magic link
   └─ Opens verification page
   
4. OTP verified
   └─ User session created
   
5. Redirect to dashboard
   └─ User logged in
```

---

## Responsive Design

### Desktop (1024px+)
```
┌─────────────────────────────────────────────────┐
│          EduNexus Sign In (Centered)             │
│          Max-width: 448px (Max-w-md)            │
│                                                 │
│  [Input fields at full width]                  │
│  [Buttons at full width]                       │
│  [2-column layout for future expansion]        │
└─────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌──────────────────────────────────────┐
│     EduNexus Sign In (Centered)       │
│     Max-width: 420px                 │
│                                      │
│  [Full width inputs]                 │
│  [Full width buttons]                │
└──────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────┐
│ EduNexus Sign In │
│                  │
│ [Full width]     │
│ [Padding: 16px]  │
│ [Buttons stack]  │
│                  │
└──────────────────┘
```

---

## Color Scheme

### Buttons

**Google Button:**
- Background: #FFFFFF (White)
- Border: 1px solid #D1D5DB (Gray-300)
- Text Color: #374151 (Gray-700)
- Hover: #F9FAFB (Gray-50)
- Icon: #374151

**Magic Link Button:**
- Background: #FFFFFF (White)
- Border: 1px solid #D1D5DB (Gray-300)
- Text Color: #374151 (Gray-700)
- Hover: #F9FAFB (Gray-50)
- Icon: #374151

**Disabled State:**
- Background: #E5E7EB (Gray-200)
- Text Color: #9CA3AF (Gray-400)

---

## Accessibility Features

### Keyboard Navigation
```
Tab Order:
1. Email input field
2. Continue button
3. Google OAuth button
4. Magic Link button
5. Sign up / Sign in toggle link
```

### Screen Reader Support
```
Google Button:
aria-label: "Continue with Google"
role: button

Magic Link Button:
aria-label: "Sign up with magic link"
role: button

Icons:
aria-hidden: true (icons don't need separate labels)
```

### Focus States
```
All buttons have visible focus outline:
Focus Ring: 2px solid blue (focus:ring-blue-500)
Focus Border: 2px solid blue (focus:border-blue-500)
```

---

## State Transitions

### Email Step (Step 1)
```
Empty Email
├─ Continue button: Disabled (if required)
├─ Google button: Enabled
└─ Magic link: Disabled (requires email)
         ↓
Valid Email Entered
├─ Continue button: Enabled
├─ Google button: Enabled
└─ Magic link: Enabled
         ↓
User Clicks Button
├─ Continue → Step 2
├─ Google → OAuth flow
└─ Magic Link → Email sent confirmation
```

### Password Step (Step 2)
```
Ready to Submit
├─ Email: Shown with change option
├─ Role: Selected from dropdown
├─ ID: Entered (if required)
├─ Password: Entered
└─ Sign In button: Enabled
         ↓
User Clicks Sign In
├─ Loading spinner shows
├─ Validation runs
└─ Auth attempt
         ↓
Success
└─ Redirect to Dashboard
```

---

## Error States

### Email Validation
```
❌ Empty Email
   "Email is required."
   
❌ Invalid Format
   "Please enter a valid email address."
   
❌ Already Registered
   "This email is already registered."
```

### Google OAuth Errors
```
❌ OAuth Failed
   "Google sign in failed: [Error message]"
   (Error message from Supabase)
   
❌ Popup Blocked
   "Please allow popups for this site."
```

### Magic Link Errors
```
❌ Email Not Found
   "This email is not registered. Create an account?"
   
❌ Email Service Down
   "Failed to send magic link. Please try again."
   
❌ Rate Limited
   "Too many attempts. Please try again later."
```

---

## User Feedback

### Success Messages

**Magic Link Sent:**
```
┌──────────────────────────────────────┐
│ ✅ Magic link sent! Check your email.│
└──────────────────────────────────────┘
```

**Google OAuth Success:**
```
Auto-redirects to dashboard
No explicit success message needed
```

### Information Messages

**During Processing:**
```
[Loading...] (Spinning indicator)

Text: "Processing..." or "Sending..."
```

---

## Implementation Files

### Related Components
- `components/Login/UnifiedLoginForm.tsx` - Main form component
- `components/ui/Button.tsx` - Button component
- `components/ui/Input.tsx` - Input component
- `services/supabaseClient.ts` - Supabase client

### Styling
- Tailwind CSS classes for all styling
- Responsive breakpoints: sm, md, lg
- Custom shadow and border radius

---

## Testing Scenarios

### Scenario 1: New User Google Sign Up
```
1. Open login page
2. Enter new email
3. Click "Continue with Google"
4. Select Google account
5. Grant permissions
6. Auto-create account
7. Redirect to dashboard
```

### Scenario 2: New User Magic Link Sign Up
```
1. Open login page
2. Enter new email
3. Click "✨ Magic Link"
4. See "Check your email" message
5. Open email
6. Click verification link
7. Auto-create account
8. Redirect to dashboard
```

### Scenario 3: Returning User Login
```
1. Open login page
2. Enter registered email
3. Click "Continue with Google" OR "✨ Magic Link"
4. Complete verification
5. Skip account setup
6. Redirect to dashboard
```

---

## Visual Consistency

### Button Sizing
```
Small:  py-1 px-3 text-sm
Medium: py-2 px-4 text-sm  ← Used (current)
Large:  py-3 px-6 text-base ← Used for main CTA
```

### Spacing
```
Between email input and buttons: mt-6
Between buttons: space-y-3 (12px gap)
Button padding: py-2 px-4
```

### Borders & Shadows
```
Border: 1px solid #D1D5DB
Shadow: shadow-sm (subtle shadow)
Radius: rounded-md (6px)
```

---

**Last Updated:** December 5, 2025  
**Component Version:** 1.0  
**Status:** Production Ready
