import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCloudinaryPublicId,
  buildCloudinarySignature,
  buildSignedUploadPayload,
} from '../src/server/cloudinarySignature.js'
import {
  buildUploadFolder,
  formatMaxBytes,
  validateImageUploadFile,
} from '../src/config/uploadPolicy.js'

test('buildCloudinarySignature sorts params before hashing', () => {
  const signature = buildCloudinarySignature(
    {
      timestamp: 1700000000,
      public_id: 'user-demo-file',
      folder: 'netthex/users/user_demo',
    },
    'topsecret',
  )

  assert.equal(signature, '0de3d9b50082d279c2d0268e5efaf800e53e447e')
})

test('buildSignedUploadPayload returns deterministic signed params', () => {
  const payload = buildSignedUploadPayload({
    uploadType: 'user',
    userId: 'user:42',
    apiKey: 'public-key',
    apiSecret: 'topsecret',
    timestamp: 1700000000,
    publicId: 'user-user_42-avatar',
  })

  assert.deepEqual(payload, {
    uploadType: 'user',
    apiKey: 'public-key',
    timestamp: 1700000000,
    folder: 'netthex/users/user_42',
    publicId: 'user-user_42-avatar',
    signature: '02942849bb26566ee5146dffa859655af5a4f2ba',
  })
})

test('buildCloudinaryPublicId sanitizes values', () => {
  const publicId = buildCloudinaryPublicId({
    uploadType: 'group',
    userId: 'user:42',
    suffix: 'cover/image',
  })

  assert.equal(publicId, 'group-user_42-cover_image')
})

test('buildUploadFolder sanitizes the user id', () => {
  assert.equal(buildUploadFolder('group', 'user:42'), 'netthex/groups/user_42')
})

test('validateImageUploadFile rejects unsupported formats', () => {
  assert.throws(
    () =>
      validateImageUploadFile(
        {
          type: 'image/svg+xml',
          size: 1024,
        },
        'user',
      ),
    /Formats acceptes/,
  )
})

test('validateImageUploadFile rejects oversized files', () => {
  assert.throws(
    () =>
      validateImageUploadFile(
        {
          type: 'image/png',
          size: 6 * 1024 * 1024,
        },
        'user',
      ),
    /5 Mo/,
  )
})

test('formatMaxBytes renders whole megabytes cleanly', () => {
  assert.equal(formatMaxBytes(5 * 1024 * 1024), '5 Mo')
})
