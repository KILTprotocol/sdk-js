(() => {
  const RegClient = require('npm-registry-client')
  const client = new RegClient({})
  const fs = require('fs')

  const loadConfigFromEnv = () => {
    return {
      auth: {
        username: process.env.NPM_USER,
        password: process.env.NPM_PASS,
        email: process.env.NPM_EMAIL,
      },
      scope: process.env.NPM_SCOPE,
      rcFile: process.env.NPM_RC_FILE,
      registry: '//registry.npmjs.org/'
    }
  }

  const receiveToken = (registry, auth) => {
    return new Promise((resolve, reject) => {
      const authData = {
        auth
      }
      const cb = (err, data) => err ? reject(err) : resolve(data.token)
      client.adduser(`https:${registry}`, authData, cb)
    })
  }

  const writeRc = (registry, scope, rcFile) => {
    return (authToken) => {
      const authTokenRegistry = `${registry}:_authToken=${authToken}`
      const scopeRegistry = `${scope}:registry=https:${registry}`

      fs.writeFileSync(rcFile, [authTokenRegistry, scopeRegistry, ''].join('\n'))
      console.log(`successfully (over)written ${rcFile}`)
    }
  }

  const logErrorAndExit = (err) => {
    console.error(err)
    process.exit(1)
  }

  const config = loadConfigFromEnv()
  receiveToken(config.registry, config.auth)
    .then(writeRc(config.registry, config.scope, config.rcFile))
    .catch(logErrorAndExit)
})()