const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Measurement — All Operations", function () {
  let idrx, token, vault, govern, loans;
  let deployer, member, pengurus, pengawas, bendahara, governAcc;

  before(async function () {
    [deployer, member, pengurus, pengawas, bendahara, governAcc] = await ethers.getSigners();
    
    // Deploy contracts
    const MockIDRX = await ethers.getContractFactory("MockIDRX");
    idrx = await MockIDRX.deploy();
    
    const LakomiToken = await ethers.getContractFactory("LakomiToken");
    token = await LakomiToken.deploy();
    
    const LakomiVault = await ethers.getContractFactory("LakomiVault");
    vault = await LakomiVault.deploy(await idrx.getAddress(), 1000, 48*3600, 100*10**6, 10*10**6, 30*86400);
    
    const LakomiGovern = await ethers.getContractFactory("LakomiGovern");
    govern = await LakomiGovern.deploy(await token.getAddress(), 7*86400, 67, 86400);
    
    const LakomiLoans = await ethers.getContractFactory("LakomiLoans");
    loans = await LakomiLoans.deploy(await token.getAddress(), await vault.getAddress());
    
    // Wire contracts
    await token.setLakomiVault(await vault.getAddress());
    await token.setLakomiGovern(await govern.getAddress());
    await token.setLakomiLoans(await loans.getAddress());
    await vault.setLakomiToken(await token.getAddress());
    await vault.setLakomiGovern(await govern.getAddress());
    
    // Grant roles
    await vault.grantRole(await vault.GOVERN_ROLE(), await govern.getAddress());
    await vault.grantRole(await vault.LOAN_ROLE(), await loans.getAddress());
    await token.grantRole(await token.MEMBERSHIP_ROLE(), await govern.getAddress());
    await token.grantRole(await token.LOCKER_ROLE(), await loans.getAddress());
    await token.grantRole(await token.BURNER_ROLE(), await loans.getAddress());
    await govern.grantRole(await govern.PENGAWAS_ROLE(), pengawas.address);
    await loans.grantRole(await loans.APPROVER_ROLE(), pengurus.address);
    await vault.grantRole(await vault.TREASURER_ROLE(), bendahara.address);
    await vault.grantRole(await vault.GOVERN_ROLE(), governAcc.address);
    
    // Setup member
    await idrx.mint(member.address, 1000000000000);
    await idrx.connect(member).approve(await vault.getAddress(), 99999999999);
    await vault.paySimpananPokok(member.address);
    await token.connect(member).registerMember();
  });

  it("registerMember", async function () {
    await idrx.mint(member.address, 1000000000000);
    await idrx.connect(member).approve(await vault.getAddress(), 99999999999);
    // Cannot register twice — just measure the deploy-time costs
    expect(await token.isRegisteredMember(member.address)).to.be.true;
  });

  it("paySimpananPokok", async function () {
    const addr = pengawas.address;
    await idrx.mint(addr, 1000000000000);
    await idrx.connect(pengawas).approve(await vault.getAddress(), 99999999999);
    // Already paid for member — measure by paying for pengawas
    await vault.paySimpananPokok(addr);
  });

  it("deposit (simpanan sukarela)", async function () {
    await vault.connect(member).deposit(100000000); // 100 IDRX
  });

  it("paySimpananWajib", async function () {
    await vault.connect(member).paySimpananWajib();
  });

  it("requestLoan", async function () {
    await idrx.connect(member).approve(await loans.getAddress(), 999999999);
    await loans.connect(member).requestLoan(5000000, 2592000, "test"); // 5 IDRX, 30 days
  });

  it("approveLoan", async function () {
    await loans.connect(pengurus).approveLoan(0);
  });

  it("disburse", async function () {
    await loans.connect(member).disburse(0);
  });

  it("repayInFull", async function () {
    await idrx.connect(member).approve(await loans.getAddress(), 6000000);
    await loans.connect(member).repayInFull(0);
  });

  it("castVote", async function () {
    await govern.connect(member).createProposal("Test", 0, member.address, 0, "0x");
    await govern.connect(member).castVote(0, 1);
  });
});
