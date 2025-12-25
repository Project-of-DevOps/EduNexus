# Frontend Strict Flow Test Plan

## Objective
Verify that the React frontend correctly integrates with the strict backend flow for all user roles.

## Prerequisites
- Server running on port 4000.
- Client running on port 3000.
- Database clean or in a known state (we will use unique emails/names to avoid conflicts).

## Test Scenarios

### 1. Management Signup (The Anchor)
- **Action**: Go to `/login?mode=signup`, select **Management**.
- **Input**: 
  - Name: "Director Skinner"
  - Email: "skinner_ui_test@gmail.com"
  - Password: "password123"
  - Institute Name: "Springfield UI High"
  - Type: School
- **Expected Result**: 
  - Redirect to `/dashboard/management`.
  - **Action**: Locate the **Organization Code** on the dashboard (e.g., "SCH-8821"). Record this code.

### 2. Teacher Signup (The Request)
- **Action**: Go to `/signup/teacher`.
- **Input**:
  - Institute Name: "Springfield UI High" (Validation check)
  - Org Code: <CODE_FROM_STEP_1>
  - Name: "Edna Krabappel"
  - Email: "edna_ui_test@gmail.com"
  - Password: "password123"
- **Expected Result**: 
  - Success Message: "Request sent successfully! Please wait for management approval."
  - Redirects to Login after delay.

### 3. Management Approval
- **Action**: Login as "Director Skinner" (`skinner_ui_test@gmail.com`).
- **Action**: Navigate to "Pending Requests" or "Staff" section.
- **Expected Result**: See "Edna Krabappel".
- **Action**: Click **Approve**.
- **Expected Result**: Teacher status updates to Active/Approved.

### 4. Create Class (Prerequisite for Student)
- **Action**: As Management, go to "Classes".
- **Action**: Create new class "Class 4-B".
- **Expected Result**: Class appears in list.

### 5. Student Signup
- **Action**: Go to `/signup/student`.
- **Input**:
  - Org Code: <CODE_FROM_STEP_1>
  - **Verification**: "Select Class" dropdown should populate with "Class 4-B".
  - Select "Class 4-B".
  - Name: "Bart Simpson"
  - Email: "bart_ui_test@gmail.com"
  - Password: "password123"
- **Expected Result**: 
  - Success Message.
  - Redirect to Login.
  - Login as Bart -> See Student Dashboard.

### 6. Parent Signup
- **Action**: Go to `/signup/parent`.
- **Input**:
  - Parent Email: "homer_ui_test@gmail.com"
  - Name: "Homer Simpson"
  - Password: "password123"
  - Student Email: "bart_ui_test@gmail.com"
- **Expected Result**: 
  - Success Message: "Parent account created and linked".
  - Login as Homer -> See Child "Bart Simpson" in dashboard.

## Execution Strategy
I will execute these steps sequentially using the browser automation tool and report status at each stage.
