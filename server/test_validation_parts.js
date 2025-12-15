
const { z } = require('zod');

try {
    console.log('1. Testing simple string field...');
    const s1 = z.object({ name: z.string() });
    s1.parse({ name: "test" });
    console.log('1. OK');

    console.log('2. Testing password string with min...');
    const s2 = z.object({ pass: z.string().min(8) });
    s2.parse({ pass: "12345678" });
    console.log('2. OK');

    console.log('3. Testing password regex...');
    const s3 = z.object({ pass: z.string().regex(/[0-9]/) });
    s3.parse({ pass: "1" });
    console.log('3. OK');

    console.log('4. Testing enum...');
    const s4 = z.object({ role: z.enum(['Management', 'Teacher']) });
    s4.parse({ role: "Management" });
    console.log('4. OK');

    console.log('5. Testing record(any)...');
    const s5 = z.object({ extra: z.record(z.any()).optional() });
    s5.parse({ extra: { foo: "bar" } });
    console.log('5. OK');

    console.log('6. Testing FULL password schema...');
    const passwordSchema = z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');
    const s6 = z.object({ password: passwordSchema });
    s6.parse({ password: "Password1!" });
    console.log('6. OK');

} catch (e) {
    console.error('Validation part failed:', e);
}
