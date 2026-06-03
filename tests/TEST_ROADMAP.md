# Lakomi Test Roadmap

## Accounts

| # | MetaMask | Address | PK | Role | Purpose |
|---|---|---|---|---|---|
| 0 | Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Admin | Deploy |
| 1 | Acc1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Pengawas | Veto (12) |
| 2 | Acc2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Pengurus | Approve/Reject (1,17) |
| 3 | Acc3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | Member | Voter + target (3,8) |
| 4 | Acc4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` | Bendahara | Sertifikat (20) |
| 5 | Acc5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` | Govern | SHU + Election (10,15) |
| 6 | Acc6 | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` | Member | Voter (3,5) |
| 7 | Acc7 | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` | Member | Voter (3,5) |
| Main | Wallet 1 | `0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6` | *(your wallet)* | Member | Primary user |

## Import Instructions

```
MetaMask → Account icon → Add account → Import account → Paste PK → Import
```

Import order (label them in MetaMask):
1. Acc1 (Pengawas) — PK `0x59c699...`
2. Acc2 (Pengurus) — PK `0x5de411...`
3. Acc3 (Member) — PK `0x7c8521...`
4. Acc4 (Bendahara) — PK `0x47e179...`
5. Acc5 (Govern) — PK `0x8b3a35...`
6. Acc6 (Member) — PK `0x92db14...`
7. Acc7 (Member) — PK `0x4bbbf8...`

Chain: `localhost:8545` / Chain ID `313377`

## Setup (every restart)

1. Main: Unlock → 10 ETH → 1,000 USDC → Register
2. Acc3: Unlock → 10 ETH → 1,000 USDC → Register
3. Acc6: Unlock → 10 ETH → 1,000 USDC → Register
4. Acc7: Unlock → 10 ETH → 1,000 USDC → Register
5. (Acc4, Acc8 optional for extra quorum)
6. Main: Simpanan Sukarela 500 USDC

→ 4 members = quorum 3 (4×67%=2.68→3). 1-2 suara = gagal.

## Test Cases (Execution Order)

### 1 ✅ Positive Loan
Main: Pinjaman 50 USDC → Acc2 Setujui → Main Cairkan → Lunasi

### 2 ✅ Vote Setuju (Anggaran)
Main: Anggaran ke Acc3, 10 USDC → Vote For → 7d → Queue → 1d → Execute

### 3 ❌ Vote Tolak
Main: Create proposal → Vote Against (support=0) by Acc6, Acc7
Outcome: For=0, Against=2 → **Defeated**

### 4 ❌ Vote Abstain
Main: Create proposal → Vote Abstain (support=2) by Main
Outcome: Abstain counted but doesn't help reach quorum

### 5 ❌ Quorum Fail (4 members, 1 vote)
Main: Create proposal → Vote For only by Main → 7d
Outcome: 1/4 votes < quorum 3 → **Defeated**

### 6 ❌ Partial Repay
Active loan → Bayar Sebagian (half) → check remaining + second repay

### 7 ✅ Anggota Revocation
Main: Keanggotaan → pick Acc6 → Vote → 7d → Queue → 1d → Execute
→ Acc6 removed from member list

### 8 ✅ Anggaran Success
Main: Anggaran 10 USDC → Acc3 (recipient) → Vote → Execute

### 9 ❌ Anggaran Fail (overbudget)
Anggaran amount > vault balance → execute → **error message shown**

### 10 ❌ Election Full Cycle
Acc5: Dev Faucet Grant Admin → Governance Pemilu → Pengurus → 1+1 → Mulai
→ Acc5 register as candidate → Acc6/Acc7 vote for Acc5
→ 2d skip → Finalize → Acc5 gets APPROVER_ROLE

### 11 ❌ Multiple Candidates
Election with 2+ candidates → voters split → highest vote wins

### 12 ❌ Veto by Pengawas
Acc1: after proposal succeeds → Governance → Veto
→ proposal state = **Vetoed**

### 13 ❌ Voluntary Exit (success)
Main (no active loans) → Anggota → **Keluar dari Koperasi**
→ simpanan pokok refunded + LAK burned

### 14 ❌ Exit Rejected (active loans)
Member with active loan → can't exit → **error displayed**

### 15 ❌ SHU Distribute (need loan interest)
Acc5 → distributeSHU → members claim

### 16 ❌ Pengawas Audit
Kepatuhan Hukum → Laporan Pengawas → live data

### 17 ❌ Loan Reject
Acc2 → Pinjaman Admin → Tolak/Batalkan → status Canceled

### 18 ❌ Loan Default
Active loan over deadline → Acc2 → Tandai Gagal Bayar

### 19 ❌ Multiple Loans
Main: request 2+ loans simultaneously → each approved → track active count

### 20 ❌ Sertifikat Simpanan
Acc4 (Bendahara) → Simpanan → Terbitkan Sertifikat

### 21 ❌ Pembubaran Proposal
Main: Pembubaran → Vote → Execute → contracts paused

### 22 ❌ RAT Tahunan
Main: RAT Tahunan → Vote → Execute

## Fast Forward

| Button | Seconds | Use |
|---|---|---|
| ⏩ 7 Hari (Voting) | 604800 | End voting |
| ⏩ 1 Hari (Timelock) | 86400 | End timelock |

## Contract Addresses

| Contract | Address |
|---|---|
| MOCK_USDC | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| LAKOMI_TOKEN | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| LAKOMI_VAULT | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| LAKOMI_GOVERN | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| LAKOMI_LOANS | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
