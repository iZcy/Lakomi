import http from 'node:http'
import { execSync } from 'node:child_process'

const PORT = 3030

async function redeploy() {
  const deploy = execSync(
    'npx hardhat run /app/hardhat/scripts/deploy.js --network localhost',
    { cwd: '/app/hardhat', timeout: 120_000, encoding: 'utf-8' }
  )
  console.log(deploy)

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
  } else if (req.method === 'POST' && req.url === '/redeploy') {
    try {
      console.log('Redeploying contracts...')
      await redeploy()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
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
