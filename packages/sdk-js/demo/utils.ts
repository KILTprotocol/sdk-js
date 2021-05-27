import * as kilt from "@kiltprotocol/sdk-js"

import type { KeyringPair } from "@polkadot/keyring/types"

const AUTH_SEED = "0x0000000000000000000000000000000000000000000000000000000000000000"
const ENC_SEED = "0x0000000000000000000000000000000000000000000000000000000000000001"
const ATT_SEED = "0x0000000000000000000000000000000000000000000000000000000000000002"
const DEL_SEED = "0x0000000000000000000000000000000000000000000000000000000000000003"

export function generate_ed25519_authentication_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(AUTH_SEED, {signingKeyPairType: "ed25519"}).signKeyringPair
}
export function get_ed25519_authentication_key_id(): string {
    return "0xed52d866f75a5e57641b6ca68a7618312564de787cda3d0664d15471ec1d12b5"
}

export function generate_sr25519_authentication_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(AUTH_SEED, {signingKeyPairType: "sr25519"}).signKeyringPair
}
export function get_sr25519_authentication_key_id(): string {
    return "0x1eb4134f8acf477337de6b208c1044b19b9ac09e20e4c6f6c1561d1cef6cad8b"
}

export function generate_encryption_key(): nacl.BoxKeyPair {
    return kilt.Identity.buildFromSeedString(ENC_SEED, {signingKeyPairType: "ed25519"}).boxKeyPair
}
export function get_encryption_key_id(): string {
    return "0xd8752aed376a12f17ee8c5e06aa19df1cea571da1c9241fc50c330504513b350"
}

export function generate_ed25519_attestation_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(ATT_SEED, {signingKeyPairType: "ed25519"}).signKeyringPair
}
export function get_ed25519_attestation_key_id(): string {
    return "0xee643cd1b9567e60b913ef6d7b99e117277413736955051b891b07fa2cff1ca2"
}

export function generate_sr25519_attestation_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(ATT_SEED, {signingKeyPairType: "sr25519"}).signKeyringPair
}
export function get_sr25519_attestation_key_id(): string {
    return "0x8ab41dc8ddfecb44ca18658b0a34becdcc0580096855c9f7cbb8575b02356286"
}

export function generate_ed25519_delegation_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(DEL_SEED, {signingKeyPairType: "ed25519"}).signKeyringPair
}
export function get_ed25519_delegation_key_id(): string {
    return "0xe8633ac00f7cf860d6310624c721e4229d7f661de9afd885cd2d422fd15b7669"
}

export function generate_sr25519_delegation_key(): KeyringPair {
    return kilt.Identity.buildFromSeedString(DEL_SEED, {signingKeyPairType: "sr25519"}).signKeyringPair
}
export function get_sr25519_delegation_key_id(): string {
    return "0x81dc5bf133b998d615b70563ee94e92296e1219f8235b008b38a2ddb40168a35"
}

export async function waitForEnter(message?: string) {
    const waitForEnter = require("wait-for-enter");
    message = message || "Press Enter to continue: "
    console.log(message)
    await waitForEnter()
}