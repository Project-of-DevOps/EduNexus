const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const loadCollection = (name) => {
    const file = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Failed to load ${name}`, e);
        return [];
    }
};

const saveCollection = (name, data) => {
    const file = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Generic helpers
const find = (collection, predicate) => loadCollection(collection).find(predicate);
const filter = (collection, predicate) => loadCollection(collection).filter(predicate);
const insert = (collection, item) => {
    const data = loadCollection(collection);
    const newItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...item };
    data.push(newItem);
    saveCollection(collection, data);
    return newItem;
};
const update = (collection, predicate, updates) => {
    const data = loadCollection(collection);
    const idx = data.findIndex(predicate);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updated_at: new Date().toISOString() };
    saveCollection(collection, data);
    return data[idx];
};
const remove = (collection, predicate) => {
    const data = loadCollection(collection);
    const newData = data.filter(item => !predicate(item));
    saveCollection(collection, newData);
};

module.exports = {
    users: {
        create: (user) => insert('users', user),
        findByEmail: (email) => find('users', u => u.email.toLowerCase() === email.toLowerCase()),
        findById: (id) => find('users', u => u.id === id),
        update: (id, updates) => update('users', u => u.id === id, updates),
        all: () => loadCollection('users')
    },
    orgCodeRequests: {
        create: (req) => insert('org_code_requests', { ...req, status: 'pending' }),
        findByToken: (token) => find('org_code_requests', r => r.token === token),
        findPending: (email, orgType, instituteId) => find('org_code_requests', r => r.status === 'pending' && r.org_type === orgType && (r.institute_id === instituteId || r.management_email === email)),
        updateStatus: (token, status) => update('org_code_requests', r => r.token === token, { status })
    },
    passwordResets: {
        create: (reset) => insert('password_resets', reset),
        findValid: (email, otp) => find('password_resets', r => r.email === email && r.otp === otp && new Date(r.expires_at) > new Date()),
        deleteByEmail: (email) => remove('password_resets', r => r.email === email)
    },
    emailVerifications: {
        create: (ver) => insert('email_verifications', ver),
        findValid: (token) => find('email_verifications', r => r.token === token && new Date(r.expires_at) > new Date()),
        deleteByToken: (token) => remove('email_verifications', r => r.token === token)
    },
    auditLogs: {
        log: (entry) => insert('audit_logs', entry)
    }
};
