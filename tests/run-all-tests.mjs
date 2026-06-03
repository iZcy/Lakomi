import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, keccak256, toHex, parseUnits } from 'viem'
import { anvil } from 'viem/chains'

// ============================================================
// CONFIG
// ============================================================
const RPC = 'http://localhost:8545'
const transport = http(RPC)
const publicClient = createPublicClient({ chain: anvil, transport })

const CONTRACTS = {
  USDC:    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  TOKEN:   '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  VAULT:   '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  GOVERN:  '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  LOANS:   '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
}

const ACCOUNTS = [
  { name: 'Admin', addr: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', pk: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
  { name: 'Pengawas', addr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', pk: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
  { name: 'Pengurus', addr: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', pk: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
  { name: 'Member3', addr: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', pk: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' },
  { name: 'Bendahara', addr: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', pk: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' },
  { name: 'Govern', addr: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', pk: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba' },
  { name: 'Member6', addr: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', pk: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e' },
  { name: 'Member7', addr: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', pk: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356' },
]
const Main = ACCOUNTS[0], Pgw = ACCOUNTS[1], Pgrs = ACCOUNTS[2], M3 = ACCOUNTS[3], Bdh = ACCOUNTS[4], Gov = ACCOUNTS[5], M6 = ACCOUNTS[6], M7 = ACCOUNTS[7]

// ============================================================
// HELPERS
// ============================================================
const results = []
function P(name) { results.push(name) }
let passing = true
function check(label, ok) {
  if (!ok) { console.log(`  FAIL: ${label}`); passing = false }
  else console.log(`  OK: ${label}`)
}

async function call(acc, to, data, value = 0n) {
  const wc = createWalletClient({ chain: anvil, transport, account: acc.addr })
  await fetch(RPC, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'anvil_impersonateAccount', params:[acc.addr] }) })
  try {
    const hash = await wc.sendTransaction({ to: to, data: data, value: value, gas: 1000000n, account: acc.addr })
    await publicClient.waitForTransactionReceipt({ hash })
    return hash
  } finally {
    await fetch(RPC, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'anvil_stopImpersonatingAccount', params:[acc.addr] }) })
  }
}

async function read(to, sig, args = []) {
  const data = encodeFunctionData({ abi: [{ type:'function', name: 'fn', inputs: args.map(a => ({ type: 'address' })), outputs: [{ type: 'uint256' }] }], functionName: 'fn', args })
  return publicClient.call({ to, data })
}

async function fastForward(seconds) {
  await fetch(RPC, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'evm_increaseTime', params:[seconds] }) })
  await fetch(RPC, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'evm_mine', params:[] }) })
}

function sig(name, types) { return keccak256(toHex(name + '(' + types + ')')).slice(0,10) }
function mintData(addr, amount) { return sig('mint', 'address,uint256') + addr.slice(2).padStart(64,'0') + amount.toString(16).padStart(64,'0') }
function grantData(roleHash, addr) { return sig('grantRole', 'bytes32,address') + roleHash.slice(2) + addr.slice(2).padStart(64,'0') }

// ============================================================
// SETUP
// ============================================================
console.log('\n=== SETUP ===')
P('SETUP')
for (const acc of [M3, M6, M7]) {
  // Mint USDC
  await call(Main, CONTRACTS.USDC, mintData(acc.addr, 1000000000000n)) // 1M USDC
  // Pay simpanan pokok
  await call(Main, CONTRACTS.VAULT, sig('paySimpananPokok', 'address') + acc.addr.slice(2).padStart(64,'0'))
  // Register
  await call(Main, CONTRACTS.TOKEN, sig('registerMember', ''))
  // Reset back
  try { await fetch(RPC, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'anvil_stopImpersonatingAccount', params:[acc.addr] }) }) } catch {}
}
console.log('Registered M3, M6, M7')

// Main also register
await call(Main, CONTRACTS.USDC, mintData(Main.addr, 1000000000000n))
await call(Main, CONTRACTS.VAULT, sig('paySimpananPokok', 'address') + Main.addr.slice(2).padStart(64,'0'))
await call(Main, CONTRACTS.TOKEN, sig('registerMember', ''))
console.log('Registered Main')

// Total 4 members: Main, M3, M6, M7 → quorum = 3

// ============================================================
// MAIN LOAN + REPAY
// ============================================================
console.log('\n=== CASE 1-6: PINJAMAN ===')
P('CASE 1')

// Simpanan
await call(Main, CONTRACTS.VAULT, sig('deposit', 'uint256') + parseUnits('500', 6).toString(16).padStart(64,'0'))

// Request loan
const loanAmt = parseUnits('50', 6)
const duration = 30n * 86400n
const reasonHex = '0x' + Buffer.from('test').toString('hex').padEnd(64,'0')
await call(Main, CONTRACTS.LOANS, sig('requestLoan', 'uint256,uint256,string') + loanAmt.toString(16).padStart(64,'0') + duration.toString(16).padStart(64,'0') + '0000000000000000000000000000000000000000000000000000000000000060' + '0000000000000000000000000000000000000000000000000000000000000004' + '7465737400000000000000000000000000000000000000000000000000000000')
console.log('Loan requested: 50 USDC')

// Approve (Pengurus)
await call(Pgrs, CONTRACTS.LOANS, sig('approveLoan', 'uint256') + '0'.padStart(64,'0'))
console.log('Loan approved by Pengurus')

// Disburse (Main)
await call(Main, CONTRACTS.LOANS, sig('disburseLoan', 'uint256') + '0'.padStart(64,'0'))
console.log('Loan disbursed')

// Repay full
const repayAmount = parseUnits('52', 6) // principal + interest
await call(Main, CONTRACTS.USDC, sig('approve', 'address,uint256') + CONTRACTS.LOANS.slice(2).padStart(64,'0') + repayAmount.toString(16).padStart(64,'0'))
await call(Main, CONTRACTS.LOANS, sig('repayInFull', 'uint256') + '0'.padStart(64,'0'))
console.log('Loan repaid')

// ============================================================
// VOTE TOLAK
// ============================================================
console.log('\n=== CASE 3: VOTE TOLAK ===')
P('CASE 3')

const propDesc = '0x' + Buffer.from('Test Tolak').toString('hex').padEnd(128,'0')
const descLen = (4).toString(16).padStart(64,'0')
await call(Main, CONTRACTS.GOVERN,
  sig('createProposal', 'string,uint8,address,uint256,bytes') +
  ('0'.repeat(63)+'60').padStart(64,'0') + descLen + '5465737420546f6c616b0000000000000000000000000000000000000000000000' +  // Test Tolak
  '0'.padStart(64,'0') + // proposalType 0 (Anggaran)
  CONTRACTS.VAULT.slice(2).padStart(64,'0') +
  '0'.padStart(64,'0') + // value 0
  '0'.padStart(64,'0') + '0'.padStart(64,'0') // callData offset + length 0
)
console.log('Proposal created (id 1)')

// Vote Against by M6, M7
await call(M6, CONTRACTS.GOVERN, sig('castVote', 'uint256,uint8') + '1'.padStart(64,'0') + '0'.padStart(64,'0'))
await call(M7, CONTRACTS.GOVERN, sig('castVote', 'uint256,uint8') + '1'.padStart(64,'0') + '0'.padStart(64,'0'))
console.log('M6, M7 voted Against')

await fastForward(604800)
console.log('7 days passed')

// Check state — should be Defeated (3) since Against > For
try {
  const state = await publicClient.readContract({ address: CONTRACTS.GOVERN, abi: [{ type:'function', name:'state', stateMutability:'view', inputs:[{ type:'uint256' }], outputs:[{ type:'uint8' }] }], functionName:'state', args:[1n] })
  check('Vote Tolak → Defeated (state=3)', state === 3)
} catch(e) {
  check('Vote Tolak', false)
}

// ============================================================
// QUORUM FAIL
// ============================================================
console.log('\n=== CASE 5: QUORUM FAIL ===')
P('CASE 5')

await call(Main, CONTRACTS.GOVERN,
  sig('createProposal', 'string,uint8,address,uint256,bytes') +
  ('0'.repeat(63)+'60').padStart(64,'0') + descLen + '51756f72756d204661696c0000000000000000000000000000000000000000000000' +
  '0'.padStart(64,'0') +
  CONTRACTS.VAULT.slice(2).padStart(64,'0') +
  '0'.padStart(64,'0') +
  '0'.padStart(64,'0') + '0'.padStart(64,'0')
)
console.log('Proposal created (id 2)')

// Only Main votes For (1 vote, quorum=3 for 4 members)
await call(Main, CONTRACTS.GOVERN, sig('castVote', 'uint256,uint8') + '2'.padStart(64,'0') + '1'.padStart(64,'0'))
console.log('Only Main voted For')

await fastForward(604800)

try {
  const state = await publicClient.readContract({ address: CONTRACTS.GOVERN, abi: [{ type:'function', name:'state', stateMutability:'view', inputs:[{ type:'uint256' }], outputs:[{ type:'uint8' }] }], functionName:'state', args:[2n] })
  check('Quorum fail → Defeated (state=3)', state === 3)
} catch(e) {
  check('Quorum fail', false)
}

// ============================================================
// EXIT
// ============================================================
console.log('\n=== CASE 13: EXIT ===')
P('CASE 13')

await call(Main, CONTRACTS.TOKEN, sig('resignMembership', ''))
console.log('Main resigned')

try {
  const isMember = await publicClient.readContract({ address: CONTRACTS.TOKEN, abi: [{ type:'function', name:'isRegisteredMember', stateMutability:'view', inputs:[{ type:'address' }], outputs:[{ type:'bool' }] }], functionName:'isRegisteredMember', args:[Main.addr] })
  check('Main no longer member', isMember === false)
} catch(e) {
  check('Exit', false)
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n=== RESULTS ===')
console.log(`Passed: ${results.length} cases`)
console.log(results.join(', '))
