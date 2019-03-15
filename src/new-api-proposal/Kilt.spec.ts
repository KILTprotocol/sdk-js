import Kilt from './Kilt'
import { AttestationModule } from './AttestationModule'
import { IRequestForAttestation } from 'src/requestforattestation/RequestForAttestation'
import { Identity } from 'src'
import { IAttestation } from './Attestation'
import { TxStatus } from './TxStatus'
import { BalanceModule } from './BalanceModule'
import { CTypeModule } from './CTypeModule'
import { ICType } from './CType'
import { CTypeSchema, CtypeMetadata } from 'src/ctype/CType'

describe('Kilt', async () => {
  const identity: Identity = {} as Identity

  // connect to Kilt chain
  const kilt: Kilt = await Kilt.connect()

  it('test attestations', async () => {
    const requestForAttestation = {} as IRequestForAttestation

    const attestations: AttestationModule = kilt.attestations()
    // create new attestation
    const attestation: IAttestation = attestations.create(
      requestForAttestation,
      identity
    )
    let txStatus: TxStatus = await attestation.store(identity)
    console.log(txStatus)

    // query existing attestations
    const allAttestationForClaimHash: IAttestation[] = await attestations.query(
      'myClaimHash'
    )
    console.log('allAttestationsForClaimHash', allAttestationForClaimHash)
    allAttestationForClaimHash.forEach(async (att: IAttestation) => {
      console.log(await att.verify())
    })

    // pick an attestation
    const anyAttestation: IAttestation = allAttestationForClaimHash[0]

    // verify attestation
    console.log(await anyAttestation.verify()) // true

    // revoke attestation
    txStatus = await anyAttestation.revoke(identity)
    console.log(txStatus)

    // verify again
    console.log(await anyAttestation.verify()) // false

    // revoke all by delegation node id
    console.log(await attestations.revokeAll('myDelegationNodeId'))
  })

  it('test balance', async () => {
    const balances: BalanceModule = kilt.balances()

    // get balance
    const balance: number = await balances.getBalance('myAccountAdress')
    console.log('my balance:', balance)

    // make money transfer
    const txStatus: TxStatus = await balances.makeTransfer(
      identity,
      'receiverAccountAddress',
      100
    )
    console.log(txStatus)

    // listen to balance changes
    balances.listenToBalanceChanges(
      'myAccountAddress',
      (account: string, bal: number, change: number) => {
        console.log('balances changed to', bal)
      }
    )
  })

  it('test CTYPE', async () => {
    const cTypes: CTypeModule = kilt.CTYPEs()

    // create CTYPE from input model
    const anInputModel = {}
    const cType: ICType = cTypes.createFromInputModel(anInputModel)

    // store the CTYPE on chain
    const txStatus: TxStatus = await cType.store(identity)
    console.log('status', txStatus)

    // check if CTYPE is stored on chain
    const stored: boolean = await cTypes.verifyStored('myCtypeHash')
    console.log(stored)

    // build CTYPE from existing hash + schema + metadata
    const schema = {} as CTypeSchema
    const metadata = {} as CtypeMetadata
    const hash = 'myCtypeHash'
    const rebuiltCtype: ICType = cTypes.create(schema, metadata, hash)

    // verify CTYPE is on chain
    const rebuiltCtypeStored: boolean = await rebuiltCtype.verifyStored()
    console.log('stored', rebuiltCtypeStored)
  })
})
