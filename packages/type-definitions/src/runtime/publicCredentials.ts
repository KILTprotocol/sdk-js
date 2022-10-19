/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

export const calls: DefinitionsCall = {
  PublicCredentials: [
    {
      methods: {
        get_credential: {
          description:
            'Return the public credential with the specified ID, if found.',
          params: [
            {
              name: 'credential_id',
              type: 'Hash',
            },
          ],
          type: 'Option<PublicCredentialsCredentialsCredentialEntry>',
        },
        get_credentials: {
          description:
            'Return all the public credentials linked to the specified subject.',
          params: [
            {
              name: 'subject',
              type: 'Text',
            },
            {
              name: 'filter',
              type: 'Option<PublicCredentialsFilter>',
            },
          ],
          type: 'Result<Vec<(Hash, PublicCredentialsCredentialsCredentialEntry)>, PublicCredentialApiError>',
        },
      },
      version: 1,
    },
  ],
}
