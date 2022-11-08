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
        get_by_id: {
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
        get_by_subject: {
          description: `Return all the public credentials linked to the specified subject.
          An optional filter can be passed to be applied to the result before being returned to the client.
          It returns an error if the provided specified subject ID is not valid.
          `,
          params: [
            {
              name: 'subject',
              type: 'Text',
            },
            {
              name: 'filter',
              type: 'Option<PublicCredentialFilter>',
            },
          ],
          type: 'Result<Vec<(Hash, PublicCredentialsCredentialsCredentialEntry)>, PublicCredentialError>',
        },
      },
      version: 1,
    },
  ],
}
