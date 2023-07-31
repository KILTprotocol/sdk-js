/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { create as createPresentation } from './Presentation'

const credential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.kilt.io/contexts/credentials',
  ],
  type: ['VerifiableCredential', 'KiltCredential2020'],
  id: 'kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  credentialSubject: {
    '@context': {
      '@vocab':
        'kilt:ctype:0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf#',
    },
    birthday: '1991-01-01',
    name: 'Kurt',
    premium: true,
  },
  issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  issuanceDate: '2021-03-25T10:20:44.000Z',
  nonTransferable: true,
  proof: [
    {
      type: 'KILTAttestation2020',
      proofPurpose: 'assertionMethod',
      attester: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    },
  ],
} as any

it('fails if subject !== holder', async () => {
  const randomDid = 'did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo'
  expect(() =>
    createPresentation([credential], randomDid)
  ).toThrowErrorMatchingInlineSnapshot(
    `"The credential with id kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad is non-transferable and cannot be presented by the identity did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo"`
  )
})
