
const axios = require('axios');
const API_URL = 'http://localhost:4000/api/signup';

async function testSignup() {
    try {
        const payload = {
            name: 'API Test User',
            email: 'api_test_' + Date.now() + '@example.com',
            password: 'Password123!',
            role: 'Management',
            extra: { uniqueId: 'API' + Math.floor(Math.random() * 1000) }
        };

        console.log('Sending POST to', API_URL);
        const res = await axios.post(API_URL, payload);
        console.log('Success:', res.data);
    } catch (e) {
        if (e.response) {
            console.error('API Error Status:', e.response.status);
            console.error('API Error Data:', e.response.data);
        } else {
            console.error('Network/Other Error:', e.message);
        }
    }
}

testSignup();
