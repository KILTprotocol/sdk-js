import { Codec } from '@polkadot/types/types'
import { CtypeMetadata, CTypeSchema } from 'src/ctype/CType'
import { CTypeInputModel, CTypeModel } from 'src/ctype/CTypeSchema'
import * as CTypeUtils from 'src/ctype/CTypeUtils'
import { CType, ICType } from './CType'
import { IBlockchainApi } from './BlockchainApi'

export class CTypeModule {
  constructor(private blockchain: IBlockchainApi) {}

  public create(
    schema: CTypeSchema,
    metadata: CtypeMetadata,
    hash?: ICType['hash']
  ): ICType {
    return new CType(schema, metadata, hash)
  }

  public createFromInputModel(cTypeInput: any): ICType {
    if (!CTypeUtils.verifySchema(cTypeInput, CTypeInputModel)) {
      throw new Error('CType input does not correspond to input model schema')
    }
    const schema: CTypeSchema = {
      $id: cTypeInput.$id,
      $schema: CTypeModel.properties.$schema.default,
      properties: {},
      type: 'object',
    }
    const metadata: CtypeMetadata = {
      title: {
        default: cTypeInput.title,
      },
      description: {
        default: cTypeInput.description,
      },
      properties: {},
    }

    const properties = {}
    for (const p of cTypeInput.properties) {
      properties[p.$id] = { type: p.type }
      metadata.properties[p.$id] = {
        title: {
          default: p.title,
        },
      }
    }
    schema.properties = properties
    return this.create(schema, metadata)
  }

  public async verifyStored(cTypeHash: ICType['hash']): Promise<boolean> {
    const encoded:
      | Codec
      | null
      | undefined = await this.blockchain.api.query.ctype.cTYPEs(cTypeHash)
    return (encoded && encoded.encodedLength > 0) || false
  }
}
