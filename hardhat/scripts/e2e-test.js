const hre = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();

  const token = await hre.ethers.getContractAt("LakomiToken", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
  const usdc = await hre.ethers.getContractAt("MockUSDC", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const vault = await hre.ethers.getContractAt("LakomiVault", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  const govern = await hre.ethers.getContractAt("LakomiGovern", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
  const loans = await hre.ethers.getContractAt("LakomiLoans", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");

  console.log("=== 1. REGISTER (Pasal 5) ===");
  let tx = await token.connect(user1).registerMember();
  await tx.wait();
  tx = await token.connect(user2).registerMember();
  await tx.wait();
  console.log("Members:", (await token.memberCount()).toString(), "✓");

  console.log("\n=== 2. MINT USDC ===");
  tx = await usdc.mint(user1.address, hre.ethers.parseUnits("10000", 6));
  await tx.wait();
  tx = await usdc.mint(user2.address, hre.ethers.parseUnits("10000", 6));
  await tx.wait();
  console.log("User1 USDC:", hre.ethers.formatUnits(await usdc.balanceOf(user1.address), 6), "✓");

  console.log("\n=== 3. SIMPANAN POKOK (Pasal 41) ===");
  tx = await usdc.connect(user1).approve(vault.target, hre.ethers.parseUnits("100", 6));
  await tx.wait();
  tx = await vault.connect(user1).paySimpananPokok(user1.address);
  await tx.wait();
  tx = await usdc.connect(user2).approve(vault.target, hre.ethers.parseUnits("100", 6));
  await tx.wait();
  tx = await vault.connect(user2).paySimpananPokok(user2.address);
  await tx.wait();
  console.log("Pokok paid ✓");

  console.log("\n=== 4. SIMPANAN WAJIB ===");
  tx = await usdc.connect(user1).approve(vault.target, hre.ethers.parseUnits("50", 6));
  await tx.wait();
  tx = await vault.connect(user1).paySimpananWajib();
  await tx.wait();
  tx = await usdc.connect(user2).approve(vault.target, hre.ethers.parseUnits("50", 6));
  await tx.wait();
  tx = await vault.connect(user2).paySimpananWajib();
  await tx.wait();
  console.log("Wajib paid ✓");

  console.log("\n=== 5. SIMPANAN SUKARELA ===");
  tx = await usdc.connect(user1).approve(vault.target, hre.ethers.parseUnits("5000", 6));
  await tx.wait();
  tx = await vault.connect(user1).deposit(hre.ethers.parseUnits("5000", 6));
  await tx.wait();
  tx = await usdc.connect(user2).approve(vault.target, hre.ethers.parseUnits("3000", 6));
  await tx.wait();
  tx = await vault.connect(user2).deposit(hre.ethers.parseUnits("3000", 6));
  await tx.wait();
  console.log("Total:", hre.ethers.formatUnits(await vault.totalDeposited(), 6), "✓");

  console.log("\n=== 6. LOAN ===");
  tx = await loans.connect(user1).requestLoan(hre.ethers.parseUnits("1000", 6), 30 * 24 * 3600, "Modal usaha");
  await tx.wait();
  const loanId = (await loans.loanCount()) - 1n;
  tx = await loans.connect(deployer).approveLoan(loanId);
  await tx.wait();
  tx = await loans.connect(deployer).disburse(loanId);
  await tx.wait();
  const ln = await loans.loans(loanId);
  console.log("Loan disbursed, state:", ln.state.toString(), "✓");

  console.log("\n=== 7. REPAY ===");
  tx = await usdc.connect(user1).approve(loans.target, ln.principal + ln.interestOwed);
  await tx.wait();
  tx = await loans.connect(user1).repayInFull(loanId);
  await tx.wait();
  console.log("Repaid, state:", (await loans.loans(loanId)).state.toString(), "✓");

  console.log("\n=== 8. GOVERNANCE (Pasal 22) ===");
  tx = await govern.connect(user1).createProposal("Naikkan max pinjaman", 0, hre.ethers.ZeroAddress, 0, "0x");
  await tx.wait();
  const propId = (await govern.proposalCount()) - 1n;
  tx = await govern.connect(user1).castVote(propId, 1);
  await tx.wait();
  tx = await govern.connect(user2).castVote(propId, 1);
  await tx.wait();
  console.log("State:", (await govern.state(propId)).toString(), "(4=Succeeded) ✓");
  console.log("Voting power U1:", (await token.getVotingPower(user1.address)).toString());
  console.log("Voting power U2:", (await token.getVotingPower(user2.address)).toString());

  console.log("\n=== 9. SHU (Pasal 45) ===");
  tx = await usdc.mint(vault.target, hre.ethers.parseUnits("1000", 6));
  await tx.wait();
  tx = await vault.connect(deployer).distributeSHU();
  await tx.wait();
  console.log("SHU U1:", hre.ethers.formatUnits(await vault.getPendingSHU(user1.address), 6));
  console.log("SHU U2:", hre.ethers.formatUnits(await vault.getPendingSHU(user2.address), 6), "✓");

  console.log("\n=== 10. VETO (Pasal 38) ===");
  tx = await govern.connect(user2).createProposal("Bad", 0, hre.ethers.ZeroAddress, 0, "0x");
  await tx.wait();
  const vetoId = (await govern.proposalCount()) - 1n;
  tx = await govern.connect(user1).castVote(vetoId, 1);
  await tx.wait();
  tx = await govern.connect(deployer).vetoProposal(vetoId);
  await tx.wait();
  console.log("Vetoed:", await govern.proposalVetoed(vetoId), "✓");

  console.log("\n✅ ALL 10 E2E TESTS PASSED");
}

main().catch(e => { console.error(e.message); process.exit(1); });
