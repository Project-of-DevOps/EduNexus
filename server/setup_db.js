const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase in hosted environments
});

const setup = async () => {
    try {
        await client.connect();
        console.log('Connected to database...');

        // Cleanup
        console.log('Dropping existing tables...');
        await client.query(`DROP TABLE IF EXISTS "users" CASCADE`);
        await client.query(`DROP TABLE IF EXISTS "management_users" CASCADE`); // Cleanup old one
        await client.query(`DROP TABLE IF EXISTS "email_verifications" CASCADE`);
        await client.query(`DROP TABLE IF EXISTS "password_resets" CASCADE`);
        await client.query(`DROP TABLE IF EXISTS "org_code_requests" CASCADE`);

        // Create Users
        console.log('Creating users table...');
        await client.query(`
            CREATE TABLE "users" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" TEXT,
                "email" TEXT UNIQUE NOT NULL,
                "password_hash" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "extra" JSONB DEFAULT '{}',
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Create Email Verifications
        console.log('Creating email_verifications table...');
        await client.query(`
            CREATE TABLE "email_verifications" (
                "email" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires_at" TIMESTAMPTZ NOT NULL,
                PRIMARY KEY ("token")
            );
        `);

        // Create Password Resets
        console.log('Creating password_resets table...');
        await client.query(`
            CREATE TABLE "password_resets" (
                "email" TEXT NOT NULL,
                "otp" TEXT NOT NULL,
                "expires_at" TIMESTAMPTZ NOT NULL
            );
        `);

        // Create Org Code Requests
        console.log('Creating org_code_requests table...');
        await client.query(`
            CREATE TABLE "org_code_requests" (
                "token" TEXT PRIMARY KEY,
                "management_email" TEXT NOT NULL,
                "org_type" TEXT NOT NULL,
                "institute_id" TEXT,
                "status" TEXT DEFAULT 'pending',
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('Database setup complete!');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await client.end();
    }
};

setup();
