import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

// We'll inject a mock pool into the server module using setPool
const mockQuery = vi.fn();
const mockPool = { query: mockQuery };

describe('server signup audit', () => {
  let app;
  beforeEach(async () => {
    // reset mocks
    mockQuery.mockReset();
    // require fresh app
    const mod = await import('../server/index.js');
    // inject mock pool so server uses our fake pool
    if (typeof mod.setPool === 'function') mod.setPool(mockPool);
    app = mod.app;
  });

  it('inserts user and writes audit row when X-Queued-Signup header present', async () => {
    // Arrange behaviour: first SELECT returns empty (no existing user)
    mockQuery.mockImplementation((sql, params) => {
      if (/SELECT id FROM users/i.test(sql)) return Promise.resolve({ rows: [] });
      if (/INSERT INTO users/i.test(sql)) return Promise.resolve({ rows: [{ id: 'db_1', name: params[0] || null, email: params[1] }] });
      if (/INSERT INTO signup_syncs/i.test(sql)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const resp = await supertest(app)
      .post('/api/signup')
      .set('X-Queued-Signup', '1')
      .send({ name: 'Test', email: 't@example.test', password: 'secret', role: 'Management' })
      .expect(200);

    expect(resp.body.success).toBe(true);

    // verify we called the INSERT into users and into signup_syncs
    const calledInserts = mockQuery.mock.calls.filter(c => /INSERT INTO users/i.test(c[0]) || /INSERT INTO signup_syncs/i.test(c[0]));
    expect(calledInserts.length).toBeGreaterThanOrEqual(2);

    const wroteAudit = mockQuery.mock.calls.some(c => /INSERT INTO signup_syncs/i.test(c[0]));
    expect(wroteAudit).toBe(true);
  });
});
