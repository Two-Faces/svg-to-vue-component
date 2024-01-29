const path = require('path')
const { promisify } = require('util')
const fs = require('fs')
const { optimize, loadConfig } = require('svgo')
const { getOptions } = require('loader-utils')
const merge = require('merge-deep')
const JoyCon = require('joycon').default
const toSFC = require('.')

module.exports = async function(source) {
  this.cacheable()

  const cb = this.async()
  const { svgoConfig } = getOptions(this) || {}

  try {
    if (this.issuer && this.issuer.endsWith('.css')) {
      throw new Error(
        `Please configure another loader to handle .svg files imported in .css files\nSee more: https://github.com/egoist/svg-to-vue-component#usage`
      )
    }

    if (svgoConfig !== false) {
      const options = await getSvgoConfig(svgoConfig, path.dirname(this.resourcePath))

      const result = optimize(source, Object.assign(
        {
          path: this.resourcePath
        },
        options
      ));

      source = result.data
    }

    const { component } = await toSFC(source)
    cb(null, component)
  } catch (err) {
    cb(err)
  }
}

async function getSvgoConfig(svgoConfig, cwd) {
  return merge(
    { plugins: ['prefixIds'] },
    svgoConfig,
    await loadSvgoConfig(cwd)
  )
}

function loadSvgoConfig(cwd) {
  const joycon = new JoyCon()

  const readFile = promisify(fs.readFile)

  joycon.addLoader({
    test: /\.yml$/,
    async load(filepath) {
      const content = await readFile(filepath, 'utf8')
      return require('js-yaml').safeLoad(content)
    }
  })

  return joycon
    .load(
      ['.svgo.yml', '.svgo.js', '.svgo.json'],
      cwd,
      path.dirname(process.cwd())
    )
    .then(res => res.data)
}
