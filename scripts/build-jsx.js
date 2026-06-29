'use strict'

const fs = require('fs')
const path = require('path')
const Babel = require('../vendor/babel-standalone.min.js')

const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'build')

const entries = [
  'skeleton.jsx',
  'lazy-image.jsx',
  'lazy-section.jsx',
  'markdown-editor.jsx',
  'tweaks-panel.jsx',
  'components.jsx',
  'feedback-widgets.jsx',
  'app.jsx',
  'shop-app.jsx',
  'track-order-app.jsx',
]

fs.mkdirSync(outDir, { recursive: true })

for (const file of entries) {
  const input = path.join(root, file)
  if (!fs.existsSync(input)) continue

  const source = fs.readFileSync(input, 'utf8')
  const result = Babel.transform(source, {
    presets: ['react'],
    plugins: ['transform-block-scoping'],
    sourceType: 'script',
    compact: false,
    comments: false,
    filename: file,
  })

  const banner = `/* Built from ${file}. Run: node scripts/build-jsx.js */\n`
  const output = path.join(outDir, file.replace(/\.jsx$/, '.js'))
  fs.writeFileSync(output, banner + result.code + '\n')
  console.log(`built ${path.relative(root, output)}`)
}
