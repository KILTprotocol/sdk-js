/**
 * @group unit
 */
import { SubmittableResult } from '@polkadot/api'
import TransactionSubscriptionHandler from './TransactionHandler'

it('waits for finalized', async () => {
  const subHandle = TransactionSubscriptionHandler.getSubscriptionHandle()
  const txHandler = new TransactionSubscriptionHandler(subHandle, jest.fn)

  const callMe = jest.fn()
  const promise = txHandler.Finalized.then((r) => {
    callMe(r)
    return r
  })

  expect(callMe).not.toHaveBeenCalled()
  subHandle.handle(
    new SubmittableResult({
      status: { isReady: true, type: 'Ready' } as any,
      events: [],
    })
  )
  expect(callMe).not.toHaveBeenCalled()
  const status = new SubmittableResult({
    status: { isFinalized: true, type: 'Finalized' } as any,
    events: [],
  })
  subHandle.handle(status)
  await expect(promise).resolves.toBe(status)
  // expect(callMe).toHaveBeenCalled()
})
