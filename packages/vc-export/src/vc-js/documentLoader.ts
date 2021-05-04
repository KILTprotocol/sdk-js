import { RemoteDocument, Url } from 'jsonld/jsonld-spec'
import vcjs from 'vc-js'
import kiltContexts from './context'

export default async function documentLoader(
  url: Url
): Promise<RemoteDocument> {
  const context = kiltContexts[url]
  if (context)
    return { contextUrl: undefined, documentUrl: url, document: context }
  return vcjs.defaultDocumentLoader(url)
}
