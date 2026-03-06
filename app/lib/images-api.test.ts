import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_IMAGE_PAGE_SIZE,
  clampImageListLimit,
  parseDeleteKeys,
  parseImageListQuery,
} from './images-api';

describe('parseImageListQuery', () => {
  it('uses defaults when params are missing', () => {
    const result = parseImageListQuery(new URL('https://example.com/api/images'));

    assert.deepEqual(result, {
      limit: DEFAULT_IMAGE_PAGE_SIZE,
      cursor: null,
      prefix: '',
    });
  });

  it('clamps oversized limits and keeps cursor/prefix', () => {
    const result = parseImageListQuery(
      new URL('https://example.com/api/images?limit=500&cursor=abc123&prefix=gallery/')
    );

    assert.deepEqual(result, {
      limit: clampImageListLimit(500),
      cursor: 'abc123',
      prefix: 'gallery/',
    });
  });
});

describe('parseDeleteKeys', () => {
  it('supports a single key payload', () => {
    assert.deepEqual(parseDeleteKeys({ key: 'image.webp' }), ['image.webp']);
  });

  it('normalizes key arrays', () => {
    assert.deepEqual(
      parseDeleteKeys({ keys: ['a.webp', 'a.webp', '  ', 'b.webp'] }),
      ['a.webp', 'b.webp']
    );
  });

  it('returns an empty array for invalid payloads', () => {
    assert.deepEqual(parseDeleteKeys(null), []);
    assert.deepEqual(parseDeleteKeys({ keys: [123, false] }), []);
  });
});
