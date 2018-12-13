import Demo from './Demo'

describe('Demo', () => {
  it('should print hello world', () => {
    const expected = new Demo().hello()
    expect(expected).toBe('Hello World')
  })
})
