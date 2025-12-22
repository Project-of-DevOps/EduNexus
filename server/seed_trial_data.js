const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('./db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const PASSWORD = 'password123';

async function seed() {
    console.log('Starting seed process...');

    try {
        const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

        // Define Students
        const students = [
            { name: 'Student One', email: 'student1@test.com', role: 'Student', password_hash: hashedPassword },
            { name: 'Student Two', email: 'student2@test.com', role: 'Student', password_hash: hashedPassword },
            { name: 'Student Three', email: 'student3@test.com', role: 'Student', password_hash: hashedPassword }
        ];

        // Define Parents
        const parents = [
            { name: 'Parent One', email: 'parent1@test.com', role: 'Parent', password_hash: hashedPassword },
            { name: 'Parent Two', email: 'parent2@test.com', role: 'Parent', password_hash: hashedPassword }
        ];

        console.log('Creating/Updating Students...');
        const createdStudents = [];
        for (const s of students) {
            // Check if exists
            let user = await db.users.findByEmail(s.email);
            if (!user) {
                user = await db.users.create({
                    name: s.name,
                    email: s.email,
                    password_hash: s.password_hash,
                    role: s.role,
                    extra: { studentProfile: { grade: '10th', section: 'A' } } // improved mock data
                });
                console.log(`Created ${s.email}`);
            } else {
                // Update password ensures we can login
                await db.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [s.password_hash, user.id]);
                console.log(`Updated ${s.email}`);
            }
            createdStudents.push(user);
        }

        console.log('Creating/Updating Parents and Linking...');

        // Parent 1 -> Student 1, Student 2
        let p1 = await db.users.findByEmail(parents[0].email);
        const p1Children = [createdStudents[0].id, createdStudents[1].id];

        if (!p1) {
            p1 = await db.users.create({
                ...parents[0],
                extra: { childIds: p1Children }
            });
            console.log(`Created ${parents[0].email} with 2 children`);
        } else {
            // Upsert childIds
            const extra = p1.extra || {};
            extra.childIds = p1Children;
            await db.pool.query('UPDATE users SET extra = $1, password_hash = $2 WHERE id = $3', [extra, parents[0].password_hash, p1.id]);
            // Refresh object
            p1 = await db.users.findById(p1.id);
            console.log(`Updated ${parents[0].email} linkage`);
        }

        // Parent 2 -> Student 3
        let p2 = await db.users.findByEmail(parents[1].email);
        const p2Children = [createdStudents[2].id];

        if (!p2) {
            p2 = await db.users.create({
                ...parents[1],
                extra: { childIds: p2Children }
            });
            console.log(`Created ${parents[1].email} with 1 child`);
        } else {
            const extra = p2.extra || {};
            extra.childIds = p2Children;
            await db.pool.query('UPDATE users SET extra = $1, password_hash = $2 WHERE id = $3', [extra, parents[1].password_hash, p2.id]);
            p2 = await db.users.findById(p2.id);
            console.log(`Updated ${parents[1].email} linkage`);
        }

        console.log('Back-linking Students to Parents...');
        // Update Student 1 & 2 -> Parent 1
        for (const sId of p1Children) {
            const s = createdStudents.find(st => st.id === sId);
            const extra = s.extra || {};
            extra.parentId = p1.id;
            await db.pool.query('UPDATE users SET extra = $1 WHERE id = $2', [extra, sId]);
        }

        // Update Student 3 -> Parent 2
        for (const sId of p2Children) {
            const s = createdStudents.find(st => st.id === sId);
            const extra = s.extra || {};
            extra.parentId = p2.id;
            await db.pool.query('UPDATE users SET extra = $1 WHERE id = $2', [extra, sId]);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
