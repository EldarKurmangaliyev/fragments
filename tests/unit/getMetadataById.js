// tests/unit/get.test.js
const hash = require('../../src/hash');

const request = require('supertest');
var md = require('markdown-it')();

const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

describe('GET /v1/fragments', () => {
  // If the request is missing the Authorization header, it should be forbidden
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123123123/info').expect(401));

  // If the wrong username/password pair are used (no such user), it should be forbidden
  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/123123123/info')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  test('authenticated users attempts to get data for a fragment which does not exist', async () => {
    const res = await request(app)
      .get('/v1/fragments/abcdef/info')
      .auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(404);
    expect(Array.isArray(res.body.fragments)).toBe(false);
  });

  test('authenticated users request a text/html fragment that does exist', async () => {
    const user = hash('user1@email.com');
    const data = 'This is my test string';
    const fragment = new Fragment({
      ownerId: user,
      type: 'text/html',
      size: 0,
    });
    await fragment.setData(Buffer.from(data, 'utf8'));
    await fragment.save();
    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}/info`)
      .auth('user1@email.com', 'password1');
    const jsonFragment = JSON.parse(res.text);

    expect(res.statusCode).toBe(200);
    expect(jsonFragment.status).toBe('ok');
    expect(jsonFragment.fragment).toStrictEqual(JSON.parse(JSON.stringify(fragment)));
  });

  test('authenticated users request a text/markdown fragment with .html extension for a fragment that does exist', async () => {
    const user = hash('user1@email.com');
    const data = 'This is my test string';
    const fragment = new Fragment({
      ownerId: user,
      type: 'text/markdown',
      size: 0,
    });
    await fragment.setData(Buffer.from(data, 'utf8'));
    await fragment.save();
    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.html`)
      .auth('user1@email.com', 'password1');
    const fragmentJSON = JSON.parse(res.text);

    expect(res.statusCode).toBe(200);
    expect(fragmentJSON.status).toBe('ok');
    expect(fragmentJSON.fragment).toStrictEqual(md.render(data.toString()));
  });

  test('authenticated users request a text/markdown fragment with unsupported extension json', async () => {
    const user = hash('user1@email.com');
    const data = 'This is my test string';
    const fragment = new Fragment({
      ownerId: user,
      type: 'text/markdown',
      size: 0,
    });
    await fragment.setData(Buffer.from(data, 'utf8'));
    await fragment.save();
    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}.json`)
      .auth('user1@email.com', 'password1');
    const fragmentJSON = JSON.parse(res.text);

    expect(res.statusCode).toBe(415);
    expect(fragmentJSON.code).toBe(415);
    expect(fragmentJSON.message).toBe(
      'Requested extension of .json is not supported for this fragment.'
    );
  });
});
