# Branch & Pages Organization - Quick Reference

## 🎯 At a Glance

### Your Pages (24 total)

```
12 Auth Pages      → feature/auth/*
6 Dashboard Pages  → feature/dashboards/*
3 Management Pages → feature/management/*
3 Static Pages     → feature/static-pages/*
```

### Your Branches

```
Infrastructure     → main, dev, stable/v1.0
Features           → feature/auth/*, feature/dashboards/*, etc.
Bug Fixes          → bugfix/
Refactoring        → refactor/
Experiments        → experiment/
```

---

## 📋 Page Checklist

### ✅ Authentication Pages (12)
- [ ] `Login.tsx` → `feature/auth/login-pages`
- [ ] `ParentLogin.tsx` → `feature/auth/login-pages`
- [ ] `ParentLogin.new.tsx` → `feature/auth/login-pages`
- [ ] `StudentLogin.tsx` → `feature/auth/login-pages`
- [ ] `TeacherLogin.tsx` → `feature/auth/login-pages`
- [ ] `ManagementLogin.tsx` → `feature/auth/login-pages`
- [ ] `LibrarianLogin.tsx` → `feature/auth/login-pages`
- [ ] `ForgotPassword.tsx` → `feature/auth/password-recovery`
- [ ] `ResetPassword.tsx` → `feature/auth/password-recovery`
- [ ] `VerifyEmailPage.tsx` → `feature/auth/email-verification`
- [ ] `ConfirmCodePage.tsx` → `feature/auth/email-verification`
- [ ] `Activate.tsx` → `feature/auth/activation`

### ✅ Dashboard Pages (6)
- [ ] `Dashboard.tsx` → `feature/dashboards/student`
- [ ] `StudentDashboard.tsx` → `feature/dashboards/student`
- [ ] `ParentDashboard.tsx` → `feature/dashboards/parent`
- [ ] `TeacherDashboard.tsx` → `feature/dashboards/teacher`
- [ ] `ManagementDashboard.tsx` → `feature/dashboards/management`
- [ ] `LibrarianDashboard.tsx` → `feature/dashboards/librarian`

### ✅ Management Pages (3)
- [ ] `ManagementSignups.tsx` → `feature/management/signups`
- [ ] `ManagementMailbox.tsx` → `feature/management/mailbox`
- [ ] `ManagementCode.tsx` → `feature/management/codes`

### ✅ Static Pages (3)
- [ ] `HelpCenter.tsx` → `feature/static-pages/help`
- [ ] `PrivacyPolicy.tsx` → `feature/static-pages/legal`
- [ ] `TermsOfService.tsx` → `feature/static-pages/legal`

---

## 🚀 Quick Start

### Step 1: Create All Branches
```powershell
# Run the setup script (Windows)
.\BRANCH_SETUP_COMMANDS.ps1
```

### Step 2: Read the Documentation
1. `BRANCH_ORGANIZATION_STRATEGY.md` - Full strategy & guidelines
2. `PAGES_TO_BRANCH_MAPPING.md` - Detailed page assignments
3. This file - Quick reference

### Step 3: Assign Work by Branch
- Authentication team → `feature/auth/*` branches
- Dashboard teams → `feature/dashboards/*` branches
- Management team → `feature/management/*` branches
- Legal/docs team → `feature/static-pages/*` branches

### Step 4: Create Pull Requests
```bash
# Example workflow
git checkout feature/dashboards/student
git add pages/StudentDashboard.tsx
git commit -m "feat(dashboards): add student KPI cards"
git push origin feature/dashboards/student
# → Create PR to dev branch on GitHub
```

---

## 📊 Component Organization (Aligned with Branches)

```
components/
├── auth/                          ← feature/auth/* branches
│   ├── LoginForm.tsx
│   ├── OTPModal.tsx
│   ├── PasswordRecovery.tsx
│   └── ...
│
├── dashboards/                    ← feature/dashboards/* branches
│   ├── student/
│   │   ├── ProgressCard.tsx
│   │   ├── GradeChart.tsx
│   │   └── ...
│   ├── parent/
│   │   ├── ChildCard.tsx
│   │   ├── AttendanceTracker.tsx
│   │   └── ...
│   ├── teacher/
│   │   ├── ClassOverview.tsx
│   │   ├── GradebookWidget.tsx
│   │   └── ...
│   ├── management/
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── UserManagement.tsx
│   │   └── ...
│   └── librarian/
│       ├── InventoryManager.tsx
│       ├── CirculationDashboard.tsx
│       └── ...
│
├── management/                    ← feature/management/* branches
│   ├── SignupQueue.tsx
│   ├── MailboxUI.tsx
│   ├── CodeGenerator.tsx
│   └── ...
│
├── static/                        ← feature/static-pages/* branches
│   ├── Footer.tsx
│   ├── Navigation.tsx
│   └── ...
│
├── shared/                        ← feature/ui/* branches
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── ...
│
├── charts/                        ← feature/dashboards/* or feature/ui/*
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   └── ...
│
└── ui/                            ← feature/ui/* branches
    ├── Theme.tsx
    ├── Responsive.tsx
    └── ...
```

---

## 🔄 Workflow by Role

### 👨‍💼 Authentication Developer
**Working on:** Login, password reset, email verification, activation  
**Branches:** `feature/auth/login-pages`, `feature/auth/password-recovery`, `feature/auth/email-verification`, `feature/auth/activation`  

```bash
# Typical workflow
git checkout feature/auth/login-pages
# Edit pages/Login.tsx, pages/ParentLogin.tsx, etc.
git commit -m "feat(auth): add OAuth buttons to login"
git push origin feature/auth/login-pages
# Create PR to dev
```

### 👨‍🏫 Dashboard Developer (Student)
**Working on:** Student dashboard and learning interface  
**Branch:** `feature/dashboards/student`  

```bash
git checkout feature/dashboards/student
# Edit pages/StudentDashboard.tsx
git commit -m "feat(dashboards): add progress KPIs"
git push origin feature/dashboards/student
```

### 🏢 Management Developer
**Working on:** Admin pages, signup management, mailbox  
**Branches:** `feature/management/*`  

```bash
git checkout feature/management/signups
# Edit pages/ManagementSignups.tsx
git commit -m "feat(management): add bulk approval UI"
git push origin feature/management/signups
```

### 📖 Documentation Team
**Working on:** Help center, legal pages  
**Branch:** `feature/static-pages/*`  

```bash
git checkout feature/static-pages/legal
# Edit pages/PrivacyPolicy.tsx
git commit -m "docs: update privacy policy for GDPR compliance"
git push origin feature/static-pages/legal
```

---

## 🎓 Learning Path

1. **Understanding Branch Structure**
   - Read: `BRANCH_ORGANIZATION_STRATEGY.md`
   - Time: 10 mins

2. **Finding Your Pages**
   - Read: `PAGES_TO_BRANCH_MAPPING.md`
   - Time: 5 mins

3. **Daily Workflow**
   - Run: `.\BRANCH_SETUP_COMMANDS.ps1`
   - Create feature branches
   - Work on assigned pages
   - Time: As needed

4. **Pulling & Merging**
   - Understand: PR review process
   - Merge: feature → dev
   - Release: dev → main
   - Time: Variable

---

## 🔍 Finding Pages by Purpose

### Need to work on login?
→ `feature/auth/login-pages` (7 pages)

### Need to work on student learning?
→ `feature/dashboards/student` (2 pages)

### Need to work on teacher grading?
→ `feature/dashboards/teacher` (1 page)

### Need to work on admin setup?
→ `feature/management/*` (3 pages)

### Need to work on legal docs?
→ `feature/static-pages/legal` (2 pages)

### Need to work on help center?
→ `feature/static-pages/help` (1 page)

---

## 🛠️ Common Commands

### Check which branch I'm on
```bash
git branch
```

### Switch to a branch
```bash
git checkout feature/dashboards/student
```

### Update my branch with latest main
```bash
git merge origin/main
```

### Push my changes
```bash
git push origin feature/dashboards/student
```

### See all branches
```bash
git branch -a
```

### Delete a local branch
```bash
git branch -d feature/dashboards/student
```

---

## ✨ Best Practices

✅ **DO:**
- Keep one focus per branch
- Work on assigned pages only
- Merge regularly to avoid conflicts
- Create descriptive commit messages
- Use PR for code review

❌ **DON'T:**
- Create random branches
- Work on pages outside your branch
- Commit without a message
- Force push (unless absolutely necessary)
- Delete main or dev branches

---

## 📞 Need Help?

### Q: Which branch should I use?
→ Find your page in `PAGES_TO_BRANCH_MAPPING.md`

### Q: How do I set up these branches?
→ Run `.\BRANCH_SETUP_COMMANDS.ps1`

### Q: I'm stuck on a merge conflict
→ See troubleshooting in `PAGES_TO_BRANCH_MAPPING.md`

### Q: Can I work on multiple pages?
→ Keep them in the same branch if related, else use feature flags

### Q: How do I release changes?
→ Merge to dev, then dev to main, then tag version

---

## 📋 Checklist for Getting Started

- [ ] Read `BRANCH_ORGANIZATION_STRATEGY.md`
- [ ] Read `PAGES_TO_BRANCH_MAPPING.md`
- [ ] Run `.\BRANCH_SETUP_COMMANDS.ps1`
- [ ] Verify branches exist: `git branch -a`
- [ ] Checkout your assigned branch
- [ ] Start working on pages
- [ ] Create PR when ready
- [ ] Request review from team
- [ ] Merge when approved

---

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation
