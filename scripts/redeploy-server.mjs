import http from 'node:http'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PORT = 3030
const ADDR_FILE = '/app/contract-addresses.json'
const RPC = 'http://anvil:8545'

let cachedAddresses = null

function loadAddresses() {
  try {
    const raw = fs.readFileSync(ADDR_FILE, 'utf-8')
    cachedAddresses = JSON.parse(raw)
    return cachedAddresses
  } catch {
    return null
  }
}

function rpc(method, params = []) {
  const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  const result = execSync(
    `curl -s -X POST '${RPC}' -H 'Content-Type: application/json' -d '${body.replace(/'/g, "'\\''")}'`,
    { encoding: 'utf-8', timeout: 30_000 }
  )
  const json = JSON.parse(result)
  if (json.error) throw new Error(json.error.message)
  return json.result
}

async function registerMemberOnChain(userAddr) {
  console.log(`Registering member: ${userAddr}`)
  const addrs = cachedAddresses || loadAddresses()

  rpc('anvil_impersonateAccount', [userAddr])

  rpc('anvil_setBalance', [userAddr, '0x8AC7230489E80000'])

  const txHash = rpc('eth_sendTransaction', [{
    from: userAddr,
    to: addrs.LAKOMI_TOKEN,
    data: '0x60f8dd7e',
    gas: '0x7A120',
  }])

  rpc('anvil_stopImpersonatingAccount', [userAddr])
  console.log(`Registered: ${userAddr} tx=${txHash}`)
  return txHash
}

async function redeploy() {
  const deploy = execSync(
    'npx hardhat run /app/hardhat/scripts/deploy.js --network localhost',
    { cwd: '/app/hardhat', timeout: 120_000, encoding: 'utf-8' }
  )
  console.log(deploy)
  cachedAddresses = loadAddresses()

  execSync(
    `npx hardhat console --network localhost --no-compile --config /app/hardhat/hardhat.config.js <<'SCRIPT'
const [deployer, acc1, acc2] = await ethers.getSigners();
for (const acc of [acc1, acc2]) {
  const tx = await deployer.sendTransaction({ to: acc.address, value: ethers.parseEther("10.0") });
  await tx.wait();
  console.log("Funded", acc.address, "with 10 ETH");
}
SCRIPT`,
    { cwd: '/app/hardhat', timeout: 60_000, encoding: 'utf-8' }
  )
}

cachedAddresses = loadAddresses()

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  } else if (req.method === 'GET' && req.url === '/contracts') {
    const addrs = cachedAddresses || loadAddresses()
    if (!addrs) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Contracts not deployed yet' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(addrs))
  } else if (req.method === 'POST' && req.url === '/register-member') {
    try {
      const body = await parseBody(req)
      const userAddr = body.address
      if (!userAddr) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'address is required' }))
        return
      }
      const txHash = await registerMemberOnChain(userAddr)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, txHash }))
    } catch (e) {
      console.error('Register-member failed:', e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }
  } else if (req.method === 'POST' && req.url === '/redeploy') {
    try {
      console.log('Redeploying contracts...')
      await redeploy()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, addresses: cachedAddresses }))
    } catch (e) {
      console.error('Redeploy failed:', e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }
  } else {
    res.writeHead(404)
    res.end('not found')
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Redeploy server on :${PORT}`))
