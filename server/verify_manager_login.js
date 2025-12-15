
const axios = require('axios');

async function verify() {
    const url = 'http://localhost:8000';
    const email = 'maneeth1302rao@gmail.com';
    const password = 'SecurePassword123!';

    try {
        // 1. Signin (Should work immediately due to auto-init)
        console.log(`Attempting Signin for ${email}...`);
        const signinRes = await axios.post(`${url}/api/py/signin`, { email, password });

        if (signinRes.data.success) {
            console.log('✅ Signin Successful!');
            console.log('Token received:', signinRes.data.token ? 'YES' : 'NO');
            console.log('User Role:', signinRes.data.user.role);
        } else {
            console.log('❌ Signin Failed:', signinRes.data);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

verify();
