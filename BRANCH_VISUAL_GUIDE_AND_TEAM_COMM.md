# Branch Organization - Visual Guide & Team Communication

## 🏗️ Branch Hierarchy Diagram

```
                          ┌─── main (Production)
                          │      ↓
                          │    stable/v1.0 (Latest Stable)
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
    RELEASE FLOW                      DEVELOPMENT FLOW
        │                                   │
        │                              dev (Integration)
        │                                   │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────┼─────────────────────────────────────┐
        │                 │                 │                 │
    feature/           feature/           feature/        feature/
    auth/*          dashboards/*        management/*    static-pages/*
        │                 │                 │                 │
        ├─login-pages     ├─student         ├─signups         ├─legal
        ├─password-rec    ├─parent          ├─mailbox         └─help
        ├─email-verif     ├─teacher         └─codes
        ├─activation      ├─management
        └─mfa-otp         ├─librarian
                          └─analytics

        │
        └─── feature/ui/* (Shared Components)
             ├─shared-components
             ├─theme
             ├─responsive
             └─accessibility

        │
        └─── bugfix/* (Bug Fixes)
        │
        └─── refactor/* (Code Refactoring)
        │
        └─── experiment/* (A/B Tests)
```

---

## 📊 Page Distribution Chart

```
Auth Pages (12)           Dashboards (6)          Management (3)    Static Pages (3)
──────────────            ──────────────          ───────────       ───────────
1. Login                  1. Dashboard            1. Signups        1. Help Center
2. ParentLogin            2. StudentDashboard     2. Mailbox        2. Privacy
3. ParentLogin.new        3. ParentDashboard      3. Codes          3. Terms
4. StudentLogin           4. TeacherDashboard
5. TeacherLogin           5. ManagementDashboard
6. ManagementLogin        6. LibrarianDashboard
7. LibrarianLogin
8. ForgotPassword
9. ResetPassword
10. VerifyEmailPage
11. ConfirmCodePage
12. Activate
```

---

## 🔄 Release Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                                │
└──────────────────────────────────────────────────────────────┘

    feature/auth/*              feature/dashboards/*
    (Auth Team)                 (Dashboard Teams)
           │                           │
           │                           │
           ├─→ Pull Request ←─┬────────┤
           │                  │        │
           └──────────────────┼────────┘
                              │
                              ↓
                        ┌─────────────┐
                        │   dev       │
                        │ (Integration)│
                        └─────────────┘
                              │
                              ↓ (When ready to release)
                        ┌─────────────┐
                        │   main      │ (Production)
                        │  (Release)  │
                        └─────────────┘
                              │
                              ↓ (Tag version)
                        ┌─────────────┐
                        │ stable/v1.0 │
                        │  (Rollback) │
                        └─────────────┘
```

---

## 👥 Team Assignments

### Authentication Team
**Responsible for:** Login, password recovery, email verification, activation  
**Main Branches:**
- `feature/auth/login-pages` (7 pages)
- `feature/auth/password-recovery` (2 pages)
- `feature/auth/email-verification` (2 pages)
- `feature/auth/activation` (1 page)

**Merge Target:** `dev` branch  
**Release Cycle:** Every 2 weeks

---

### Student Dashboard Team
**Responsible for:** Student learning and progress interface  
**Main Branch:** `feature/dashboards/student`  
**Pages:** StudentDashboard.tsx, Dashboard.tsx  
**Merge Target:** `dev` branch  

---

### Parent Dashboard Team
**Responsible for:** Parent monitoring and engagement  
**Main Branch:** `feature/dashboards/parent`  
**Pages:** ParentDashboard.tsx  
**Merge Target:** `dev` branch  

---

### Teacher Dashboard Team
**Responsible for:** Classroom management and grading  
**Main Branch:** `feature/dashboards/teacher`  
**Pages:** TeacherDashboard.tsx  
**Merge Target:** `dev` branch  

---

### Management Dashboard Team
**Responsible for:** Admin and organizational management  
**Main Branch:** `feature/dashboards/management`  
**Pages:** ManagementDashboard.tsx  
**Merge Target:** `dev` branch  

---

### Librarian Dashboard Team
**Responsible for:** Library management and circulation  
**Main Branch:** `feature/dashboards/librarian`  
**Pages:** LibrarianDashboard.tsx  
**Merge Target:** `dev` branch  

---

### Management Operations Team
**Responsible for:** Signup, mailbox, and code management  
**Main Branches:**
- `feature/management/signups`
- `feature/management/mailbox`
- `feature/management/codes`

**Merge Target:** `dev` branch  

---

### Legal & Documentation Team
**Responsible for:** Help center, privacy policy, terms of service  
**Main Branches:**
- `feature/static-pages/help`
- `feature/static-pages/legal`

**Merge Target:** `dev` branch  

---

### UI/Components Team
**Responsible for:** Shared components, themes, responsive design  
**Main Branch:** `feature/ui/*`  
**Merge Target:** `dev` branch  

---

## 📢 Team Communication Template

### Announcement to Team

---

**Subject: New Branch Organization & Page Assignment**

Hi Team,

We've organized our codebase into a clear branch and page structure to improve collaboration and reduce merge conflicts. Here's what you need to know:

**New Branch Structure:**
- `main` - Production releases
- `dev` - Integration branch for all features
- `feature/auth/*` - Authentication pages (7 developers)
- `feature/dashboards/*` - Role-specific dashboards (5 teams)
- `feature/management/*` - Admin operations (1 team)
- `feature/static-pages/*` - Legal & help content (1 team)

**What This Means for You:**

1. **You'll be assigned a specific branch** that contains the pages you're responsible for
2. **All your work stays in that branch** until ready to merge to `dev`
3. **Pull requests go to `dev`** first, then `dev` → `main` for releases
4. **No more page conflicts** - each team has their own isolated pages

**Your Assignment:**

| Team | Branch | Pages | Owner |
|---|---|---|---|
| Auth | `feature/auth/login-pages` | 7 login pages | [Name] |
| Student | `feature/dashboards/student` | StudentDashboard | [Name] |
| Parent | `feature/dashboards/parent` | ParentDashboard | [Name] |
| Teacher | `feature/dashboards/teacher` | TeacherDashboard | [Name] |
| Management | `feature/dashboards/management` | ManagementDashboard | [Name] |
| Librarian | `feature/dashboards/librarian` | LibrarianDashboard | [Name] |
| Management Ops | `feature/management/*` | Signups, Mailbox, Codes | [Name] |
| Legal & Docs | `feature/static-pages/*` | Help, Privacy, Terms | [Name] |

**Getting Started:**

1. Read the documentation:
   - `BRANCH_ORGANIZATION_STRATEGY.md` (overview)
   - `PAGES_TO_BRANCH_MAPPING.md` (detailed assignments)
   - `BRANCH_QUICK_REFERENCE.md` (quick guide)

2. Create all branches:
   ```powershell
   .\BRANCH_SETUP_COMMANDS.ps1
   ```

3. Checkout your assigned branch and start working

**Workflow:**

```
Your Branch → Work on your pages → Commit & Push → Create PR to dev
→ Team reviews → Approve → Merge to dev → Release candidate
→ Test → Merge dev to main → Tag version
```

**Questions?**

- Check the documentation files in the repo
- Ask your team lead
- Review similar branches for patterns

Let's make collaboration smoother! 🚀

---

## 🎯 Implementation Checklist

**Week 1: Setup**
- [ ] Review branch strategy documents
- [ ] Run setup script: `.\BRANCH_SETUP_COMMANDS.ps1`
- [ ] Verify all branches created: `git branch -a`
- [ ] Assign team members to branches
- [ ] Create team Slack/Teams channels per branch (optional)

**Week 2: Migration**
- [ ] Move existing work to correct branches
- [ ] Close old branches (e.g., `refactor/role-*`)
- [ ] Create PRs from old to new branch content
- [ ] Document any special cases

**Week 3: Integration**
- [ ] Test full PR workflow (feature → dev)
- [ ] Test dev → main merge
- [ ] Update CI/CD pipeline for branch rules
- [ ] Create branch protection rules on GitHub

**Week 4: Adoption**
- [ ] Team training session (30 mins)
- [ ] Pair programming on first PR
- [ ] Establish regular review schedule
- [ ] Monitor merge conflicts & issues

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Working on Pages in Wrong Branch
**Problem:** Developer modifies StudentDashboard in `main` instead of `feature/dashboards/student`

**Solution:**
- Always checkout correct branch first
- Set up git hooks to warn about wrong branch
- Use IDE plugin to show current branch

**Prevention:**
```bash
# Create a pre-commit hook to check branch
echo "git branch | grep 'feature/' || echo 'Not on feature branch!'"
```

### Pitfall 2: Forgetting to Merge to dev
**Problem:** Work is done but never merged, so it doesn't reach production

**Solution:**
- Use PR templates that remind about merge target
- Create checklist: "[ ] PR created to dev"
- Set up CI/CD to require dev as base

### Pitfall 3: Pulling Unrelated Changes
**Problem:** Branch gets cluttered with pages from other teams

**Solution:**
- Only merge commits related to your branch pages
- Use cherry-pick for selective commits
- Avoid merging entire dev until release time

### Pitfall 4: Merge Conflicts
**Problem:** Two teams modified same file/page

**Solution:**
- Communicate page changes in advance
- Use shorter feature branches (1-2 weeks max)
- Merge to dev regularly to catch conflicts early

---

## 📈 Success Metrics

Track these metrics to ensure the new structure is working:

- **Merge Conflicts:** Should decrease 50%
- **PR Review Time:** Should decrease to <24 hours
- **Deploy Frequency:** Should increase to 2-3x/week
- **Development Velocity:** Should increase 20-30%
- **Bug Rate:** Should remain stable or decrease

---

## 🔐 GitHub Branch Protection Rules

```yaml
# For main branch
- Require pull request reviews before merging
- Require 2 approvals
- Require status checks to pass before merging
- Require branches to be up to date
- Include administrators
- Restrict who can push (only admins)

# For dev branch
- Require pull request reviews before merging
- Require 1 approval
- Require status checks to pass before merging
- Allow team leads to push directly (optional)

# For feature branches
- No restrictions (allow force push)
```

---

## 📞 Support & Questions

**Document Questions:**
→ Update the relevant .md file with clarification

**Branch Questions:**
→ Ask team lead, reference `PAGES_TO_BRANCH_MAPPING.md`

**Git Questions:**
→ Check `BRANCH_QUICK_REFERENCE.md` or run `git help`

**Workflow Questions:**
→ Reference workflow diagrams in this file

---

**Document Created:** December 5, 2025  
**Status:** Ready for Team Implementation  
**Next Step:** Run setup script and assign teams
