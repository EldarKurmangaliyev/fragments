// tests/unit/get.test.js

const request = require('supertest');

const app = require('../../src/app');
require('dotenv').config();

describe('POST /v1/fragments', () => {
  // If the request is missing the Authorization header, it should be forbidden
  test('unauthenticated requests are denied', () => request(app).get('/v1/fragments').expect(401));

  // If the wrong username/password pair are used (no such user), it should be forbidden
  test('incorrect credentials are denied', () =>
    request(app).get('/v1/fragments').auth('invalid@email.com', 'incorrect_password').expect(401));

  // Using a valid username/password pair should give a success result with a .fragments array
  test('authenticated users get a fragments array', async () => {
    const res = await request(app).get('/v1/fragments').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  test('fragment without data does not work', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .send();
    expect(res.statusCode).toBe(415);
  });
  test('response include a Location header with a URL to GET the fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is fragment');
    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toEqual(
      `${process.env.API_URL}/v1/fragments/${JSON.parse(res.text).fragment.id}`
    );
  });
  test('get unsupported type error', () =>
    request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'audio/mpeg')
      .auth('user1@email.com', 'password1')
      .send('aa')
      .expect(415));
});
