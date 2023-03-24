/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

export const calls: DefinitionsCall = {
  DipSender: [
    {
      methods: {
        generate_proof: {
          description:
            'Generate a Merkle proof for the DIP protocol for the specified DID and public keys.',
          params: [
            {
              name: 'identifier',
              // TODO: Change with the definition of DidIdentifierOf when the spec_version is bumped to 11000
              type: 'AccountId32',
            },
            {
              name: 'keys',
              type: 'BTreeSet<Hash>',
            },
          ],
          type: 'Result<CompleteMerkleProof, ()>',
        },
      },
      version: 1,
    },
  ],
}
