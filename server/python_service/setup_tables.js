const { Client } = require('pg');
const path = require('path');
// Load from ROOT .env (two levels up from server/python_service)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createClient = () => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL is missing from .env');
        process.exit(1);
    }

    const config = {
        connectionString,
        ssl: { rejectUnauthorized: false }
    };

    return new Client(config);
};

const client = createClient();

const setup = async () => {
    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Org Codes
        console.log('Creating org_codes table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "org_codes" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "code" TEXT UNIQUE NOT NULL,
                "type" TEXT NOT NULL,
                "institute_id" TEXT,
                "created_by" UUID,
                "created_at" TIMESTAMPTZ DEFAULT NOW(),
                "is_active" BOOLEAN DEFAULT TRUE
            );
        `);

        // 2. Teachers
        console.log('Creating teachers table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "teachers" (
                "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
                "title" TEXT,
                "department" TEXT,
                "institute_id" TEXT,
                "reporting_to" UUID,
                "class_id" TEXT, 
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 3. Students
        console.log('Creating students table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "students" (
                "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
                "roll_number" TEXT,
                "class_id" TEXT,
                "parent_id" UUID,
                "institute_id" TEXT,
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 4. Parents
        console.log('Creating parents table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "parents" (
                "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
                "child_ids" UUID[], -- Array of student UUIDs
                "institute_id" TEXT,
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 5. Institutions
        console.log('Creating institutions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "institutions" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" TEXT NOT NULL,
                "code" TEXT UNIQUE,
                "address" TEXT,
                "created_at" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('Tables created successfully!');
    } catch (err) {
        console.error('Error creating tables:', err);
        // Do not crash the process, just log
    } finally {
        await client.end();
    }
};

setup();
