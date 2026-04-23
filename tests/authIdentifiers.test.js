import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isEmailLike,
  normalizeEmail,
  normalizeUsername,
  normalizeUsernameLookup,
} from '../src/shared/authIdentifiers.js'

test('normalizeEmail trims and lowercases the email', () => {
  assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com')
})

test('normalizeUsername collapses spaces but keeps content', () => {
  assert.equal(normalizeUsername('  Ada   Lovelace  '), 'Ada Lovelace')
})

test('normalizeUsernameLookup normalizes and lowercases the pseudo', () => {
  assert.equal(normalizeUsernameLookup('  Ada   Lovelace  '), 'ada lovelace')
})

test('isEmailLike distinguishes email and pseudo', () => {
  assert.equal(isEmailLike('user@example.com'), true)
  assert.equal(isEmailLike('Pseudo Du Jour'), false)
})
