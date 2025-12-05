const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
    console.log('.env file not found.');
    process.exit(0);
}

let content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');
const newLines = [];
let hasViteUrl = false;
let hasViteKey = false;
let supabaseUrl = '';
let supabaseKey = '';

lines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) hasViteUrl = true;
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) hasViteKey = true;

    if (line.startsWith('SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
    }
});

let updated = false;

if (!hasViteUrl && supabaseUrl) {
    console.log('Adding VITE_SUPABASE_URL...');
    content += `\nVITE_SUPABASE_URL=${supabaseUrl}`;
    updated = true;
} else if (hasViteUrl) {
    console.log('VITE_SUPABASE_URL already exists.');
}

if (!hasViteKey && supabaseKey) {
    console.log('Adding VITE_SUPABASE_ANON_KEY...');
    content += `\nVITE_SUPABASE_ANON_KEY=${supabaseKey}`;
    updated = true;
} else if (hasViteKey) {
    console.log('VITE_SUPABASE_ANON_KEY already exists.');
}

if (updated) {
    fs.writeFileSync(envPath, content);
    console.log('.env file updated successfully.');
} else {
    console.log('No changes needed.');
}
