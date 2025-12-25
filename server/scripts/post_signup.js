const axios = require('axios');
(async ()=>{
  try{
    const res = await axios.post('http://localhost:4000/api/py/signup', { name: 'Test Manager 2', email: 'manager2@test.local', password: 'Password123!', role: 'Management' }, { timeout: 15000 });
    console.log('status', res.status);
    console.log('data', res.data);
  } catch (e) {
    if (e.response) console.error('ERR status', e.response.status, 'data', e.response.data);
    else console.error('ERR', e.message);
  }
})();