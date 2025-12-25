const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // server/.env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); // root/.env
const { pool } = require('../db');

const BASE_URL = 'http://localhost:4000';

async function resetDb() {
    console.log('--- Reseting DB ---');
    // Simple truncation of tables in order
    await pool.query(`
    TRUNCATE users, organizations, org_members, classes, class_assignments, student_enrollments, parent_student_links, email_verifications, org_code_requests CASCADE;
  `);
}

async function run() {
    try {
        await resetDb();

        console.log('\n--- 1. Signup Management ---');
        const mgmtRes = await axios.post(`${BASE_URL}/api/py/signup`, {
            name: 'Director Skinner',
            email: 'skinner@edu.local',
            password: 'Pass123!',
            role: 'Management',
            extra: {
                instituteName: 'Springfield Elementary',
                instituteType: 'school',
                uniqueId: 'SCH-TEST'
            }
        });
        console.log('Management Signup:', mgmtRes.data.success);
        const mgmtToken = (await axios.post(`${BASE_URL}/api/py/signin`, {
            email: 'skinner@edu.local', password: 'Pass123!', role: 'Management'
        })).data.token;

        console.log('\n--- 2. Signup Teachers (Request) ---');
        const tNames = ['Edna', 'Hoover', 'Largo', 'Willie'];
        for (const name of tNames) {
            const res = await axios.post(`${BASE_URL}/api/py/signup`, {
                name,
                email: `${name.toLowerCase()}@edu.local`,
                password: 'Pass123!',
                role: 'Teacher',
                extra: {
                    uniqueId: 'SCH-TEST',
                    schoolName: 'Springfield Elementary', // Must match
                    orgType: 'school'
                }
            });
            console.log(`Teacher ${name} Signup:`, res.data.success, 'Pending:', res.data.pendingApproval);
            if (!res.data.pendingApproval) throw new Error('Teacher should be pending');
        }

        console.log('\n--- 3. Management: List Pending ---');
        const pendingRes = await axios.get(`${BASE_URL}/api/org/members?status=pending`, {
            headers: { Authorization: `Bearer ${mgmtToken}` }
        });
        console.log('Pending Count:', pendingRes.data.members.length);
        if (pendingRes.data.members.length !== 4) throw new Error('Expected 4 pending');

        console.log('\n--- 4. Management: Approve Teachers & Create Class ---');
        // Create Class
        const classRes = await axios.post(`${BASE_URL}/api/org/classes`, { name: 'Class 4-A' }, {
            headers: { Authorization: `Bearer ${mgmtToken}` }
        });
        const classId = classRes.data.class.id;
        console.log('Class Created:', classRes.data.class.name, classId);

        // Approve Edna as Class Teacher for 4-A
        const edna = pendingRes.data.members.find(m => m.name === 'Edna');
        await axios.post(`${BASE_URL}/api/org/members/approve`, {
            memberId: edna.id,
            roleTitle: 'Class Teacher',
            classId: classId
        }, { headers: { Authorization: `Bearer ${mgmtToken}` } });
        console.log('Approved Edna');

        // Approve Hoover as Subject Teacher (No class)
        const hoover = pendingRes.data.members.find(m => m.name === 'Hoover');
        await axios.post(`${BASE_URL}/api/org/members/approve`, {
            memberId: hoover.id,
            roleTitle: 'Subject Teacher'
        }, { headers: { Authorization: `Bearer ${mgmtToken}` } });
        console.log('Approved Hoover');

        console.log('\n--- 5. Student Signup (Public Class List) ---');
        const pubClasses = await axios.get(`${BASE_URL}/api/public/classes?code=SCH-TEST`);
        console.log('Public Classes:', pubClasses.data.classes);
        if (!pubClasses.data.classes.find(c => c.id === classId)) throw new Error('Class 4-A not found public');

        const sNames = ['Bart', 'Lisa'];
        for (const name of sNames) {
            const res = await axios.post(`${BASE_URL}/api/py/signup`, {
                name,
                email: `${name.toLowerCase()}@edu.local`,
                password: 'Pass123!',
                role: 'Student',
                extra: {
                    uniqueId: 'SCH-TEST',
                    classId: classId
                }
            });
            console.log(`Student ${name} Signup:`, res.data.success);
        }

        console.log('\n--- 6. Parent Signup & Link ---');
        const parentRes = await axios.post(`${BASE_URL}/api/py/signup`, {
            name: 'Homer',
            email: 'homer@edu.local',
            password: 'Pass123!',
            role: 'Parent',
            extra: {
                studentEmail: 'bart@edu.local' // Link first student
            }
        });
        console.log('Parent Signup:', parentRes.data.success);

        // Login Parent
        const parentToken = (await axios.post(`${BASE_URL}/api/py/signin`, {
            email: 'homer@edu.local', password: 'Pass123!', role: 'Parent'
        })).data.token;

        // Check Linked Students (should have Bart)
        const linked = await axios.get(`${BASE_URL}/api/parent/students`, {
            headers: { Authorization: `Bearer ${parentToken}` }
        });
        console.log('Linked Students:', linked.data.students.map(s => s.name));
        if (linked.data.students.length < 1) throw new Error('Parent should have students');

        console.log('\n--- SUCCESS: Strict Flow Verified ---');

    } catch (e) {
        console.error('TEST FAILED:', e.response ? e.response.data : e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
