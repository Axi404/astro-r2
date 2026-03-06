import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { getLoginPath, sanitizeNextPath } from './auth';

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

describe('getLoginPath', () => {
  it('uses /login for the homepage', () => {
    assert.equal(getLoginPath(new URL('https://example.com/')), '/login');
  });

  it('preserves safe next paths', () => {
    assert.equal(
      getLoginPath(new URL('https://example.com/gallery?page=2')),
      '/login?next=%2Fgallery%3Fpage%3D2'
    );
  });
});
