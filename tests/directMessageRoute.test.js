import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDirectMessagePath,
  decodeDirectMessageUserId,
  directMessagePath,
  encodeDirectMessageUserId,
} from '../src/utils/directMessageRoute.js'

test('encode/decode preserves the user id', () => {
  const userId = 'user_123456'
  const token = encodeDirectMessageUserId(userId)

  assert.equal(token.length, 250)
  assert.equal(decodeDirectMessageUserId(token), userId)
})

test('decode returns empty string for tampered token', () => {
  const token = encodeDirectMessageUserId('user_123456')
  const tampered = `${token.slice(0, 20)}x${token.slice(21)}`

  assert.equal(decodeDirectMessageUserId(tampered), '')
})

test('buildDirectMessagePath keeps the base path without user id', () => {
  assert.equal(buildDirectMessagePath(''), directMessagePath)
})

test('buildDirectMessagePath injects the encoded id in the query string', () => {
  const path = buildDirectMessagePath('target-user')
  const [, queryString] = path.split('?')
  const params = new URLSearchParams(queryString)

  assert.equal(decodeDirectMessageUserId(params.get('id') || ''), 'target-user')
})
