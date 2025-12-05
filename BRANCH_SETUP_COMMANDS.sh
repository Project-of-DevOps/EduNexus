#!/bin/bash

# EduNexus-AI Branch Organization Setup Script
# This script creates and organizes all recommended branches

echo "=========================================="
echo "EduNexus-AI Branch Organization Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to create and push branch
create_branch() {
    local branch_name=$1
    echo -e "${BLUE}Creating branch: ${branch_name}${NC}"
    
    git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
    git push origin "$branch_name" 2>/dev/null
    
    echo -e "${GREEN}✓ Branch created: ${branch_name}${NC}"
}

# Start from main
echo -e "${YELLOW}Checking out main branch...${NC}"
git checkout main
git pull origin main

echo ""
echo -e "${YELLOW}Creating Core Infrastructure Branches...${NC}"
create_branch "dev"
create_branch "stable/v1.0"

echo ""
echo -e "${YELLOW}Creating Authentication Feature Branches...${NC}"
create_branch "feature/auth/login-pages"
create_branch "feature/auth/password-recovery"
create_branch "feature/auth/email-verification"
create_branch "feature/auth/activation"
create_branch "feature/auth/mfa-otp"

echo ""
echo -e "${YELLOW}Creating Dashboard Feature Branches...${NC}"
create_branch "feature/dashboards/student"
create_branch "feature/dashboards/parent"
create_branch "feature/dashboards/teacher"
create_branch "feature/dashboards/management"
create_branch "feature/dashboards/librarian"
create_branch "feature/dashboards/analytics"

echo ""
echo -e "${YELLOW}Creating Management Feature Branches...${NC}"
create_branch "feature/management/signups"
create_branch "feature/management/mailbox"
create_branch "feature/management/codes"
create_branch "feature/management/admin-tools"

echo ""
echo -e "${YELLOW}Creating Static Pages Feature Branches...${NC}"
create_branch "feature/static-pages/legal"
create_branch "feature/static-pages/help"

echo ""
echo -e "${YELLOW}Creating UI/Component Feature Branches...${NC}"
create_branch "feature/ui/shared-components"
create_branch "feature/ui/theme"
create_branch "feature/ui/responsive"
create_branch "feature/ui/accessibility"

echo ""
echo -e "${YELLOW}Creating Template Bugfix Branches...${NC}"
create_branch "bugfix/auth/login-issues"
create_branch "bugfix/dashboards/performance"
create_branch "bugfix/ui/layout-issues"

echo ""
echo -e "${YELLOW}Creating Template Refactor Branches...${NC}"
create_branch "refactor/pages-organization"
create_branch "refactor/component-extraction"
create_branch "refactor/state-management"

echo ""
echo -e "${YELLOW}Creating Template Experiment Branches...${NC}"
create_branch "experiment/new-dashboard-layout"
create_branch "experiment/ai-features"

echo ""
echo -e "${GREEN}=========================================="
echo "✓ All branches created successfully!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review BRANCH_ORGANIZATION_STRATEGY.md"
echo "2. Migrate existing branches if needed"
echo "3. Update CI/CD pipeline rules"
echo "4. Share guidelines with team"
echo ""
