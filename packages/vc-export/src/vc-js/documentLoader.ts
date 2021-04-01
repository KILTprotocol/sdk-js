import { RemoteDocument, Url } from 'jsonld/jsonld-spec'
import vcjs from 'vc-js'
import context from './context.json'

export default async function documentLoader(
  url: Url
): Promise<RemoteDocument> {
  return url.startsWith('https://www.kilt.io')
    ? { contextUrl: undefined, documentUrl: url, document: context }
    : vcjs.defaultDocumentLoader(url)
}
