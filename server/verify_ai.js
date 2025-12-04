
const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function run() {
    console.log('Starting AI Endpoint Verification...');

    // Wait for server restart
    await new Promise(r => setTimeout(r, 2000));

    try {
        // 1. Login to get token
        console.log('\n--- Logging in ---');
        let cookie = '';
        try {
            const res = await axios.post(`${API_URL}/login`, {
                email: 'test_1733088079123@example.com', // Using a previously created user or create new one
                password: 'Password123!',
                role: 'Management'
            });
            const cookies = res.headers['set-cookie'];
            if (cookies) {
                cookie = cookies.map(c => c.split(';')[0]).join('; ');
            }
            console.log('Login Success');
        } catch (e) {
            // If login fails, try creating a new user
            console.log('Login failed, creating new user...');
            const email = `ai_test_${Date.now()}@example.com`;
            await axios.post(`${API_URL}/signup`, {
                name: 'AI Test User',
                email,
                password: 'Password123!',
                role: 'Management'
            });
            const res = await axios.post(`${API_URL}/login`, {
                email,
                password: 'Password123!',
                role: 'Management'
            });
            const cookies = res.headers['set-cookie'];
            if (cookies) {
                cookie = cookies.map(c => c.split(';')[0]).join('; ');
            }
            console.log('Login Success (New User)');
        }

        // 2. Call AI Endpoint
        console.log('\n--- Calling AI Endpoint ---');
        try {
            const res = await axios.post(`${API_URL}/generate-study-schedule`, {
                marks: [{ subject: 'Math', marks: 50, maxMarks: 100 }],
                availableSlots: ['09:00-10:00']
            }, {
                headers: { Cookie: cookie }
            });

            console.log('AI Response Success:', res.data.success);
            console.log('Schedule Items:', res.data.schedule.length);
            console.log('First Item:', res.data.schedule[0]);
        } catch (e) {
            console.error('AI Endpoint Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\nVerification Complete.');
        process.exit(0);

    } catch (err) {
        console.error('Unexpected Error:', err);
        process.exit(1);
    }
}

run();
