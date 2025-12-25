const axios = require('axios');
(async function(){
  try{
    const r = await axios.post('http://localhost:4000/api/py/check-email', { email: 'test@example.com' }, { timeout: 5000 });
    console.log('OK', r.data);
  } catch (e) {
    console.error('ERR message:', e.message);
    if (e.response) {
      console.error('ERR status:', e.response.status);
      console.error('ERR data:', e.response.data);
    } else {
      console.error('ERR stack:', e.stack);
    }
  }
})();
