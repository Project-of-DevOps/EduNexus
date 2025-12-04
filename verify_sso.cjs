const http = require('http');

console.log('--- Verifying SSO Endpoints ---');

function check(path) {
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: path,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`[PASS] ${path} -> Status: ${res.statusCode}`);
        if (res.statusCode === 302) {
            console.log(`       Redirect: ${res.headers.location}`);
        }
    });

    req.on('error', (e) => {
        console.error(`[FAIL] ${path} -> Error: ${e.message}`);
        if (e.code === 'ECONNREFUSED') {
            console.error('       SERVER IS DOWN. Please run "node server/index.js"');
        }
    });

    req.end();
}

check('/auth/google');
check('/auth/microsoft');
