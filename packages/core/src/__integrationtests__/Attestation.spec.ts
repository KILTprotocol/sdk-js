/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/attestation
 */

import type { ICredential, IClaim, KeyringPair } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  createOnChainDidFromSeed,
  DemoKeystore,
  FullDidDetails,
} from '@kiltprotocol/did'
import { BN } from '@polkadot/util'
import { Crypto } from '@kiltprotocol/utils'
import { randomAsHex } from '@polkadot/util-crypto'
import { Attestation } from '../attestation/Attestation'
import { getRevokeTx, getRemoveTx } from '../attestation/Attestation.chain'
import { Credential } from '../credential/Credential'
import { disconnect, init } from '../kilt'
import { Claim } from '../claim/Claim'
import { CType } from '../ctype/CType'
import { RequestForAttestation } from '../requestforattestation/RequestForAttestation'
import {
  CtypeOnChain,
  DriversLicense,
  IsOfficialLicenseAuthority,
  devFaucet,
  WS_ADDRESS,
  keypairFromRandom,
} from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

let tokenHolder: KeyringPair
let signer: DemoKeystore
let attester: FullDidDetails
let anotherAttester: FullDidDetails
let claimer: FullDidDetails

beforeAll(async () => {
  await init({ address: WS_ADDRESS })
  tokenHolder = devFaucet
  signer = new DemoKeystore()
  ;[attester, anotherAttester, claimer] = await Promise.all([
    createOnChainDidFromSeed(tokenHolder, signer, randomAsHex()),
    createOnChainDidFromSeed(tokenHolder, signer, randomAsHex()),
    createOnChainDidFromSeed(tokenHolder, signer, randomAsHex()),
  ])
}, 30_000)

beforeEach(async () => {
  await Promise.all(
    [attester, anotherAttester, claimer].map((i) => i.refreshTxIndex())
  )
})

it('fetches the correct deposit amount', async () => {
  const depositAmount = await Attestation.queryDepositAmount()
  expect(depositAmount.toString()).toStrictEqual(
    new BN(1000000000000000).toString()
  )
})

describe('handling attestations that do not exist', () => {
  const claimHash = Crypto.hashStr('abcde')
  it('Attestation.query', async () => {
    return expect(Attestation.query(claimHash)).resolves.toBeNull()
  }, 30_000)

  it('Attestation.revoke', async () => {
    return expect(
      Attestation.getRemoveTx(claimHash, 0)
        .then((tx) =>
          attester.authorizeExtrinsic(tx, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)

  it('Attestation.remove', async () => {
    return expect(
      Attestation.getRemoveTx(claimHash, 0)
        .then((tx) =>
          attester.authorizeExtrinsic(tx, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', () => {
  beforeAll(async () => {
    const ctypeExists = await CtypeOnChain(DriversLicense)
    if (!ctypeExists) {
      await attester
        .authorizeExtrinsic(
          await DriversLicense.store(),
          signer,
          tokenHolder.address
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    }
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.did
    )
    const request = RequestForAttestation.fromClaim(claim)
    await request.signWithDid(signer, claimer)
    expect(request.verifyData()).toBe(true)
    await expect(request.verifySignature()).resolves.toBe(true)
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.did
    )
    const request = RequestForAttestation.fromClaim(claim)
    expect(request.verifyData()).toBe(true)
    await request.signWithDid(signer, claimer)
    await expect(request.verifySignature()).resolves.toBe(true)
    const attestation = Attestation.fromRequestAndDid(request, attester.did)
    await attestation
      .getStoreTx()
      .then((call) =>
        attester.authorizeExtrinsic(call, signer, tokenHolder.address)
      )
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    const credential = Credential.fromRequestAndAttestation(
      request,
      attestation
    )
    expect(credential.verifyData()).toBe(true)
    await expect(credential.verify()).resolves.toBe(true)

    // Claim the deposit back by submitting the getReclaimDepositTx extrinsic with the deposit payer's account.
    await attestation.getReclaimDepositTx().then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )

    // Test that the attestation has been deleted.
    await expect(Attestation.query(attestation.claimHash)).resolves.toBeNull()
    await expect(attestation.checkValidity()).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.did
    )
    const request = RequestForAttestation.fromClaim(claim)
    expect(request.verifyData()).toBe(true)
    await request.signWithDid(signer, claimer)
    await expect(request.verifySignature()).resolves.toBe(true)
    const attestation = Attestation.fromRequestAndDid(request, attester.did)

    const bobbyBroke = keypairFromRandom()

    await expect(
      attestation
        .getStoreTx()
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, bobbyBroke.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, bobbyBroke, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )
    const credential = Credential.fromRequestAndAttestation(
      request,
      attestation
    )

    await expect(credential.verify()).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim on a Ctype that is not on chain', async () => {
    const badCtype = CType.fromSchema({
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'badDriversLicense',
      properties: {
        name: {
          type: 'string',
        },
        weight: {
          type: 'integer',
        },
      },
      type: 'object',
    })

    const content: IClaim['contents'] = { name: 'Ralph', weight: 120 }
    const claim = Claim.fromCTypeAndClaimContents(
      badCtype,
      content,
      claimer.did
    )
    const request = RequestForAttestation.fromClaim(claim)
    const attestation = Attestation.fromRequestAndDid(request, attester.did)
    await expect(
      attestation
        .getStoreTx()
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeNotFound' })
  }, 60_000)

  describe('when there is a credential on-chain', () => {
    let credential: Credential

    beforeAll(async () => {
      const content: IClaim['contents'] = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.did
      )
      const request = RequestForAttestation.fromClaim(claim)
      await request.signWithDid(signer, claimer)
      const attestation = Attestation.fromRequestAndDid(request, attester.did)
      await attestation
        .getStoreTx()
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
      credential = Credential.fromRequestAndAttestation(request, attestation)
      await expect(credential.verify()).resolves.toBe(true)
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(
        credential.attestation
          .getStoreTx()
          .then((call) =>
            attester.authorizeExtrinsic(call, signer, tokenHolder.address)
          )
          .then((tx) =>
            BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
              resolveOn: BlockchainUtils.IS_IN_BLOCK,
              reSign: true,
            })
          )
      ).rejects.toMatchObject({
        section: 'attestation',
        name: 'AlreadyAttested',
      })
    }, 15_000)

    it('should not be possible to use attestation for different claim', async () => {
      const content = { name: 'Rolfi', age: 19 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.did
      )
      const request = RequestForAttestation.fromClaim(claim)
      await request.signWithDid(signer, claimer)
      const fakecredential: ICredential = {
        request,
        attestation: credential.attestation,
      }

      await expect(Credential.verify(fakecredential)).resolves.toBeFalsy()
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(
        getRevokeTx(credential.getHash(), 0)
          .then((call) =>
            claimer.authorizeExtrinsic(call, signer, tokenHolder.address)
          )
          .then((tx) =>
            BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
              resolveOn: BlockchainUtils.IS_IN_BLOCK,
              reSign: true,
            })
          )
      ).rejects.toMatchObject({ section: 'attestation', name: 'Unauthorized' })
      await expect(credential.verify()).resolves.toBe(true)
    }, 45_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(credential.verify()).resolves.toBe(true)
      await getRevokeTx(credential.getHash(), 0)
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
      await expect(credential.verify()).resolves.toBeFalsy()
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      await getRemoveTx(credential.getHash(), 0)
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    }, 40_000)
  })

  describe('when there is another Ctype that works as a legitimation', () => {
    beforeAll(async () => {
      if (!(await CtypeOnChain(IsOfficialLicenseAuthority))) {
        await IsOfficialLicenseAuthority.store()
          .then((call) =>
            attester.authorizeExtrinsic(call, signer, tokenHolder.address)
          )
          .then((tx) =>
            BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
              resolveOn: BlockchainUtils.IS_IN_BLOCK,
              reSign: true,
            })
          )
      }
      await expect(CtypeOnChain(IsOfficialLicenseAuthority)).resolves.toBe(true)
    }, 45_000)

    it('can be included in a claim as a legitimation', async () => {
      // make credential to be used as legitimation
      const licenseAuthorization = Claim.fromCTypeAndClaimContents(
        IsOfficialLicenseAuthority,
        {
          LicenseType: "Driver's License",
          LicenseSubtypes: 'sportscars, tanks',
        },
        attester.did
      )
      const request1 = RequestForAttestation.fromClaim(licenseAuthorization)
      await request1.signWithDid(signer, claimer)
      const licenseAuthorizationGranted = Attestation.fromRequestAndDid(
        request1,
        anotherAttester.did
      )
      await licenseAuthorizationGranted
        .getStoreTx()
        .then((call) =>
          anotherAttester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
      // make request including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        { name: 'Dominic Toretto', age: 52 },
        claimer.did
      )
      const request2 = RequestForAttestation.fromClaim(iBelieveICanDrive, {
        legitimations: [
          Credential.fromRequestAndAttestation(
            request1,
            licenseAuthorizationGranted
          ),
        ],
      })
      await request2.signWithDid(signer, claimer)
      const LicenseGranted = Attestation.fromRequestAndDid(
        request2,
        attester.did
      )
      await LicenseGranted.getStoreTx()
        .then((call) =>
          attester.authorizeExtrinsic(call, signer, tokenHolder.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, tokenHolder, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
      const license = Credential.fromRequestAndAttestation(
        request2,
        LicenseGranted
      )
      await Promise.all([
        expect(license.verify()).resolves.toBe(true),
        expect(licenseAuthorizationGranted.checkValidity()).resolves.toBe(true),
      ])
    }, 70_000)
  })
})

afterAll(() => {
  disconnect()
})
