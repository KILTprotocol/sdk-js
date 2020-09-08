import Message, { IRequestTerms, MessageBodyType } from './messaging'
import Identity from './identity'

async function stuff() {
  const sender = await Identity.buildFromMnemonic()
  const recipient = await Identity.buildFromMnemonic()
  console.log(`sender pubId ${JSON.stringify(sender.getPublicIdentity())}`)
  console.log(`recipient address ${recipient.address}`)
  const body: IRequestTerms = {
    type: MessageBodyType.REQUEST_TERMS,
    content: { cTypeHash: '0x1234' },
  }
  const message = new Message(body, sender, recipient.getPublicIdentity())
  const didcommMessage = await message.getDIDComm(
    [recipient.getPublicIdentity()],
    sender
  )
  console.log(didcommMessage)
  console.log(await Message.decryptDIDComm(didcommMessage, recipient))
}

stuff()
