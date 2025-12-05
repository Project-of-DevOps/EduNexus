# Pages to Branch Mapping & Migration Guide

## Quick Reference: Pages by Feature Branch

### 🔐 **Authentication Branch** (`feature/auth/`)

| Page | Branch | Purpose |
|---|---|---|
| `Login.tsx` | `feature/auth/login-pages` | Main login interface |
| `ParentLogin.tsx` | `feature/auth/login-pages` | Parent-specific login |
| `ParentLogin.new.tsx` | `feature/auth/login-pages` | New parent login variant |
| `StudentLogin.tsx` | `feature/auth/login-pages` | Student-specific login |
| `TeacherLogin.tsx` | `feature/auth/login-pages` | Teacher-specific login |
| `ManagementLogin.tsx` | `feature/auth/login-pages` | Management-specific login |
| `LibrarianLogin.tsx` | `feature/auth/login-pages` | Librarian-specific login |
| `ForgotPassword.tsx` | `feature/auth/password-recovery` | Password reset request |
| `ResetPassword.tsx` | `feature/auth/password-recovery` | Password reset completion |
| `VerifyEmailPage.tsx` | `feature/auth/email-verification` | Email verification flow |
| `ConfirmCodePage.tsx` | `feature/auth/email-verification` | Confirmation code entry |
| `Activate.tsx` | `feature/auth/activation` | Account activation |

**Branch Owner:** Authentication Team  
**Dependencies:** Auth context, API services  
**Related Components:** `components/auth/`, `hooks/useAuth.ts`  

---

### 📊 **Dashboards Branch** (`feature/dashboards/`)

| Page | Branch | Purpose | Role |
|---|---|---|---|
| `Dashboard.tsx` | `feature/dashboards/student` | Default/generic dashboard | Multiple |
| `StudentDashboard.tsx` | `feature/dashboards/student` | Student learning dashboard | Student |
| `ParentDashboard.tsx` | `feature/dashboards/parent` | Parent monitoring dashboard | Parent |
| `TeacherDashboard.tsx` | `feature/dashboards/teacher` | Teacher management dashboard | Teacher |
| `ManagementDashboard.tsx` | `feature/dashboards/management` | Admin/management dashboard | Admin |
| `LibrarianDashboard.tsx` | `feature/dashboards/librarian` | Library management dashboard | Librarian |

**Branch Owners:** One owner per role-specific dashboard  
**Dependencies:** Data context, analytics services, chart libraries  
**Related Components:** `components/{student|parent|teacher|management|librarian}/`  

---

### 🏢 **Management Pages Branch** (`feature/management/`)

| Page | Branch | Purpose |
|---|---|---|
| `ManagementSignups.tsx` | `feature/management/signups` | Manage signup requests |
| `ManagementMailbox.tsx` | `feature/management/mailbox` | Email/message management |
| `ManagementCode.tsx` | `feature/management/codes` | Manage registration codes |

**Branch Owner:** Management Team  
**Dependencies:** Management services, admin APIs  
**Related Components:** `components/management/`  

---

### 📄 **Static Pages Branch** (`feature/static-pages/`)

| Page | Branch | Purpose |
|---|---|---|
| `HelpCenter.tsx` | `feature/static-pages/help` | Help & documentation |
| `PrivacyPolicy.tsx` | `feature/static-pages/legal` | Privacy policy |
| `TermsOfService.tsx` | `feature/static-pages/legal` | Terms of service |

**Branch Owner:** Legal/Documentation Team  
**Dependencies:** CMS content (if applicable)  
**Related Content:** `content/` or markdown files  

---

## Migration Guide: Moving Pages to Branches

### Step 1: Inventory Current Pages
```bash
# List all pages with their components
ls -la pages/
# Output should match our mapping above
```

### Step 2: Create Feature Branches (if not already done)
```powershell
# Run the setup script to create all branches
.\BRANCH_SETUP_COMMANDS.ps1
```

### Step 3: Move Pages to Appropriate Branches

#### Example: Moving Login Pages to `feature/auth/login-pages`

```bash
# 1. Checkout the target branch
git checkout feature/auth/login-pages

# 2. Make sure you're up to date with main
git merge main

# 3. Verify pages are there (they should be)
ls pages/

# 4. Make changes as needed for that feature
# (e.g., refactor, optimize, update styles)

# 5. Commit changes
git add pages/Login.tsx pages/ParentLogin.tsx pages/StudentLogin.tsx
git commit -m "feat(auth): consolidate login pages on feature/auth/login-pages"

# 6. Push to remote
git push origin feature/auth/login-pages

# 7. Create Pull Request to dev
# (Link to BRANCH_ORGANIZATION_STRATEGY.md in PR description)
```

#### Example: Moving Dashboard Pages to `feature/dashboards/student`

```bash
# 1. Checkout the target branch
git checkout feature/dashboards/student

# 2. Ensure up to date
git merge main

# 3. Work on StudentDashboard pages
# 4. Make updates specific to student dashboard
git add pages/StudentDashboard.tsx pages/Dashboard.tsx
git commit -m "feat(dashboards): implement student dashboard KPIs and engagement metrics"

# 5. Push and create PR
git push origin feature/dashboards/student
```

---

## Detailed Branch Descriptions

### 🔐 `feature/auth/login-pages`
**What:** All login-related pages (generic and role-specific)  
**Who:** Authentication team  
**When:** Work on login flows, authentication UI, SSO integration  
**Files:**
- `pages/Login.tsx`
- `pages/ParentLogin.tsx`
- `pages/StudentLogin.tsx`
- `pages/TeacherLogin.tsx`
- `pages/ManagementLogin.tsx`
- `pages/LibrarianLogin.tsx`

**Related:**
- `components/auth/`
- `hooks/useAuth.ts`
- `services/geminiService.ts` (if AI-powered)

---

### 🔐 `feature/auth/password-recovery`
**What:** Password reset and recovery flows  
**Who:** Authentication team  
**When:** Implement forgot password, reset password, email verification  
**Files:**
- `pages/ForgotPassword.tsx`
- `pages/ResetPassword.tsx`

**Related:**
- Email service integration
- Token verification logic

---

### ✔️ `feature/auth/email-verification`
**What:** Email verification and confirmation flows  
**Who:** Authentication team  
**When:** Build email verification, OTP, confirmation code logic  
**Files:**
- `pages/VerifyEmailPage.tsx`
- `pages/ConfirmCodePage.tsx`

**Related:**
- `components/auth/OTPModal.tsx`
- Email services
- OTP generation

---

### 🎯 `feature/auth/activation`
**What:** Account activation and first-time setup  
**Who:** Authentication team  
**When:** Implement activation flows  
**Files:**
- `pages/Activate.tsx`

**Related:**
- Setup wizards
- Onboarding flows

---

### 📚 `feature/dashboards/student`
**What:** Student-facing learning and progress dashboard  
**Who:** Student dashboard team  
**When:** Build/enhance student experience  
**Files:**
- `pages/StudentDashboard.tsx`
- `pages/Dashboard.tsx` (if generic default)

**Components:**
- `components/student/`
- `components/charts/`
- `components/shared/`

**Services:**
- Student data service
- Learning metrics
- Progress tracking

---

### 👨‍👩‍👧 `feature/dashboards/parent`
**What:** Parent monitoring and engagement dashboard  
**Who:** Parent dashboard team  
**When:** Build parent features  
**Files:**
- `pages/ParentDashboard.tsx`

**Components:**
- `components/parent/`

**Services:**
- Parent-specific data aggregation
- Child progress tracking

---

### 👨‍🏫 `feature/dashboards/teacher`
**What:** Teacher classroom and grading dashboard  
**Who:** Teacher dashboard team  
**When:** Build teacher features  
**Files:**
- `pages/TeacherDashboard.tsx`

**Components:**
- `components/teacher/`

**Services:**
- Classroom management
- Grading system
- Student analytics

---

### 🏛️ `feature/dashboards/management`
**What:** Administrative and organizational management dashboard  
**Who:** Management dashboard team  
**When:** Build admin features  
**Files:**
- `pages/ManagementDashboard.tsx`

**Components:**
- `components/management/`

**Services:**
- Organization-wide metrics
- User management
- Compliance tracking

---

### 📚 `feature/dashboards/librarian`
**What:** Library management and circulation dashboard  
**Who:** Librarian team  
**When:** Build library features  
**Files:**
- `pages/LibrarianDashboard.tsx`

**Components:**
- `components/librarian/`

**Services:**
- Inventory management
- Circulation tracking
- Patron management

---

### ⚙️ `feature/management/signups`
**What:** Signup request management and approval  
**Who:** Management team  
**When:** Build signup workflow  
**Files:**
- `pages/ManagementSignups.tsx`

**Related:**
- User provisioning
- Approval workflows

---

### 📧 `feature/management/mailbox`
**What:** System mailbox and message management  
**Who:** Management team  
**When:** Build messaging system  
**Files:**
- `pages/ManagementMailbox.tsx`

**Related:**
- `services/` email service
- Notification system

---

### 🔑 `feature/management/codes`
**What:** Registration and access code management  
**Who:** Management team  
**When:** Build code generation and tracking  
**Files:**
- `pages/ManagementCode.tsx`

**Related:**
- Code generation service
- Code validation

---

### 📖 `feature/static-pages/legal`
**What:** Legal pages (privacy, terms)  
**Who:** Legal/compliance team  
**When:** Update legal content, ensure compliance  
**Files:**
- `pages/PrivacyPolicy.tsx`
- `pages/TermsOfService.tsx`

**Related:**
- Legal team review process
- CMS integration (optional)

---

### ❓ `feature/static-pages/help`
**What:** Help center and documentation  
**Who:** Documentation/support team  
**When:** Update help resources  
**Files:**
- `pages/HelpCenter.tsx`

**Related:**
- `content/help/`
- Search indexing
- FAQ database

---

## Merging Strategy

### Merging to `dev` (Integration)
```bash
# 1. Ensure your feature branch is complete
git checkout feature/dashboards/student

# 2. Make sure it's up to date with dev
git fetch origin
git merge origin/dev

# 3. Resolve any conflicts
# 4. Push branch
git push origin feature/dashboards/student

# 5. Create Pull Request on GitHub
# - Base: dev
# - Compare: feature/dashboards/student
# - Include: description, testing done, screenshots if UI changes
```

### Merging to `main` (Release)
```bash
# Only merge dev to main when:
# ✓ All PRs to dev are reviewed
# ✓ Testing is complete
# ✓ Release notes prepared

git checkout main
git pull origin main
git merge origin/dev
git tag v1.0.0
git push origin main --tags
```

---

## Current State to Target State Mapping

| Current Branch | Status | Action | Target |
|---|---|---|---|
| `refactor/role-management` | Active | Migrate | `feature/dashboards/management` |
| `refactor/role-parent` | Active | Migrate | `feature/dashboards/parent` |
| `refactor/role-student` | Active | Migrate | `feature/dashboards/student` |
| `refactor/role-teacher` | Active | Migrate | `feature/dashboards/teacher` |
| `refactor/buttons-extract` | Active | Merge or Rename | `feature/ui/shared-components` |
| `main` | Active | Keep | `main` (primary) |

### Migrating Existing Branches

```bash
# Option 1: Rename and repurpose
# For refactor/role-student -> feature/dashboards/student

git checkout refactor/role-student
git branch -m refactor/role-student feature/dashboards/student
git push origin :refactor/role-student  # Delete old branch
git push origin feature/dashboards/student

# Option 2: Cherry-pick commits to new branch
git checkout -b feature/dashboards/student main
git cherry-pick refactor/role-student~5..refactor/role-student
git push origin feature/dashboards/student
```

---

## Branch Protection Rules (GitHub)

Protect these branches to prevent accidental deletions/direct pushes:

- `main` - Require reviews, status checks, pull request
- `dev` - Require reviews, status checks, pull request
- `stable/v1.0` - Require reviews, status checks, pull request

Allow direct pushes on:
- Feature branches (`feature/*`)
- Bugfix branches (`bugfix/*`)
- WIP branches (`wip/*`)

---

## Continuous Integration (CI/CD) Rules

Configure your CI/CD pipeline to:

```yaml
# GitHub Actions / GitLab CI example pattern
branches:
  - main: Run full test suite, deploy to prod
  - stable/*: Run full test suite, deploy to staging
  - dev: Run test suite, integration tests
  - feature/*: Run linting, unit tests
  - bugfix/*: Run linting, unit tests
  - experiment/*: Optional - only on demand
```

---

## Troubleshooting

### Q: How do I know which branch to work on?
**A:** Find your page in this document, look at the "Branch" column, and use that branch.

### Q: Can I work on pages in multiple branches?
**A:** Generally no - keep pages isolated to their branch. If a page needs changes, use feature branches that both branches can pull from later.

### Q: What if I need to work on multiple pages?
**A:** Create a feature branch for that work, merge it, then pull the changes into the specific role branches.

### Q: How do I sync my branch with the latest main?
```bash
git checkout your-branch
git fetch origin
git merge origin/main
# Resolve conflicts if any
git push origin your-branch
```

### Q: Can I delete a branch?
**A:** Only delete branches that are merged and no longer needed. Use:
```bash
git branch -d branch-name          # Local delete
git push origin --delete branch-name  # Remote delete
```

---

## Questions & Support

Document any issues or clarifications needed and share with the team lead.
