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

  // If the route exists under .routes
  test('should return HTTP 401 for a route which exists, but unauthorized', () =>
    request(app).get('/v1/fragments').auth('wrongemail@email.com', '123123123').expect(401));
});
