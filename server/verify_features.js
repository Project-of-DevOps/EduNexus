
const axios = require('axios');
const { authenticator } = require('otplib');

const API_URL = 'http://localhost:4000/api';
let cookie = '';
let user = null;
let twoFactorSecret = '';

async function run() {
    console.log('Starting Verification...');

    // Wait for server to start
    await new Promise(r => setTimeout(r, 2000));

    try {
        // 1. Signup
        console.log('\n--- Testing Signup ---');
        const email = `test_${Date.now()}@example.com`;
        try {
            const res = await axios.post(`${API_URL}/signup`, {
                name: 'Test User',
                email,
                password: 'Password123!',
                role: 'Management'
            });
            console.log('Signup Success:', res.data.success);
            user = res.data.user;
        } catch (e) {
            console.error('Signup Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 2. Login (Success)
        console.log('\n--- Testing Login (Success) ---');
        try {
            const res = await axios.post(`${API_URL}/login`, {
                email,
                password: 'Password123!',
                role: 'Management'
            });
            console.log('Login Success:', res.data.success);
            // Capture cookies
            const cookies = res.headers['set-cookie'];
            if (cookies) {
                cookie = cookies.map(c => c.split(';')[0]).join('; ');
                console.log('Cookies received');
            }
        } catch (e) {
            console.error('Login Failed:', e.response?.data || e.message);
        }

        // 3. Login (Fail - Wrong Password)
        console.log('\n--- Testing Login (Fail - Wrong Password) ---');
        try {
            await axios.post(`${API_URL}/login`, {
                email,
                password: 'WrongPassword123!',
                role: 'Management'
            });
            console.error('Login should have failed!');
        } catch (e) {
            console.log('Login Failed as expected:', e.response?.data?.error);
        }

        // 4. 2FA Setup
        console.log('\n--- Testing 2FA Setup ---');
        try {
            const res = await axios.post(`${API_URL}/2fa/setup`, {}, { headers: { Cookie: cookie } });
            console.log('2FA Setup Success:', res.data.success);
            twoFactorSecret = res.data.secret;
        } catch (e) {
            console.error('2FA Setup Failed:', e.response?.data || e.message);
        }

        // 5. 2FA Verify
        console.log('\n--- Testing 2FA Verify ---');
        try {
            const token = authenticator.generate(twoFactorSecret);
            const res = await axios.post(`${API_URL}/2fa/verify`, { token, secret: twoFactorSecret }, { headers: { Cookie: cookie } });
            console.log('2FA Verify Success:', res.data.success);
        } catch (e) {
            console.error('2FA Verify Failed:', e.response?.data || e.message);
        }

        // 6. Login with 2FA (Fail without token)
        console.log('\n--- Testing Login with 2FA (Fail without token) ---');
        try {
            const res = await axios.post(`${API_URL}/login`, {
                email,
                password: 'Password123!',
                role: 'Management'
            });
            if (res.data.require2fa) {
                console.log('Login required 2FA as expected');
            } else {
                console.error('Login did not require 2FA!');
            }
        } catch (e) {
            console.error('Login Failed unexpected:', e.response?.data || e.message);
        }

        // 7. Login with 2FA (Success)
        console.log('\n--- Testing Login with 2FA (Success) ---');
        try {
            const token = authenticator.generate(twoFactorSecret);
            const res = await axios.post(`${API_URL}/login`, {
                email,
                password: 'Password123!',
                role: 'Management',
                twoFactorToken: token
            });
            console.log('Login with 2FA Success:', res.data.success);
        } catch (e) {
            console.error('Login with 2FA Failed:', e.response?.data || e.message);
        }

        // 8. Email Verification
        console.log('\n--- Testing Email Verification ---');
        try {
            const res = await axios.post(`${API_URL}/send-verification-email`, {}, { headers: { Cookie: cookie } });
            console.log('Email Verification Sent:', res.data.success);
        } catch (e) {
            console.error('Email Verification Failed:', e.response?.data || e.message);
        }

        // 9. Forgot Password
        console.log('\n--- Testing Forgot Password ---');
        try {
            const res = await axios.post(`${API_URL}/forgot-password`, { email });
            console.log('Forgot Password Success:', res.data.success);
        } catch (e) {
            console.error('Forgot Password Failed:', e.response?.data || e.message);
        }

        // 10. Org Code Request
        console.log('\n--- Testing Org Code Request ---');
        try {
            const res = await axios.post(`${API_URL}/org-code/request`, {
                managementEmail: email,
                orgType: 'School',
                instituteId: 'SCH-123'
            });
            console.log('Org Code Request Success:', res.data.success);
        } catch (e) {
            console.error('Org Code Request Failed:', e.response?.data || e.message);
        }

        console.log('\nVerification Complete.');
        process.exit(0);

    } catch (err) {
        console.error('Unexpected Error:', err);
        process.exit(1);
    }
}

run();
