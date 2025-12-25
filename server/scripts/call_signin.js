const axios = require('axios');
(async ()=>{
  try{
    const r = await axios.post('http://localhost:4000/api/py/signin', { email: 'nouser@example.com', password: 'Secret123!', role: 'Management' }, { timeout: 5000 });
    console.log('OK', r.status, r.data);
  }catch(e){
    console.error('ERR message:', e.message);
    if (e.response) console.error('ERR status:', e.response.status, 'data:', e.response.data);
    if (e.request) console.error('No response received');
  }
})();