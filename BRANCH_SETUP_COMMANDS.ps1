# EduNexus-AI Branch Organization Setup (PowerShell)
# Run this script to create and organize all recommended branches

Write-Host "==========================================" -ForegroundColor Green
Write-Host "EduNexus-AI Branch Organization Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Function to create and push branch
function Create-Branch {
    param([string]$BranchName)
    
    Write-Host "Creating branch: $BranchName" -ForegroundColor Cyan
    
    try {
        git checkout -b $BranchName 2>$null
        if ($LASTEXITCODE -ne 0) {
            git checkout $BranchName
        }
        git push origin $BranchName 2>$null
        Write-Host "✓ Branch created: $BranchName" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Error creating branch: $BranchName" -ForegroundColor Red
    }
}

# Start from main
Write-Host "Checking out main branch..." -ForegroundColor Yellow
git checkout main
git pull origin main

Write-Host ""
Write-Host "Creating Core Infrastructure Branches..." -ForegroundColor Yellow

Create-Branch "dev"
Create-Branch "stable/v1.0"

Write-Host ""
Write-Host "Creating Authentication Feature Branches..." -ForegroundColor Yellow

Create-Branch "feature/auth/login-pages"
Create-Branch "feature/auth/password-recovery"
Create-Branch "feature/auth/email-verification"
Create-Branch "feature/auth/activation"
Create-Branch "feature/auth/mfa-otp"

Write-Host ""
Write-Host "Creating Dashboard Feature Branches..." -ForegroundColor Yellow

Create-Branch "feature/dashboards/student"
Create-Branch "feature/dashboards/parent"
Create-Branch "feature/dashboards/teacher"
Create-Branch "feature/dashboards/management"
Create-Branch "feature/dashboards/librarian"
Create-Branch "feature/dashboards/analytics"

Write-Host ""
Write-Host "Creating Management Feature Branches..." -ForegroundColor Yellow

Create-Branch "feature/management/signups"
Create-Branch "feature/management/mailbox"
Create-Branch "feature/management/codes"
Create-Branch "feature/management/admin-tools"

Write-Host ""
Write-Host "Creating Static Pages Feature Branches..." -ForegroundColor Yellow

Create-Branch "feature/static-pages/legal"
Create-Branch "feature/static-pages/help"

Write-Host ""
Write-Host "Creating UI/Component Feature Branches..." -ForegroundColor Yellow

Create-Branch "feature/ui/shared-components"
Create-Branch "feature/ui/theme"
Create-Branch "feature/ui/responsive"
Create-Branch "feature/ui/accessibility"

Write-Host ""
Write-Host "Creating Template Bugfix Branches..." -ForegroundColor Yellow

Create-Branch "bugfix/auth/login-issues"
Create-Branch "bugfix/dashboards/performance"
Create-Branch "bugfix/ui/layout-issues"

Write-Host ""
Write-Host "Creating Template Refactor Branches..." -ForegroundColor Yellow

Create-Branch "refactor/pages-organization"
Create-Branch "refactor/component-extraction"
Create-Branch "refactor/state-management"

Write-Host ""
Write-Host "Creating Template Experiment Branches..." -ForegroundColor Yellow

Create-Branch "experiment/new-dashboard-layout"
Create-Branch "experiment/ai-features"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ All branches created successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review BRANCH_ORGANIZATION_STRATEGY.md"
Write-Host "2. Migrate existing branches if needed"
Write-Host "3. Update CI/CD pipeline rules"
Write-Host "4. Share guidelines with team"
Write-Host ""
