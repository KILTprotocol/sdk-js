/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

export const calls: DefinitionsCall = {
  DipProvider: [
    {
      methods: {
        generate_proof: {
          description:
            'Generate a Merkle proof for the DIP protocol for the specified request parameters.',
          params: [
            {
              name: 'request',
              type: 'DipProofRequest',
            },
          ],
          type: 'Result<CompleteMerkleProof, RuntimeApiDipProofError>',
        },
      },
      version: 1,
    },
  ],
}
