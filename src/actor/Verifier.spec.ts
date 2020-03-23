import { Verifier } from '..'
import { MessageBodyType } from '../messaging/Message'

describe('Verifier', () => {
  it('request privacy enhanced presentation', async () => {
    const [session, request] = await Verifier.newRequest()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        attributes: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true)
    expect(session).toBeDefined()
    expect(request.content.allowPE).toBeTruthy()
    expect(request.content.peRequest).toBeDefined()
    expect(request.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    expect(request.content.ctypes).toEqual(['this is a ctype hash'])
  })

  it('request public presentation', async () => {
    const [session, request] = await Verifier.newRequest()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        attributes: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false)
    expect(session).toBeDefined()
    expect(request.content.allowPE).toBeFalsy()
    expect(request.content.peRequest).toBeDefined()
    expect(request.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    expect(request.content.ctypes).toEqual(['this is a ctype hash'])
  })
})
