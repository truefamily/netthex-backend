import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProfilePath } from '../src/utils/profileRoute.js'

test('buildProfilePath returns the base profile route without user id', () => {
  assert.equal(buildProfilePath(''), '/user/profile')
})

test('buildProfilePath appends the user id query parameter', () => {
  assert.equal(buildProfilePath('abc123'), '/user/profile?id=abc123')
})
