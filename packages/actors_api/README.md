[![](https://user-images.githubusercontent.com/1248214/57789522-600fcc00-7739-11e9-86d9-73d7032f40fc.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

Data sovereignty and interoperability

# Kilt SDK Actors API

This package groups KILT's functionality according to the three most common roles a KILT user may assume:

- Claimer
- Attester
- Verifier

It is meant to make relevant functionality easily accessible and discoverable.

## Claimer

This section contains functions to request an attestation and to send it to a Verifier (presentation).

- `requestAttestation` allows you to request an attestation for a claim from an Attester, which returns a message object that can sent off to the Attester and a session object to keep track of the details of the request.

- `buildCredential` lets you process the Attester's response, comparing it to the original request and building a credential from it.

- Finally, `createPresentation` allows you to pack a modified copy of your credential in a message, ready to be presented to a Verifier.

## Attester

This section groups functionality to process incoming attestation requests and to revoke past attestations.

- `issueAttestation` lets you answer a Claimer's request by attesting to the properties claimed.
  This is called after you assessed the contents of the claim and decided to agree.
  It triggers a blockchain transactions, so transaction fees will apply.
  Issuing an attestation returns a message object (to be sent to the Claimer) and a revocation handle.

- If an attestations needs to be revoked, this handle can be passed to `revokeAttestation`.
  This will also trigger a blockchain transaction.

## Verifier

This section helps Verifiers with requesting the presentation of a valid credential from a Claimer and with processing their submissions.

- The class `PresentationRequestBuilder` guides you through the process of requesting presentations for one or multiple a credentials from a Claimer.

  - Start by generating a `new PresentationRequestBuilder()`, on which you can call the method `requestPresentationForCtype` once for every credential type (CType) you need to receive.
    You can also pick selected properties for each credential type which you need to see, allowing the Claimer to blind all other fields.
  - When you are done, call the `finalize` method, which then produces a request message object and a session object that lets you keep track of your request.

- `verifyPresentation` then takes a Claimer's response and your session object to make sure you received a verifiable (=valid) credential presentation that contains all requested claim types and fields.

### N.B.

This package is work in progress and will be extended and modified to provide future-proof workflows and additional useful features.
