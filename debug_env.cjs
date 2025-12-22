const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    console.log('Keys found in .env:');
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=/);
        if (match) {
            console.log(match[1]);
        }
    });
} else {
    console.log('.env file not found');
}
