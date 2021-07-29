/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { mapCallToKeyRelationship } from './utils'

it('gets the right key relationship for each pallet', () => {
  // CTYPE
  expect(
    mapCallToKeyRelationship({ section: 'ctype', method: 'add' })
  ).toMatchInlineSnapshot(`"assertionMethod"`)
  // DELEGATION
  expect(
    mapCallToKeyRelationship({ section: 'delegation', method: 'addDelegation' })
  ).toMatchInlineSnapshot(`"capabilityDelegation"`)
  expect(
    mapCallToKeyRelationship({
      section: 'delegation',
      method: 'revokeDelegation',
    })
  ).toMatchInlineSnapshot(`"capabilityDelegation"`)
  // ATTESTATION
  expect(
    mapCallToKeyRelationship({ section: 'attestation', method: 'add' })
  ).toMatchInlineSnapshot(`"assertionMethod"`)
  expect(
    mapCallToKeyRelationship({ section: 'attestation', method: 'revoke' })
  ).toMatchInlineSnapshot(`"assertionMethod"`)

  // DID
  expect(
    mapCallToKeyRelationship({
      section: 'did',
      method: 'submitDidCreateOperation',
    })
  ).toMatchInlineSnapshot(`"paymentAccount"`)
  expect(
    mapCallToKeyRelationship({
      section: 'did',
      method: 'submitDidUpdateOperation',
    })
  ).toMatchInlineSnapshot(`"paymentAccount"`)
  expect(
    mapCallToKeyRelationship({ section: 'did', method: 'submitDidCall' })
  ).toMatchInlineSnapshot(`"paymentAccount"`)
  // BALANCES
  expect(
    mapCallToKeyRelationship({ section: 'balances', method: 'transfer' })
  ).toMatchInlineSnapshot(`"paymentAccount"`)
})
