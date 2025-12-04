
const { z } = require('zod');

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const signupSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    role: z.enum(['Management', 'Teacher', 'Student', 'Parent']),
    extra: z.record(z.any()).optional(),
    _queued: z.boolean().optional()
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['Management', 'Teacher', 'Student', 'Parent']).optional(),
    extra: z.record(z.any()).optional()
});

module.exports = {
    signupSchema,
    loginSchema
};
