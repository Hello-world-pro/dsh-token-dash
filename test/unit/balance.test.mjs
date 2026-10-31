import test from 'node:test'
import assert from 'node:assert/strict'
import { readBalance } from '../../src/balance.js'

function fakeContext(balance) {
  return {
    get(name) {
      if (name === 'deepseekAccount') return { getBalance: async () => balance }
      if (name === 'credentials') return { resolve: async () => undefined }
      return undefined
    },
  }
}

test('余额计入充值 + 赠金', async () => {
  const ctx = fakeContext({
    status: 'ready',
    value: [{ currency: 'CNY', balance: '10.00' }],
    bonusWallets: [{ currency: 'CNY', balance: '5.00' }],
  })
  const result = await readBalance(ctx, { showBalance: true })
  assert.equal(result.status, 'ok')
  assert.equal(result.amount, 15)
})

test('关闭余额返回 hidden 且不请求', async () => {
  let called = false
  const ctx = {
    get(name) {
      if (name === 'deepseekAccount') {
        return {
          getBalance: async () => {
            called = true
            return null
          },
        }
      }
      return undefined
    },
  }
  const result = await readBalance(ctx, { showBalance: false })
  assert.equal(result.status, 'hidden')
  assert.equal(called, false)
})
