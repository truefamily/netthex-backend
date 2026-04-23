import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearProfilePhotoSetupPending,
  isProfilePhotoSetupPending,
  markProfilePhotoSetupPending,
} from '../src/utils/profilePhotoSetup.js'

const createSessionStorageMock = () => {
  const store = new Map()

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

test('profile photo setup helpers are safe without window', () => {
  const originalWindow = globalThis.window
  delete globalThis.window

  assert.equal(isProfilePhotoSetupPending(), false)
  assert.doesNotThrow(() => markProfilePhotoSetupPending())
  assert.doesNotThrow(() => clearProfilePhotoSetupPending())

  globalThis.window = originalWindow
})

test('profile photo setup helpers write to sessionStorage', () => {
  const originalWindow = globalThis.window
  globalThis.window = {
    sessionStorage: createSessionStorageMock(),
  }

  assert.equal(isProfilePhotoSetupPending(), false)

  markProfilePhotoSetupPending()
  assert.equal(isProfilePhotoSetupPending(), true)

  clearProfilePhotoSetupPending()
  assert.equal(isProfilePhotoSetupPending(), false)

  globalThis.window = originalWindow
})
