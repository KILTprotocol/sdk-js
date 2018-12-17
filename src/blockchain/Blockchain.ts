/**
 * @module SDK
 */
import Crypto from '../crypto/Crypto'
import { ApiPromise } from '@polkadot/api'
import { WsProvider } from '@polkadot/rpc-provider'
import Identity from '../identity/Identity'
import pair from '@polkadot/keyring/pair'
import SubmittableExtrinsic from '@polkadot/api/promise/SubmittableExtrinsic'
import Hash from '@polkadot/types/Hash'

export default class Blockchain {

  public static DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

  private constructor () { }

  public static async connect (host: string = Blockchain.DEFAULT_WS_ADDRESS): Promise<ApiPromise> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create(provider)
    return api
  }

  public static async ctypeHash (api: ApiPromise, identity: Identity, schema: string) {
    const keyringPair = pair({ publicKey: identity.signKeyPair.publicKey, secretKey: identity.signKeyPair.secretKey })
    const address = keyringPair.address()

    const nonce = await api.query.system.accountNonce(address)
    if (!nonce) {
      throw Error(`Nonce not found for account ${address}`)
    }

    const schemaHash = Crypto.hash(schema)
    const signature = Crypto.sign(schemaHash, identity.signKeyPair.secretKey)
    const ctypeAdd = await api.tx.ctype.add(schemaHash, signature)
    const signed: SubmittableExtrinsic = ctypeAdd.sign(keyringPair, nonce.toHex())
    const hashed: Hash = await signed.send()
    return hashed
  }
}
