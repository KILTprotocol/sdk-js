/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { ApiMocks } from '@kiltprotocol/testing'
import { getAddEndpointExtrinsic } from './Did.chain'

let api: any

beforeAll(() => {
  api = ApiMocks.createAugmentedApi()
  BlockchainApiConnection.setConnection(Promise.resolve(new Blockchain(api)))
})

describe('services validation', () => {
  const validTestURIs = [
    'data:image/gif;base64,R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8IyPqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCY',
    'data:text/plain;charset=iso-8859-7,%be%fg%be',
    'http://2.example.org#frag2',
    'http://www.example.org/foo.xml#xpointer(//Rube)',
    'http://www.example.com/questions/3456/my-document',
    'https://john.doe@www.example.com:123/forum/questions/?tag=networking&order=newest#top',
    'ldap://[2001:db8::7]/c=GB?objectClass?one',
    'mailto:John.Doe@example.com',
    'news:comp.infosystems.www.servers.unix',
    'tel:+1-816-555-1212',
    'telnet://192.0.2.16:80/',
    'urn:oasis:names:specification:docbook:dtd:xml:4.1.2',
    'ctype:0x12345A',
    'did:example:1234',
  ]
  const validTestIds = [
    'frag2',
    'My_Awesome_Service',
    '@johndoe',
    'http://example.com',
    'abc.de',
    'test-123',
  ]

  const unencodedTestUris = [
    'http://www.example.org/Dürst',
    'http://www.example.org/foo bar/qux<>?^`{|}',
  ]
  const invalidTestIds = ['¯\\_(ツ)_/¯', '#1234567890', '😇', 'μαλάκα', 'мир']
  const malformedTestUris = [...invalidTestIds, 'www.com']

  it.each([...validTestURIs, ...unencodedTestUris.map(encodeURI)])(
    'allows adding services with valid URI "%s"',
    async (uri) => {
      await expect(
        getAddEndpointExtrinsic({
          id: 'service_1',
          types: [],
          urls: [uri],
        })
      ).resolves.toBeDefined()
    }
  )

  it.each([...validTestIds, ...invalidTestIds.map(encodeURIComponent)])(
    'allows adding services with valid id "%s"',
    async (id) => {
      await expect(
        getAddEndpointExtrinsic({
          id,
          types: [],
          urls: [],
        })
      ).resolves.toBeDefined()
    }
  )

  it.each(invalidTestIds)(
    'disallows adding services with invalid id "%s"',
    async (id) => {
      await expect(
        getAddEndpointExtrinsic({
          id,
          types: [],
          urls: [],
        }).then((r) => r.toHuman())
      ).rejects.toThrow('ID')
    }
  )

  it.each([...malformedTestUris, ...unencodedTestUris])(
    'disallows adding services with invalid URI "%s"',
    async (uri) => {
      await expect(
        getAddEndpointExtrinsic({
          id: 'service_1',
          types: [],
          urls: [uri],
        }).then((r) => r.toHuman())
      ).rejects.toThrow('URI')
    }
  )
})
