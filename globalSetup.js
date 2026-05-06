// @ts-check
const fs = require('fs')
const path = require('path')

async function globalSetup() {
  try {
    const r = await fetch('http://localhost:9222/json/version')
    const d = await r.json()
    fs.writeFileSync(path.join(__dirname, '.ws-endpoint'), d.webSocketDebuggerUrl)
  } else {
    throw new Error('Cannot reach Brave on port 9222. Start Brave with: brave-browser --remote-debugging-port=9222')
  }
}

module.exports = globalSetup
