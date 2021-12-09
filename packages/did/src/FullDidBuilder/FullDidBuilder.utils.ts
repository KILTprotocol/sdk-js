// /**
//  * Copyright 2018-2021 BOTLabs GmbH.
//  *
//  * This source code is licensed under the BSD 4-Clause "Original" license
//  * found in the LICENSE file in the root directory of this source tree.
//  */

// import { Metadata } from '@polkadot/types'
// import { DidCreationDetails, IDidCreationDetails } from '../types'

// export function encodeDidCreationOperation(
//   runtimeMetadata: Metadata,
//   creationDetails: DidCreationDetails
// ): IDidCreationDetails {
//   const newKeyAgreementKeys = creationDetails.keyRelationships
//   const {
//     [KeyRelationship.assertionMethod]: assertionMethodKey,
//     [KeyRelationship.capabilityDelegation]: delegationKey,
//     [KeyRelationship.keyAgreement]: encryptionKey,
//   } = keys
//   // build did create object
//   const didCreateRaw = {
//     did: didIdentifier,
//     submitter,
//     newKeyAgreementKeys: encryptionKey ? [formatPublicKey(encryptionKey)] : [],
//     newAttestationKey: assertionMethodKey
//       ? formatPublicKey(assertionMethodKey)
//       : undefined,
//     newDelegationKey: delegationKey
//       ? formatPublicKey(delegationKey)
//       : undefined,
//     newServiceDetails: endpoints.map((service) => {
//       const { id, urls } = service
//       return { id, urls, serviceTypes: service.types }
//     }),
//   }
//   return new (registry.getOrThrow<IDidCreationDetails>(
//     'DidDidDetailsDidCreationDetails'
//   ))(registry, didCreateRaw)
// }