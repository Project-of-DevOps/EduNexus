const axios = require('axios');

async function runTests() {
    const port = process.env.PORT || 5001;
    const baseURL = `http://localhost:${port}/api/auth-strict`;
    const orgCode = 'SCH-999';
    const instituteName = 'Springfield Elementary';

    console.log('--- Testing Duplicate Signup Handling ---');

    // Test 1: Duplicate Email (assuming 'admin@edu.com' exists from seed)
    try {
        console.log('Test 1: Attempting signup with existing email "admin@edu.com"...');
        await axios.post(`${baseURL}/signup/teacher-request`, {
            username: 'admin@edu.com',
            password: 'password123',
            org_code: orgCode,
            institute_name: instituteName
        });
        console.log('FAILED: Should have returned 409 but succeeded.');
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.log('PASSED: Correctly returned 409 Conflict.');
            console.log('Error Message:', err.response.data.error);
        } else {
            console.log('FAILED: Unexpected error:', err.message, err.response?.data);
        }
    }

    // Test 2: New User (Should succeed)
    // Note: This requires the org to exist. If seed wasn't run or DB is empty, this will fail with "Invalid Management Code".
    const randomUser = `teacher_${Math.floor(Math.random() * 10000)}@edu.com`;
    try {
        console.log(`\nTest 2: Attempting signup with new email "${randomUser}"...`);
        const res = await axios.post(`${baseURL}/signup/teacher-request`, {
            username: randomUser,
            password: 'password123',
            org_code: orgCode,
            institute_name: instituteName
        });
        if (res.data.success) {
            console.log('PASSED: Signup successful.');
        } else {
            console.log('FAILED: Signup failed response:', res.data);
        }
    } catch (err) {
        console.log('FAILED: Signup threw error:', err.response?.data || err.message);
        // If it failed due to invalid code, it means we need to seed the DB first.
    }
}

runTests();
