const axios = require('axios');

const base = process.env.BASE_URL || 'http://localhost:4000';

(async () => {
  try {
    console.log('1) Attempt sign-in with non-existent user');
    try {
      await axios.post(`${base}/api/py/signin`, { email: 'nouser@example.com', password: 'Secret123!', role: 'Management' });
      console.error('ERROR: signin unexpectedly succeeded for missing user');
    } catch (e) {
      console.log('signin missing user response: status=', e.response ? e.response.status : 'NO_STATUS', 'data=', e.response ? e.response.data : e.message);
    }

    console.log('\n2) Signup new management user');
    try {
      const signupRes = await axios.post(`${base}/api/py/signup`, { name: 'Test Manager', email: 'manager@test.local', password: 'Password123!', role: 'Management' });
      console.log('signup response:', signupRes.data);
    } catch (e) {
      console.error('signup failed:', e.response ? { status: e.response.status, data: e.response.data } : e.message);
      throw e;
    }

    console.log('\n3) Duplicate signup with same email (expect error)');
    try {
      await axios.post(`${base}/api/py/signup`, { name: 'Duplicate', email: 'manager@test.local', password: 'Password123!', role: 'Management' });
      console.error('ERROR: duplicate signup unexpectedly succeeded');
    } catch (e) {
      console.log('duplicate signup response:', e.response ? e.response.data : e.message);
    }

    console.log('\n4) Sign-in with correct credentials (expect success)');
    const signin = await axios.post(`${base}/api/py/signin`, { email: 'manager@test.local', password: 'Password123!', role: 'Management' });
    console.log('signin success:', signin.data);

    console.log('\n5) Sign-in with wrong password (expect wrong password)');
    try {
      await axios.post(`${base}/api/py/signin`, { email: 'manager@test.local', password: 'WrongPass!', role: 'Management' });
      console.error('ERROR: signin with wrong password unexpectedly succeeded');
    } catch (e) {
      console.log('signin wrong password response:', e.response ? e.response.data : e.message);
    }

  } catch (err) {
    console.error('Unexpected error in test script:', err.message || err);
  }
})();