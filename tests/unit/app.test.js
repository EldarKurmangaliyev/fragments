const request = require('supertest');

const app = require('../../src/app');


describe('404 Handler', () => {
  test('should return a 404 error for a non-existent route', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      error: {
        message: 'not found',
        code: 404,
      },
    });
  });
});
