# Branch Organization Strategy for EduNexus-AI

## Current State Analysis

### Existing Pages (24 pages)
```
pages/
├── Auth Pages
│   ├── Login.tsx
│   ├── ParentLogin.tsx
│   ├── ParentLogin.new.tsx
│   ├── StudentLogin.tsx
│   ├── TeacherLogin.tsx
│   ├── ManagementLogin.tsx
│   ├── LibrarianLogin.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── VerifyEmailPage.tsx
│   ├── ConfirmCodePage.tsx
│   └── Activate.tsx
│
├── Dashboard Pages (Role-Specific)
│   ├── Dashboard.tsx (Generic/Student)
│   ├── StudentDashboard.tsx
│   ├── ParentDashboard.tsx
│   ├── TeacherDashboard.tsx
│   ├── ManagementDashboard.tsx
│   ├── LibrarianDashboard.tsx
│
├── Management Pages
│   ├── ManagementCode.tsx
│   ├── ManagementMailbox.tsx
│   ├── ManagementSignups.tsx
│
├── Static Pages
│   ├── HelpCenter.tsx
│   ├── PrivacyPolicy.tsx
│   ├── TermsOfService.tsx
```

### Current Branches
```
main (primary)
├── refactor/role-management
├── refactor/role-parent
├── refactor/role-student
├── refactor/role-teacher
├── refactor/buttons-extract
```

---

## Proposed Branch Structure

### 1. **Core Release Branches** (Production-Ready)
```
main/                          → Production-ready code
├── stable/v1.x                → Stable release versions
├── dev                        → Integration branch for features
```

### 2. **Feature Branches by Page Type**

#### Authentication Feature Branch
```
feature/auth/
├── feature/auth/login-pages          → All login variants
├── feature/auth/password-recovery    → ForgotPassword, ResetPassword
├── feature/auth/email-verification   → VerifyEmailPage, ConfirmCodePage
├── feature/auth/activation           → Activate.tsx
└── feature/auth/mfa-otp              → OTP and 2FA
```

#### Dashboard Feature Branch
```
feature/dashboards/
├── feature/dashboards/student        → StudentDashboard.tsx
├── feature/dashboards/parent         → ParentDashboard.tsx
├── feature/dashboards/teacher        → TeacherDashboard.tsx
├── feature/dashboards/management     → ManagementDashboard.tsx
├── feature/dashboards/librarian      → LibrarianDashboard.tsx
└── feature/dashboards/analytics      → Analytics and data visualization
```

#### Management Pages Feature Branch
```
feature/management/
├── feature/management/signups        → ManagementSignups.tsx
├── feature/management/mailbox        → ManagementMailbox.tsx
├── feature/management/codes          → ManagementCode.tsx
└── feature/management/admin-tools    → Admin-only utilities
```

#### Static Pages Feature Branch
```
feature/static-pages/
├── feature/static-pages/legal        → PrivacyPolicy, TermsOfService
├── feature/static-pages/help         → HelpCenter.tsx
└── feature/static-pages/compliance   → Compliance-related pages
```

#### Component & UI Feature Branch
```
feature/ui/
├── feature/ui/shared-components      → Shared component library
├── feature/ui/theme                  → Theme switching and styling
├── feature/ui/responsive             → Mobile responsiveness
└── feature/ui/accessibility          → Accessibility improvements
```

### 3. **Bugfix Branches**
```
bugfix/
├── bugfix/auth/login-error           → Bug fixes in authentication
├── bugfix/dashboards/performance     → Dashboard performance issues
├── bugfix/ui/responsive-layout       → Layout issues
└── bugfix/routing/navigation          → Routing and navigation bugs
```

### 4. **Refactor Branches** (For Architecture Changes)
```
refactor/
├── refactor/role-based-access        → RBAC improvements
├── refactor/pages-organization       → Page structure changes
├── refactor/component-extraction     → Extract reusable components
├── refactor/state-management         → Context/Redux improvements
└── refactor/type-safety              → TypeScript enhancements
```

### 5. **Experiment Branches** (For A/B Testing & Exploration)
```
experiment/
├── experiment/new-dashboard-layout
├── experiment/ai-features
├── experiment/ml-recommendations
└── experiment/performance-optimization
```

---

## Page Organization by Feature Branch

### **Auth Feature Branch** (12 pages)
```
feature/auth/
├── pages/
│   ├── Login.tsx
│   ├── ParentLogin.tsx
│   ├── StudentLogin.tsx
│   ├── TeacherLogin.tsx
│   ├── ManagementLogin.tsx
│   ├── LibrarianLogin.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── VerifyEmailPage.tsx
│   ├── ConfirmCodePage.tsx
│   └── Activate.tsx
├── components/auth/    → Auth-specific components
├── hooks/auth/         → Auth-specific hooks
└── services/auth/      → Auth services
```

### **Dashboard Feature Branch** (6 pages)
```
feature/dashboards/
├── pages/
│   ├── Dashboard.tsx
│   ├── StudentDashboard.tsx
│   ├── ParentDashboard.tsx
│   ├── TeacherDashboard.tsx
│   ├── ManagementDashboard.tsx
│   └── LibrarianDashboard.tsx
├── components/dashboards/
│   ├── student/
│   ├── parent/
│   ├── teacher/
│   ├── management/
│   └── librarian/
└── services/dashboards/
```

### **Management Feature Branch** (3 pages)
```
feature/management/
├── pages/
│   ├── ManagementCode.tsx
│   ├── ManagementMailbox.tsx
│   └── ManagementSignups.tsx
├── components/management/
└── services/management/
```

### **Static Pages Feature Branch** (3 pages)
```
feature/static-pages/
├── pages/
│   ├── HelpCenter.tsx
│   ├── PrivacyPolicy.tsx
│   └── TermsOfService.tsx
└── content/  → Static content
```

---

## Implementation Roadmap

### Phase 1: Setup Main Infrastructure Branches
```bash
# Create dev integration branch
git checkout -b dev

# Create stable release branch
git checkout -b stable/v1.0

# Push to remote
git push origin dev stable/v1.0
```

### Phase 2: Create Feature Branches from Main
```bash
# Auth features
git checkout -b feature/auth/login-pages
git checkout -b feature/auth/password-recovery
git checkout -b feature/auth/email-verification
git checkout -b feature/auth/mfa-otp

# Dashboard features
git checkout -b feature/dashboards/student
git checkout -b feature/dashboards/parent
git checkout -b feature/dashboards/teacher
git checkout -b feature/dashboards/management
git checkout -b feature/dashboards/librarian

# Management features
git checkout -b feature/management/signups
git checkout -b feature/management/mailbox

# Static pages
git checkout -b feature/static-pages/legal
git checkout -b feature/static-pages/help

# UI & Components
git checkout -b feature/ui/shared-components
git checkout -b feature/ui/theme
```

### Phase 3: Migrate Existing Work
- Move existing `refactor/role-*` branches to `feature/dashboards/*`
- Archive or delete unused branches
- Update CI/CD pipeline to recognize new branch patterns

### Phase 4: Documentation & Guidelines

---

## Branch Naming Conventions

| Branch Type | Format | Example |
|---|---|---|
| Main Release | `main` | `main` |
| Development | `dev` | `dev` |
| Stable Release | `stable/vX.Y` | `stable/v1.0` |
| Feature | `feature/<area>/<feature-name>` | `feature/auth/login-pages` |
| Bugfix | `bugfix/<area>/<bug-name>` | `bugfix/dashboards/performance` |
| Refactor | `refactor/<area>/<change-type>` | `refactor/pages-organization` |
| Hotfix | `hotfix/<issue>` | `hotfix/login-crash` |
| Experiment | `experiment/<feature-name>` | `experiment/ai-features` |
| WIP | `wip/<developer>/<description>` | `wip/john/new-dashboard` |

---

## Merge Strategy & Rules

### 1. **Feature → Dev Branch**
- Require pull request review (minimum 1 reviewer)
- Run CI/CD tests before merge
- Squash commits for clean history

### 2. **Dev → Main (Release)**
- Require pull request review (minimum 2 reviewers)
- Pass all tests + security scans
- Create release notes
- Create Git tag for version

### 3. **Main → Stable**
- Only for production-ready releases
- Tag with version (v1.0.0)
- Create release documentation

### 4. **Hotfix → Main**
- Direct merge for critical production bugs
- Must be tested immediately
- Backport to stable and dev branches

---

## Git Workflow Example

### Creating a New Feature
```bash
# 1. Start from dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/dashboards/student

# 3. Make changes and commit
git add .
git commit -m "feat(dashboards): implement student dashboard with KPIs"

# 4. Push branch
git push origin feature/dashboards/student

# 5. Create Pull Request to dev
# → Review → Merge to dev

# 6. When ready for release
# → Create PR from dev to main
# → After approval → Merge and tag
```

### Handling Hotfixes
```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/login-crash

# 2. Fix and test
git add .
git commit -m "fix(auth): resolve login crash on Firefox"

# 3. Merge back to main and dev
git push origin hotfix/login-crash
# → Create PR to main
# → Create PR to dev
```

---

## Benefits of This Structure

✅ **Clear Organization** - Each branch has a specific purpose  
✅ **Parallel Development** - Multiple teams can work simultaneously  
✅ **Easy Navigation** - Simple naming makes finding branches easy  
✅ **Release Management** - Clear path from feature → release  
✅ **Rollback Safety** - Stable branches remain unaffected  
✅ **Debugging** - Git bisect works better with clean history  
✅ **CI/CD Integration** - Branch names can trigger specific pipelines  
✅ **Team Collaboration** - Clear expectations for branch usage  

---

## Transition Plan (For Existing Branches)

| Current Branch | Migrate To | Action |
|---|---|---|
| `refactor/role-management` | `feature/dashboards/management` | Rename & update |
| `refactor/role-parent` | `feature/dashboards/parent` | Rename & update |
| `refactor/role-student` | `feature/dashboards/student` | Rename & update |
| `refactor/role-teacher` | `feature/dashboards/teacher` | Rename & update |
| `refactor/buttons-extract` | `feature/ui/shared-components` | Merge or rename |

---

## Commands to Implement This Structure

See `BRANCH_SETUP_COMMANDS.sh` for automated setup script.

---

## Questions & Support

For questions about branch structure:
- Create an issue in the repo
- Check this document for conventions
- Ask team lead for clarification
