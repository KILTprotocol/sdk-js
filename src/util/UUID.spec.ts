import UUID from './UUID'

describe('UUID', () => {
  it('generate', async () => {
    const uuid: string = UUID.generate()
    console.log('generated UUID', uuid)
    expect(uuid.substr(0, 2)).toEqual('0x')
    expect(uuid.substr(2)).toHaveLength(64)
  })
})
