import Ajv from 'ajv'
import { ExtrinsicStatus } from '@polkadot/types/index'
import Hash from '@polkadot/types/Hash'

import { CTypeModel } from './CTypeSchema'
import Blockchain from '../blockchain/Blockchain'
import Identity from '../identity/Identity'
import Crypto from '../crypto'

export function verifyClaimStructure(claim: any, schema: any): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw new Error('CType does not correspond to schema')
  }
  return verifySchema(claim, schema)
}

export function verifySchema(model: any, metaModel: any): boolean {
  return verifySchemaWithErrors(model, metaModel)
}

export function verifySchemaWithErrors(
  model: any,
  metaModel: any,
  messages?: [string]
): boolean {
  const ajv = new Ajv({
    meta: false,
  })
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-07.json'))
  ajv.addMetaSchema(CTypeModel)
  const result = ajv.validate(metaModel, model)
  if (!result && ajv.errors) {
    ajv.errors.map((error: any) => {
      if (messages) {
        messages.push(error.message)
      }
    })
  }
  return result ? true : false
}

export async function verifyStored(
  blockchain: Blockchain,
  hash: string
): Promise<any> {
  // @ts-ignore
  const result = await blockchain.api.query.ctype.cTYPEs(hash)
  return result && result.encodedLength ? result.toJSON() : null
}

export async function store(
  blockchain: Blockchain,
  identity: Identity,
  hash: string,
  onsuccess?: () => void
): Promise<Hash> {
  const signature = Crypto.sign(hash, identity.signKeyPair.secretKey)
  // @ts-ignore
  const ctypeAdd = await blockchain.api.tx.ctype.add(hash, signature)
  return blockchain.submitTx(identity, ctypeAdd, (status: ExtrinsicStatus) => {
    if (
      onsuccess &&
      status.type === 'Finalised' &&
      status.value &&
      status.value.encodedLength > 0
    ) {
      onsuccess()
    }
  })
}
