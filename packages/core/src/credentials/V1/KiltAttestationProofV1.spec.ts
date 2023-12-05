/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encodeAddress, randomAsHex, randomAsU8a } from '@polkadot/util-crypto'
import { u8aToHex, u8aToU8a } from '@polkadot/util'

import { parse } from '@kiltprotocol/did'
import type { Did } from '@kiltprotocol/types'

import {
  attestation,
  blockHash,
  credential as VC,
  makeAttestationCreatedEvents,
  mockedApi,
  timestamp,
  cType,
  legacyCredential,
} from '../../../../../tests/testUtils/testData.js'
import {
  finalizeProof,
  initializeProof,
  applySelectiveDisclosure,
  verify as verifyOriginal,
} from './KiltAttestationProofV1.js'
import { check as checkStatus } from './KiltRevocationStatusV1.js'
import { credentialIdFromRootHash } from './common.js'
import type { KiltCredentialV1 } from './types.js'
import { fromInput } from './KiltCredentialV1.js'

// the original verify implementation but with a mocked CType loader
const verify: typeof verifyOriginal = async (cred, proof, options) =>
  verifyOriginal(cred, proof, {
    ...options,
    loadCTypes: async (id) => {
      if (id === cType.$id) {
        return cType
      }
      throw new Error('CType could not be resolved')
    },
  })

describe('proofs', () => {
  it('it verifies proof', async () => {
    // verify
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).resolves.not.toThrow()
  })

  it('it verifies status', async () => {
    // verify
    await expect(checkStatus(VC, { api: mockedApi })).resolves.not.toThrow()
  })

  it('it verifies credential with all properties revealed', async () => {
    expect(VC.proof?.salt).toHaveLength(4)
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).resolves.not.toThrow()
  })

  it('applies selective disclosure to proof', async () => {
    const updated = applySelectiveDisclosure(VC, VC.proof, ['name'])
    const { name, id } = VC.credentialSubject
    expect(updated.credential).toHaveProperty('credentialSubject', {
      '@context': expect.any(Object),
      id,
      name,
    })
    expect(Object.entries(updated.proof.salt)).toHaveLength(2)
    await expect(
      verify(updated.credential, updated.proof, { api: mockedApi })
    ).resolves.not.toThrow()
  })

  it('checks delegation node owners', async () => {
    const delegator: Did = `did:kilt:${encodeAddress(randomAsU8a(32), 38)}`
    const credentialWithDelegators: KiltCredentialV1 = {
      ...VC,
      federatedTrustModel: VC.federatedTrustModel?.map((i) => {
        if (i.type === 'KiltAttesterDelegationV1') {
          return { ...i, delegators: [attestation.owner, delegator] }
        }
        return i
      }),
    }
    const parentId = randomAsHex(32)

    mockedApi.query.delegation = {
      delegationNodes: jest.fn(async (nodeId: string | Uint8Array) => {
        switch (u8aToHex(u8aToU8a(nodeId))) {
          case legacyCredential.delegationId:
            return mockedApi.createType(
              'Option<DelegationDelegationHierarchyDelegationNode>',
              {
                parent: parentId,
                details: {
                  owner: parse(attestation.owner).address,
                },
              }
            )
          case parentId:
            return mockedApi.createType(
              'Option<DelegationDelegationHierarchyDelegationNode>',
              {
                parent: randomAsHex(32),
                details: {
                  owner: parse(delegator).address,
                },
              }
            )
          default:
            return mockedApi.createType(
              'Option<DelegationDelegationHierarchyDelegationNode>'
            )
        }
      }),
    } as any

    await expect(
      verify(credentialWithDelegators, credentialWithDelegators.proof!, {
        api: mockedApi,
      })
    ).resolves.not.toThrow()
  })
})

describe('issuance', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: subject, '@context': _, ...claims } = VC.credentialSubject
  const unsigned = fromInput({
    claims,
    subject,
    cType: cType.$id,
    issuer: attestation.owner,
    timestamp: new Date(0),
  })

  it('create a proof via initialize and finalize', async () => {
    const [proofStub, txArgs] = initializeProof(unsigned)
    expect(proofStub.block).toBeFalsy()

    mockedApi.tx.attestation.add(...txArgs)

    // mocking submission
    jest
      .mocked(mockedApi.query.system.events)
      .mockResolvedValueOnce(
        makeAttestationCreatedEvents([
          [
            '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
            txArgs[0],
            txArgs[1],
            txArgs[2],
          ],
        ]) as any
      )

    const attestedCredential = finalizeProof(unsigned, proofStub, {
      blockHash,
      timestamp,
      genesisHash: mockedApi.genesisHash,
    })
    expect(attestedCredential.proof).toHaveProperty(
      'block',
      expect.stringMatching(/[0-9a-zA-Z]+/)
    )

    await expect(
      verify(attestedCredential, attestedCredential.proof!, { api: mockedApi })
    ).resolves.toBeUndefined()
  })
})

describe('negative tests', () => {
  it('errors on proof mismatch', async () => {
    // @ts-ignore
    delete VC.proof
    await expect(
      verify(VC, { type: 'SomeOtherProof' } as any, { api: mockedApi })
    ).rejects.toThrow()
  })

  it('it detects tampering with credential digest', async () => {
    // @ts-ignore
    VC.id = `${VC.id.slice(0, 10)}1${VC.id.slice(11)}`
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).rejects.toThrow()
  })

  it.skip('rejects selecting non-existent properties for presentation', async () => {
    expect(() =>
      applySelectiveDisclosure(VC, VC.proof, ['name', 'age', 'profession'])
    ).toThrow()

    const updated = applySelectiveDisclosure(VC, VC.proof, ['name'])

    expect(() =>
      applySelectiveDisclosure(updated.credential, updated.proof, ['premium'])
    ).toThrow()
  })

  it('it detects tampering with credential fields', async () => {
    VC.federatedTrustModel = [
      {
        type: 'KiltAttesterLegitimationV1',
        id: credentialIdFromRootHash(randomAsU8a(32)),
      },
    ]
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).rejects.toThrow()
  })

  it('it detects tampering on claimed properties', async () => {
    VC.credentialSubject.name = 'Kort'
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).rejects.toThrow()
  })

  it('it fails if attestation not on chain', async () => {
    jest
      .mocked(mockedApi.query.attestation.attestations)
      .mockResolvedValueOnce(
        mockedApi.createType(
          'Option<AttestationAttestationsAttestationDetails>'
        ) as any
      )
    jest
      .mocked(mockedApi.query.system.events)
      .mockResolvedValueOnce(
        mockedApi.createType('Vec<FrameSystemEventRecord>', []) as any
      )
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).rejects.toThrow()
    await expect(checkStatus(cred, { api: mockedApi })).rejects.toThrow()
  })

  it('fails if attestation on chain not identical', async () => {
    jest
      .mocked(mockedApi.query.attestation.attestations)
      .mockResolvedValueOnce(
        mockedApi.createType(
          'Option<AttestationAttestationsAttestationDetails>',
          {}
        ) as any
      )
    jest
      .mocked(mockedApi.query.system.events)
      .mockResolvedValueOnce(makeAttestationCreatedEvents([]) as any)
    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).rejects.toThrow()
    await expect(checkStatus(cred, { api: mockedApi })).rejects.toThrow()
  })

  it('verifies proof but not status if attestation revoked', async () => {
    jest.mocked(mockedApi.query.attestation.attestations).mockResolvedValueOnce(
      mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash:
            '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
          attester: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
          revoked: true,
          deposit: {
            owner: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
            amount: 0,
          },
        }
      ) as any
    )

    const { proof, ...cred } = VC
    await expect(verify(cred, proof, { api: mockedApi })).resolves.not.toThrow()
    await expect(checkStatus(cred, { api: mockedApi })).rejects.toThrow()
  })
})
