const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lakomi Protocol - UU 25/1992 Compliance Tests", function () {
  let usdc, token, vault, govern, loans;
  let deployer, alice, bob, charlie, dave;

  const USDC = (n) => BigInt(n) * 10n ** 6n;
  const LAK = (n) => BigInt(n) * 10n ** 18n;

  beforeEach(async function () {
    [deployer, alice, bob, charlie, dave] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const LakomiToken = await ethers.getContractFactory("LakomiToken");
    token = await LakomiToken.deploy();

    const LakomiVault = await ethers.getContractFactory("LakomiVault");
    vault = await LakomiVault.deploy(
      await usdc.getAddress(),
      USDC(1000), USDC(48n * 3600n), USDC(100), USDC(10), 30n * 24n * 3600n
    );

    const LakomiGovern = await ethers.getContractFactory("LakomiGovern");
    govern = await LakomiGovern.deploy(
      await token.getAddress(), 7n * 24n * 3600n, 20, 24n * 3600n
    );

    const LakomiLoans = await ethers.getContractFactory("LakomiLoans");
    loans = await LakomiLoans.deploy(
      await token.getAddress(), await vault.getAddress()
    );

    await token.setLakomiVault(await vault.getAddress());
    await token.setLakomiGovern(await govern.getAddress());
    await token.setLakomiLoans(await loans.getAddress());
    await vault.setLakomiToken(await token.getAddress());
    await vault.setLakomiGovern(await govern.getAddress());

    const LOCKER_ROLE = await token.LOCKER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    const MEMBERSHIP_ROLE = await token.MEMBERSHIP_ROLE();
    await token.grantRole(LOCKER_ROLE, await loans.getAddress());
    await token.grantRole(BURNER_ROLE, await loans.getAddress());
    await token.grantRole(MEMBERSHIP_ROLE, await govern.getAddress());

    const GOVERN_ROLE = await vault.GOVERN_ROLE();
    await vault.grantRole(GOVERN_ROLE, await govern.getAddress());
    await vault.grantRole(GOVERN_ROLE, deployer.address);

    await token.grantRole(MEMBERSHIP_ROLE, deployer.address);

    await vault.approveUSDCSpending(await loans.getAddress(), USDC(1000000));

    await usdc.transfer(alice.address, USDC(10000));
    await usdc.transfer(bob.address, USDC(10000));
    await usdc.transfer(charlie.address, USDC(10000));
  });

  describe("Pasal 5(1): Open & Voluntary Membership", function () {
    it("should allow self-registration", async function () {
      await token.connect(alice).registerMember();
      expect(await token.isRegisteredMember(alice.address)).to.be.true;
      expect(await token.memberCount()).to.equal(1);
    });

    it("should mint 100 LAK tokens on registration", async function () {
      await token.connect(alice).registerMember();
      expect(await token.balanceOf(alice.address)).to.equal(LAK(100));
    });

    it("should not allow duplicate registration", async function () {
      await token.connect(alice).registerMember();
      await expect(token.connect(alice).registerMember()).to.be.revertedWith("Already registered");
    });

    it("should allow admin-assisted registration", async function () {
      await token.registerMemberAdmin(bob.address);
      expect(await token.isRegisteredMember(bob.address)).to.be.true;
    });
  });

  describe("Pasal 22(1): One Member One Vote", function () {
    beforeEach(async function () {
      await token.connect(alice).registerMember();
      await token.connect(bob).registerMember();
      await token.connect(charlie).registerMember();
    });

    it("each member has 1 voting power", async function () {
      expect(await token.getVotingPower(alice.address)).to.equal(1);
      expect(await token.getVotingPower(bob.address)).to.equal(1);
      expect(await token.getVotingPower(charlie.address)).to.equal(1);
      expect(await token.getVotingPower(dave.address)).to.equal(0);
    });

    it("non-members cannot vote", async function () {
      await expect(
        govern.connect(dave).castVote(0, 1)
      ).to.be.reverted;
    });
  });

  describe("Pasal 41: Simpanan (Deposits)", function () {
    beforeEach(async function () {
      await token.connect(alice).registerMember();
    });

    it("should pay Simpanan Pokok (one-time join fee)", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(100));
      await vault.paySimpananPokok(alice.address);
      expect(await vault.simpananPokok(alice.address)).to.equal(USDC(100));
      expect(await vault.hasPaidSimpananPokok(alice.address)).to.be.true;
    });

    it("should not pay Simpanan Pokok twice", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(200));
      await vault.paySimpananPokok(alice.address);
      await expect(vault.paySimpananPokok(alice.address)).to.be.reverted;
    });

    it("should pay Simpanan Wajib (periodic mandatory)", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(200));
      await vault.paySimpananPokok(alice.address);
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(10));
      await vault.connect(alice).paySimpananWajib();
      expect(await vault.simpananWajibTotal(alice.address)).to.equal(USDC(10));
      expect(await vault.simpananWajibPeriodsPaid(alice.address)).to.equal(1);
    });

    it("should deposit Simpanan Sukarela (voluntary)", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(200));
      await vault.paySimpananPokok(alice.address);
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(500));
      await vault.connect(alice).deposit(USDC(500));
      expect(await vault.contributions(alice.address)).to.equal(USDC(600));
    });

    it("should return correct simpanan summary", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(600));
      await vault.paySimpananPokok(alice.address);
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(10));
      await vault.connect(alice).paySimpananWajib();
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(200));
      await vault.connect(alice).deposit(USDC(200));

      const summary = await vault.getSimpananSummary(alice.address);
      expect(summary.pokok).to.equal(USDC(100));
      expect(summary.wajibTotal).to.equal(USDC(10));
      expect(summary.sukarela).to.equal(USDC(200));
      expect(summary.totalContribution).to.equal(USDC(310));
    });
  });

  describe("Pasal 38: Pengawas (Supervisor)", function () {
    it("should have PENGAWAS_ROLE on deployer", async function () {
      const PENGAWAS_ROLE = await govern.PENGAWAS_ROLE();
      expect(await govern.hasRole(PENGAWAS_ROLE, deployer.address)).to.be.true;
    });

    it("pengawas can veto a proposal", async function () {
      await token.connect(alice).registerMember();
      await token.connect(bob).registerMember();

      await govern.connect(alice).createProposal(
        "Test proposal",
        0,
        await vault.getAddress(),
        0,
        "0x"
      );

      await govern.vetoProposal(0);
      const state = await govern.state(0);
      expect(state).to.equal(8);
    });

    it("non-pengawas cannot veto", async function () {
      await token.connect(alice).registerMember();
      await govern.connect(alice).createProposal(
        "Test",
        0, await vault.getAddress(), 0, "0x"
      );
      await expect(govern.connect(alice).vetoProposal(0)).to.be.reverted;
    });
  });

  describe("Pasal 26-27: RAT Annual", function () {
    it("should schedule annual RAT", async function () {
      await token.connect(alice).registerMember();
      await govern.connect(alice).scheduleAnnualRAT("RAT 2026");
      expect(await govern.lastRATTime()).to.be.gt(0);
    });

    it("should not allow RAT twice in same period", async function () {
      await token.connect(alice).registerMember();
      await govern.connect(alice).scheduleAnnualRAT("RAT 2026");
      await expect(
        govern.connect(alice).scheduleAnnualRAT("RAT 2026 again")
      ).to.be.reverted;
    });

    it("isRATDue should be true initially", async function () {
      expect(await govern.isRATDue()).to.be.true;
    });

    it("isRATDue should be false after scheduling", async function () {
      await token.connect(alice).registerMember();
      await govern.connect(alice).scheduleAnnualRAT("RAT 2026");
      expect(await govern.isRATDue()).to.be.false;
    });
  });

  describe("Pasal 45: SHU Distribution", function () {
    beforeEach(async function () {
      await token.connect(alice).registerMember();
      await token.connect(bob).registerMember();

      await usdc.connect(alice).approve(await vault.getAddress(), USDC(200));
      await vault.paySimpananPokok(alice.address);
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(500));
      await vault.connect(alice).deposit(USDC(500));

      await usdc.connect(bob).approve(await vault.getAddress(), USDC(200));
      await vault.paySimpananPokok(bob.address);
      await usdc.connect(bob).approve(await vault.getAddress(), USDC(500));
      await vault.connect(bob).deposit(USDC(500));
    });

    it("should receive revenue", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(50));
      await vault.connect(alice).receiveRevenue(USDC(50));
      expect(await vault.accumulatedRevenue()).to.equal(USDC(50));
    });

    it("should distribute SHU by shares", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(1000));
      await vault.connect(alice).receiveRevenue(USDC(1000));

      await vault.distributeSHU();
      expect(await vault.shuDistributionCount()).to.equal(1);

      const dist = await vault.shuDistributions(0);
      expect(dist.totalAmount).to.be.gt(0);
      expect(dist.perShare).to.be.gt(0);
    });

    it("members should claim SHU", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(1000));
      await vault.connect(alice).receiveRevenue(USDC(1000));
      await vault.distributeSHU();

      const aliceBalBefore = await usdc.balanceOf(alice.address);
      await vault.connect(alice).claimSHU(0);
      const aliceBalAfter = await usdc.balanceOf(alice.address);
      expect(aliceBalAfter).to.be.gt(aliceBalBefore);
    });

    it("should not claim SHU twice", async function () {
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(1000));
      await vault.connect(alice).receiveRevenue(USDC(1000));
      await vault.distributeSHU();
      await vault.connect(alice).claimSHU(0);
      await expect(vault.connect(alice).claimSHU(0)).to.be.reverted;
    });
  });

  describe("LakomiLoans: Basic Flow", function () {
    beforeEach(async function () {
      await token.connect(alice).registerMember();
      await usdc.connect(alice).approve(await vault.getAddress(), USDC(3000));
      await vault.paySimpananPokok(alice.address);
      await vault.connect(alice).deposit(USDC(2500));

      await token.connect(bob).registerMember();
      await usdc.connect(bob).approve(await vault.getAddress(), USDC(3000));
      await vault.paySimpananPokok(bob.address);
      await vault.connect(bob).deposit(USDC(2500));
    });

    it("should request and auto-approve small loan", async function () {
      await usdc.connect(alice).approve(await loans.getAddress(), USDC(1000));
      await loans.connect(alice).requestLoan(USDC(100), 30n * 24n * 3600n, "Emergency");
      const loan = await loans.getLoan(0);
      expect(loan.status).to.equal(1);
    });

    it("should disburse loan and lock collateral", async function () {
      await usdc.connect(alice).approve(await loans.getAddress(), USDC(1000));
      await loans.connect(alice).requestLoan(USDC(100), 30n * 24n * 3600n, "Emergency");
      await loans.disburse(0);
      const loan = await loans.getLoan(0);
      expect(loan.status).to.equal(2);
      expect(await token.getLockedBalance(alice.address)).to.be.gt(0);
    });

    it("should repay loan and unlock collateral", async function () {
      await usdc.connect(alice).approve(await loans.getAddress(), USDC(1000));
      await loans.connect(alice).requestLoan(USDC(100), 30n * 24n * 3600n, "Emergency");
      await loans.disburse(0);

      const loan = await loans.getLoan(0);
      const totalOwed = loan.principal + loan.interest;
      await usdc.connect(alice).approve(await loans.getAddress(), totalOwed);
      await loans.connect(alice).repayInFull(0);

      const loanAfter = await loans.getLoan(0);
      expect(loanAfter.status).to.equal(3);
      expect(await token.getLockedBalance(alice.address)).to.equal(0);
    });
  });
});
