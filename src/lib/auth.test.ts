import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  sanitizeNextPath,
  verifySessionToken,
} from './auth';

afterEach(() => {
  process.env.SESSION_SECRET = undefined;
  process.env.ADMIN_PASSWORD = undefined;
});

describe('auth session tokens', () => {
  it('accepts a valid token', () => {
    process.env.SESSION_SECRET = 'test-secret';

    const token = createSessionToken(Date.now() + 60_000);

    assert.equal(verifySessionToken(token), true);
  });

  it('rejects an expired token', () => {
    process.env.SESSION_SECRET = 'test-secret';

    const token = createSessionToken(Date.now() - 1_000);

    assert.equal(verifySessionToken(token), false);
  });

  it('rejects a tampered token', () => {
    process.env.SESSION_SECRET = 'test-secret';

    const token = createSessionToken(Date.now() + 60_000);
    const [payload, signature] = token.split('.');
    const tamperedToken = `${payload}.${signature}broken`;

    assert.equal(verifySessionToken(tamperedToken), false);
  });

  it('rejects a token signed with a different secret', () => {
    process.env.SESSION_SECRET = 'first-secret';

    const token = createSessionToken(Date.now() + 60_000);
    process.env.SESSION_SECRET = 'second-secret';

    assert.equal(verifySessionToken(token), false);
  });
});

describe('sanitizeNextPath', () => {
  it('keeps safe relative paths', () => {
    assert.equal(sanitizeNextPath('/gallery?page=2'), '/gallery?page=2');
  });

  it('rejects external redirects', () => {
    assert.equal(sanitizeNextPath('https://example.com'), '/');
    assert.equal(sanitizeNextPath('//example.com'), '/');
    assert.equal(sanitizeNextPath('gallery'), '/');
  });
});
