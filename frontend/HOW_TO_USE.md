# 🚀 How to Use Lakomi Frontend

## ✅ Setup Complete!

Your smart contracts are deployed and the frontend is running at:
**http://localhost:5173**

---

## 📝 Step-by-Step Guide

### Step 1: Connect Your Wallet

1. Open **http://localhost:5173** in your browser
2. Click the **"Connect Wallet"** button in the top-right corner
3. Select **MetaMask** (or your preferred wallet)

#### Configure MetaMask for Local Testing:

1. Open MetaMask
2. Click the network dropdown (top)
3. Click **"Add Network"** → **"Add a network manually"**
4. Enter these details:
   - **Network Name**: Anvil Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
5. Click **"Save"**

#### Import an Anvil Test Account:

1. In MetaMask, click your account icon
2. Select **"Import Account"**
3. Paste this private key:
   ```
   ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click **"Import"**
5. This account has 15000 USDC for testing!

---

### Step 2: 🎯 JOIN THE COOPERATIVE (IMPORTANT!)

**You must register as a member FIRST before you can do anything!**

1. After connecting your wallet, you'll see the **Dashboard**
2. Look for the **"Join the Cooperative"** card
3. Click the **"Register as Member"** button
4. Confirm the transaction in MetaMask
5. Wait for confirmation (should be instant on local Anvil)

✅ **Now you're a member!** You can:
- Vote on governance proposals (1 member = 1 vote)
- Deposit USDC to build your contribution tier
- Request emergency loans
- Create governance proposals

---

### Step 3: 💰 Deposit USDC (Build Your Tier)

1. Click the **"Vault"** tab in the sidebar
2. Enter an amount (e.g., 100 USDC)
3. Click **"Deposit"**
4. You'll need to **approve first**, then deposit
5. Two transactions:
   - Transaction 1: Approve USDC spending
   - Transaction 2: Deposit USDC

#### Tier System:
- **Tier 1** (< 500 USDC): 30% LTV on loans
- **Tier 2** (500-1999 USDC): 50% LTV on loans
- **Tier 3** (2000+ USDC): 70% LTV on loans

---

### Step 4: 🗳️ Participate in Governance

1. Click the **"Governance"** tab
2. **Create a Proposal**:
   - Enter a description
   - Click "Create Proposal"
   - Other members can now vote on it!

3. **Vote on a Proposal**:
   - Select a proposal from the list
   - Click **"For"** or **"Against"**
   - One vote per member!

---

### Step 5: 💸 Request a Loan

1. Click the **"Loans"** tab
2. Enter your **collateral amount** (LAK tokens)
3. See your **maximum loan amount** based on your tier
4. Enter your desired loan amount
5. Click to request (auto-approved if you have enough collateral!)

---

## 🎁 What You Got for Testing

Your imported account comes with:
- ✅ **15,000 USDC** for testing deposits
- ✅ **Unlimited ETH** for gas fees
- ✅ **Member access** after registration

---

## 🔧 Troubleshooting

### "Contract code is empty" error:
- **Solution**: The contracts weren't deployed. Run:
  ```bash
  cd /home/izcy-tuf/Desktop/UGM/Skripsi
  forge script script/DeployLocal.s.sol:DeployLocal --broadcast --rpc-url http://localhost:8545
  ```

### "No proposals yet" message:
- **Normal!** This is a fresh deployment. Create your first proposal!

### Can't deposit/withdraw/vote:
- **Solution**: Make sure you've registered as a member first!
- Look for the "Register as Member" button on the Dashboard

### MetaMask shows "Wrong Network":
- **Solution**: Make sure you've added the Anvil Local network (Chain ID: 31337)

### Transaction pending forever:
- **Solution**: On Anvil, transactions should be instant. If stuck:
  1. Check Anvil is running: `lsof -ti:8545`
  2. Restart Anvil if needed
  3. Refresh the page

---

## 📊 Contract Addresses (Already Configured)

- **LakomiToken**: 0xBB361f732DF9d30aB796136322ea75E69F3b94cE
- **LakomiVault**: 0xE0D504963329D3F98888bd3b2fda4b68823492EB
- **LakomiGovern**: 0x2A10e5a1Eb9c1f43E20992071e3CF2d8137bbceF
- **LakomiLoans**: 0x3ca10f66acE0d4aa0F427981e7697504db15300c
- **MockUSDC**: 0x1E13bAB730dF1e805e7a7dbA848EB227D95c8517

These are already configured in the frontend at `src/config/contracts.ts`

---

## 🎨 Features Available

- ✅ **1-Member-1-Vote Governance** - Democratic voting system
- ✅ **Tiered LTV Loans** - Up to 70% LTV based on contribution
- ✅ **Contribution Tracking** - Build your reputation tier
- ✅ **Real-time Updates** - All data refreshes automatically
- ✅ **Modern Dark UI** - Glassmorphism design with gradients

---

## 🚀 Ready to Start?

1. Open **http://localhost:5173**
2. Connect MetaMask (import test account)
3. **Register as Member** (most important!)
4. Deposit USDC to build your tier
5. Start voting and borrowing!

Enjoy your cooperative banking experience! 🎉
