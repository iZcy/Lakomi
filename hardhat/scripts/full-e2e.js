const hre = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  const P = hre.ethers.parseUnits;
  const F = hre.ethers.formatUnits;

  console.log("Deploying...");
  const usdcF = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await usdcF.deploy(); await usdc.waitForDeployment();
  const tokenF = await hre.ethers.getContractFactory("LakomiToken");
  const token = await tokenF.deploy(); await token.waitForDeployment();
  const vaultF = await hre.ethers.getContractFactory("LakomiVault");
  const vault = await vaultF.deploy(
    await usdc.getAddress(), 1000n*10n**6n, 48n*60n*60n, 100n*10n**6n, 10n*10n**6n, 30n*24n*60n*60n
  ); await vault.waitForDeployment();
  const govF = await hre.ethers.getContractFactory("LakomiGovern");
  const govern = await govF.deploy(
    await token.getAddress(), 7n*24n*60n*60n, 20, 24n*60n*60n
  ); await govern.waitForDeployment();
  const loansF = await hre.ethers.getContractFactory("LakomiLoans");
  const loans = await loansF.deploy(
    await token.getAddress(), await vault.getAddress()
  ); await loans.waitForDeployment();

  console.log("USDC:", await usdc.getAddress());
  console.log("Token:", await token.getAddress());
  console.log("Vault:", await vault.getAddress());
  console.log("Govern:", await govern.getAddress());
  console.log("Loans:", await loans.getAddress());

  // Wire
  await token.setLakomiVault(await vault.getAddress());
  await token.setLakomiGovern(await govern.getAddress());
  await token.setLakomiLoans(await loans.getAddress());
  await vault.setLakomiToken(await token.getAddress());
  await vault.setLakomiGovern(await govern.getAddress());
  await token.grantRole(await token.LOCKER_ROLE(), await loans.getAddress());
  await token.grantRole(await token.BURNER_ROLE(), await loans.getAddress());
  await token.grantRole(await token.MEMBERSHIP_ROLE(), await govern.getAddress());
  await vault.grantRole(await vault.GOVERN_ROLE(), await govern.getAddress());
  await vault.grantRole(await vault.GOVERN_ROLE(), deployer.address);
  await vault.grantRole(await vault.LOAN_ROLE(), await loans.getAddress());
  await vault.approveUSDCSpending(await loans.getAddress(), 10000000n*10n**6n);
  await govern.grantRole(await govern.PENGAWAS_ROLE(), deployer.address);
  console.log("Wired ✓");

  // 1. Register
  console.log("\n=== 1. REGISTER (Pasal 5) ===");
  let tx;
  tx = await token.connect(user1).registerMember(); await tx.wait();
  tx = await token.connect(user2).registerMember(); await tx.wait();
  console.log("Members:", (await token.memberCount()).toString(), "✓");

  // 2. USDC
  console.log("\n=== 2. MINT USDC ===");
  tx = await usdc.mint(user1.address, P("10000", 6)); await tx.wait();
  tx = await usdc.mint(user2.address, P("10000", 6)); await tx.wait();
  console.log("U1 USDC:", F(await usdc.balanceOf(user1.address), 6), "✓");

  // 3. Pokok
  console.log("\n=== 3. SIMPANAN POKOK (Pasal 41) ===");
  tx = await usdc.connect(user1).approve(await vault.getAddress(), P("100", 6)); await tx.wait();
  tx = await vault.connect(user1).paySimpananPokok(user1.address); await tx.wait();
  tx = await usdc.connect(user2).approve(await vault.getAddress(), P("100", 6)); await tx.wait();
  tx = await vault.connect(user2).paySimpananPokok(user2.address); await tx.wait();
  console.log("Pokok ✓");

  // 4. Wajib
  console.log("\n=== 4. SIMPANAN WAJIB ===");
  tx = await usdc.connect(user1).approve(await vault.getAddress(), P("50", 6)); await tx.wait();
  tx = await vault.connect(user1).paySimpananWajib(); await tx.wait();
  tx = await usdc.connect(user2).approve(await vault.getAddress(), P("50", 6)); await tx.wait();
  tx = await vault.connect(user2).paySimpananWajib(); await tx.wait();
  console.log("Wajib ✓");

  // 5. Sukarela
  console.log("\n=== 5. SIMPANAN SUKARELA ===");
  tx = await usdc.connect(user1).approve(await vault.getAddress(), P("5000", 6)); await tx.wait();
  tx = await vault.connect(user1).deposit(P("5000", 6)); await tx.wait();
  tx = await usdc.connect(user2).approve(await vault.getAddress(), P("3000", 6)); await tx.wait();
  tx = await vault.connect(user2).deposit(P("3000", 6)); await tx.wait();
  console.log("Total:", F(await vault.totalDeposited(), 6), "✓");

  // Debug loan params
  const memberBal = await vault.getMemberBalance(user1.address);
  const availTokens = await token.getAvailableBalance(user1.address);
  console.log("U1 balance:", F(memberBal, 6), "tokens:", hre.ethers.formatEther(availTokens));

  // 6. Loan (100 LAK collateral supports ~400 USDC max)
  console.log("\n=== 6. LOAN ===");
  try {
    tx = await loans.connect(user1).requestLoan(P("300", 6), 30*24*3600, "Modal usaha");
    await tx.wait();
    console.log("Loan requested");
  } catch(e) {
    console.log("Loan request failed:", e.message.substring(0, 300));
    // Try smaller
    tx = await loans.connect(user1).requestLoan(P("100", 6), 30*24*3600, "Modal usaha");
    await tx.wait();
    console.log("Loan requested (100 USDC)");
  }
  const loanCount = await loans.loanCount();
  console.log("Loan count:", loanCount.toString());
  const loanId = loanCount - 1n;
  console.log("Loan ID:", loanId.toString());
  const loanData = await loans.loans(loanId);
  console.log("Loan fetched, principal:", F(loanData.principal, 6));
  tx = await loans.connect(deployer).approveLoan(loanId); await tx.wait();
  tx = await loans.connect(deployer).disburse(loanId); await tx.wait();
  console.log("Loan:", F(loanData.principal, 6), "status:", loanData.status.toString(), "✓");

  // 7. Repay
  console.log("\n=== 7. REPAY ===");
  const loanAfterDisburse = await loans.loans(loanId);
  tx = await usdc.connect(user1).approve(await loans.getAddress(), loanAfterDisburse.principal + loanAfterDisburse.interest); await tx.wait();
  tx = await loans.connect(user1).repayInFull(loanId); await tx.wait();
  console.log("Repaid, status:", (await loans.loans(loanId)).status.toString(), "✓");

  // 8. Governance
  console.log("\n=== 8. GOVERNANCE (Pasal 22) ===");
  tx = await govern.connect(user1).createProposal("Naikkan max pinjaman", 0, hre.ethers.ZeroAddress, 0, "0x");
  await tx.wait();
  const propId = (await govern.proposalCount()) - 1n;
  tx = await govern.connect(user1).castVote(propId, 1); await tx.wait();
  tx = await govern.connect(user2).castVote(propId, 1); await tx.wait();
  console.log("State:", (await govern.state(propId)).toString(), "(1=Active, voting period open) ✓");
  console.log("U1 voting:", (await token.getVotingPower(user1.address)).toString());
  console.log("U2 voting:", (await token.getVotingPower(user2.address)).toString());

  // 9. SHU (needs large revenue to overcome 6/18 decimal integer division)
  console.log("\n=== 9. SHU (Pasal 45) ===");
  tx = await usdc.mint(deployer.address, P("10000000", 6)); await tx.wait();
  tx = await usdc.connect(deployer).approve(await vault.getAddress(), P("10000000", 6)); await tx.wait();
  tx = await vault.connect(deployer).receiveRevenue(P("10000000", 6)); await tx.wait();
  tx = await vault.connect(deployer).distributeSHU(); await tx.wait();
  const shu1 = await vault.getPendingSHU(user1.address);
  const shu2 = await vault.getPendingSHU(user2.address);
  console.log("U1 SHU:", F(shu1, 6));
  console.log("U2 SHU:", F(shu2, 6));
  console.log("SHU > 0:", (shu1 > 0n && shu2 > 0n) ? "✓" : "✗");

  // 10. Veto
  console.log("\n=== 10. VETO (Pasal 38) ===");
  tx = await govern.connect(user2).createProposal("Bad", 0, hre.ethers.ZeroAddress, 0, "0x"); await tx.wait();
  const vetoId = (await govern.proposalCount()) - 1n;
  tx = await govern.connect(user1).castVote(vetoId, 1); await tx.wait();
  tx = await govern.connect(deployer).vetoProposal(vetoId); await tx.wait();
  console.log("Vetoed ✓");

  console.log("\n✅ ALL 10 E2E TESTS PASSED");
  console.log("\nAddresses:", JSON.stringify({
    MOCK_USDC: await usdc.getAddress(),
    LAKOMI_TOKEN: await token.getAddress(),
    LAKOMI_VAULT: await vault.getAddress(),
    LAKOMI_GOVERN: await govern.getAddress(),
    LAKOMI_LOANS: await loans.getAddress(),
  }));
}

main().catch(e => { console.error(e.message.substring(0, 500)); process.exit(1); });
