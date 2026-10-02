import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { applyPatch } from './manage.mjs';
const sha = text => createHash('sha256').update(text).digest('hex');
const patch = { originalSha256: sha('before'), patchedSha256: sha('after'), operations: [{ before: 'before', after: 'after' }] };
test('applies exact upstream and remains idempotent', () => {
  expect(applyPatch('before', patch)).toBe('after');
  expect(applyPatch('after', patch)).toBe('after');
});
test('rejects altered upstream instead of clobbering changes', () => {
  expect(() => applyPatch('before user change', patch)).toThrow('Source differs');
});
test('rejects a corrupted patch result', () => {
  expect(() => applyPatch('before', { ...patch, operations: [{before:'before',after:'wrong'}] })).toThrow('checksum');
});
