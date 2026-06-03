import { ethers } from "ethers";

const PK = "0x9fa8d5d64f4f036bd74d89a521cd328ebc1876bea34765f4b8cc37400c86304c";
const provider = new ethers.JsonRpcProvider("https://mainnet.dchain.id");
const wallet = new ethers.Wallet(PK, provider);

const IDRX = new ethers.Contract("0xC05A8D92702253C5db45762399D39dCc3c2cB525", [
  "function mint(address,uint256)", "function approve(address,uint256)"
], wallet);
const TOKEN = new ethers.Contract("0xa23E3E4BfEAfC485Bb26021609F2CB4a0FbCF0a1", [
  "function registerMember()", "function mint(address,uint256)"
], wallet);
const VAULT = new ethers.Contract("0x2f72d86fbA46A418EA83a9986d62EBEEA8CE284D", [
  "function paySimpananPokok(address)", "function paySimpananWajib()", "function deposit(uint256)", "function distributeSHU()"
], wallet);
const LOANS = new ethers.Contract("0x48eC878AD39722d76cFD6393d2d2dcc0Eab9A8b3", [
  "function requestLoan(uint256,uint256,string)", "function approveLoan(uint256)", "function disburse(uint256)", "function repayInFull(uint256)", "function loanCount() view returns(uint256)"
], wallet);
const GOVERN = new ethers.Contract("0xC9c16965a9B010785Dc8B0A7a46D2e6B00948C80", [
  "function createProposal(string,uint8,address,uint256,bytes)", "function castVote(uint256,uint8)", "function proposalCount() view returns(uint256)"
], wallet);

const results = [];
async function measure(name, fn) {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    results.push({ name, gas: Number(receipt.gasUsed) });
    console.log(`  ✅ ${name}: ${receipt.gasUsed} gas`);
  } catch(e) {
    results.push({ name, gas: 0, error: e.shortMessage || e.reason || e.message?.slice(0,60) });
    console.log(`  ❌ ${name}: ${e.shortMessage || e.reason || e.message?.slice(0,60)}`);
  }
}

// Use fresh test account
const testPk = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const tester = new ethers.Wallet(testPk, provider);
const addr = tester.address;
console.log("Test:", addr);

const idrxT = IDRX.connect(tester);
const vaultT = VAULT.connect(tester);
const tokenT = TOKEN.connect(tester);
const loansT = LOANS.connect(tester);
const governT = GOVERN.connect(tester);

// Fund
const ftx = await wallet.sendTransaction({ to: addr, value: ethers.parseEther("0.3") });
await ftx.wait();

// Setup
console.log("\n=== SETUP ===");
await measure("mint IDRX", () => IDRX.mint(addr, 100000000000));
await measure("approve vault", () => idrxT.approve(VAULT.target, 99999999999));

// Core ops
console.log("\n=== CORE OPS ===");
await measure("paySimpananPokok", () => VAULT.paySimpananPokok(addr));
await measure("registerMember", () => tokenT.registerMember());
await measure("deposit sukarela", () => vaultT.deposit(500000000));
await measure("paySimpananWajib", () => vaultT.paySimpananWajib());
await measure("requestLoan", () => loansT.requestLoan(5000000, 2592000, "test"));

const lc = await LOANS.loanCount();
const lid = Number(lc) - 1;
console.log(`  Loan ID: ${lid}`);

await measure("approveLoan", () => LOANS.approveLoan(lid));
await measure("disburse", () => loansT.disburse(lid));

await idrxT.approve(LOANS.target, 99999999);
await measure("repayInFull", () => loansT.repayInFull(lid));

await measure("createProposal", () => governT.createProposal("Test", 0, addr, 0, "0x"));
const pc = await GOVERN.proposalCount();
const pid = Number(pc) - 1;
await measure("castVote", () => governT.castVote(pid, 1));

console.log("\n=== SUMMARY (DChain Mainnet) ===");
console.log("| Operation | Gas |");
console.log("|---|---|");
for (const r of results) console.log(`| ${r.name} | ${r.gas || r.error} |`);

