const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const USDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC:", usdcAddr);

  const LakomiToken = await hre.ethers.getContractFactory("LakomiToken");
  const token = await LakomiToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("LakomiToken:", tokenAddr);

  const LakomiVault = await hre.ethers.getContractFactory("LakomiVault");
  const vault = await LakomiVault.deploy(
    usdcAddr,
    1000n * 10n ** 6n,
    48n * 60n * 60n,
    100n * 10n ** 6n,
    10n * 10n ** 6n,
    30n * 24n * 60n * 60n
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("LakomiVault:", vaultAddr);

  const LakomiGovern = await hre.ethers.getContractFactory("LakomiGovern");
  const govern = await LakomiGovern.deploy(
    tokenAddr,
    7n * 24n * 60n * 60n,
    20,
    24n * 60n * 60n
  );
  await govern.waitForDeployment();
  const governAddr = await govern.getAddress();
  console.log("LakomiGovern:", governAddr);

  const LakomiLoans = await hre.ethers.getContractFactory("LakomiLoans");
  const loans = await LakomiLoans.deploy(tokenAddr, vaultAddr);
  await loans.waitForDeployment();
  const loansAddr = await loans.getAddress();
  console.log("LakomiLoans:", loansAddr);

  console.log("\n--- Wiring contracts ---");
  
  await token.setLakomiVault(vaultAddr);
  await token.setLakomiGovern(governAddr);
  await token.setLakomiLoans(loansAddr);
  console.log("Token: vault, govern, loans set");

  await vault.setLakomiToken(tokenAddr);
  await vault.setLakomiGovern(governAddr);
  console.log("Vault: token, govern set");

  const LOCKER_ROLE = await token.LOCKER_ROLE();
  await token.grantRole(LOCKER_ROLE, loansAddr);
  const BURNER_ROLE = await token.BURNER_ROLE();
  await token.grantRole(BURNER_ROLE, loansAddr);
  const MEMBERSHIP_ROLE = await token.MEMBERSHIP_ROLE();
  await token.grantRole(MEMBERSHIP_ROLE, governAddr);
  console.log("Token: roles granted to Loans and Govern");

  const GOVERN_ROLE = await vault.GOVERN_ROLE();
  await vault.grantRole(GOVERN_ROLE, governAddr);
  await vault.grantRole(GOVERN_ROLE, deployer.address);
  console.log("Vault: GOVERN_ROLE granted to Govern and deployer");

  const LOAN_ROLE = await vault.LOAN_ROLE();
  await vault.grantRole(LOAN_ROLE, loansAddr);
  console.log("Vault: LOAN_ROLE granted to Loans");

  await vault.approveUSDCSpending(loansAddr, 10000000n * 10n ** 6n);
  console.log("Vault: USDC spending approved for Loans");

  const PENGAWAS_ROLE = await govern.PENGAWAS_ROLE();
  await govern.grantRole(PENGAWAS_ROLE, deployer.address);
  console.log("Govern: PENGAWAS_ROLE granted to deployer");

  console.log("\n--- Deployment Complete ---");
  console.log({
    USDC: usdcAddr,
    LakomiToken: tokenAddr,
    LakomiVault: vaultAddr,
    LakomiGovern: governAddr,
    LakomiLoans: loansAddr,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
