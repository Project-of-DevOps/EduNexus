
const { signupSchema } = require('./utils/validation');

const payload = {
    name: 'API Test User',
    email: 'api_test_' + Date.now() + '@example.com',
    password: 'Password123!',
    role: 'Management',
    extra: { uniqueId: 'API' + Math.floor(Math.random() * 1000) }
};

try {
    console.log('Testing payload:', payload);
    console.log('Schema:', signupSchema);
    const result = signupSchema.safeParse(payload);
    console.log('Result:', result);
} catch (e) {
    console.error('Validation crashed:', e);
}
