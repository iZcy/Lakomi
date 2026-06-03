# Test Roadmap — Lakomi Protocol

## Accounts (Anvil Default Mnemonic)

| # | Address | PK | Role | Purpose |
|---|---|---|---|---|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Deployer | Full admin |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Pengawas | Veto, pause, audit |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Pengurus | Approve/reject loans |
| 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | Membership | Member test |
| 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` | Bendahara | Treasury |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` | Govern | SHU, elections |
| 6 | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` | — | Member test |
| 7 | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` | — | Member test |
| 8 | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` | — | Member test |
| Main | `0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6` | (your wallet) | Member | Primary user |

## Pre-Test Setup (every restart)

1. Main: Dev Faucet → 🔓 Unlock → 10 ETH → 1,000 USDC → Beranda register
2. Acc3: Dev Faucet → 🔓 Unlock → 10 ETH → 1,000 USDC → Beranda register
3. Acc4: Dev Faucet → 🔓 Unlock → 10 ETH → 1,000 USDC → Beranda register
4. (optional) Acc6+ : same registration for more quorum testing

## Test Cases

### 1. Positive Loan Flow ✅ Tested
Main: Simpanan Wajib + Sukarela → Pinjaman ≤ Maks → Acc2 Setujui → Main Cairkan → Lunasi

### 2. Vote Setuju ✅ Tested  
Create proposal → Vote For → 7d → Queue → 1d → Execute

### 3. Vote Tolak ❌
Create proposal → Vote **Against** (0=support=Against in contract)

### 4. Vote Abstain ❌
Create proposal → Vote **Abstain** (support=2)

### 5. Quorum Fail ❌ (need 3+ registered)
Proposal with only 1 vote when 3+ members exist → **Defeated** after voting period

### 6. Partial Repay ❌
Active loan → **Bayar Sebagian** (partial amount) → check remaining balance

### 7. Anggota Revocation ✅ Tested
Keanggotaan proposal → select member → vote → queue → execute

### 8. Anggaran Execution ✅ Tested
Anggaran proposal → select recipient + amount → vote → queue → execute

### 9. Anggaran Fail (insufficient vault) ❌
Anggaran amount > vault balance → execute fails → error displayed

### 10. Election: Full Cycle ❌
Main: Dev Faucet Grant Admin → Governance Pemilu → select Pengurus → 1+1 days → Mulai Pemilu
→ Daftar Kandidat → fill candidate address → Vote → 2d skip → Finalisasi
→ Pemenang gets APP overview_APPROVER_ROLE

### 11. Election: Vote Counter ❌
Multiple members vote for different candidates → check vote counts

### 12. Veto by Pengawas ❌
Acc1 (Pengawas) → vote on proposal → after success → Acc1 veto → proposal status = Vetoed

### 13. Voluntary Exit ❌
Main (no active loans) → Anggota tab → Keluar dari Koperasi → simpanan pokok refunded

### 14. Exit Rejected (active loans) ❌
Member with active loan → Keluar → error "Cannot resign with active loans"

### 15. SHU Distribute ❌ (need revenue)
Acc5 (Govern) → Simpanan tab → Distribusikan SHU → claim by members

### 16. Pengawas Audit ❌
Kepatuhan Hukum → Laporan Pengawas card → live data display

### 17. Loan Reject ❌
Acc2 → Pinjaman Admin → Tolak/Batalkan → loan status = Canceled

### 18. Loan Default ❌
Active loan → 30d jangka waktu → melebihi grace period → Acc2 → Tandai Gagal Bayar

### 19. Multiple Active Loans ❌
Main: request 2+ loans → each approved → track multiple active loans

### 20. Sertifikat Simpanan ❌
Acc4 (Bendahara) → Simpanan tab → Terbitkan Sertifikat

### 21. Pembubaran Proposal ❌
Create Pembubaran proposal → vote → queue → execute → contracts paused

### 22. RAT Tahunan ❌
Create RAT Tahunan proposal → vote → execute

## Fast Forward Buttons

| Button | Seconds | Use Case |
|---|---|---|
| ⏩ 7 Hari (Voting) | 604800 | End voting period |
| ⏩ 1 Hari (Timelock) | 86400 | End timelock before execution |

## Contract Addresses (deterministic)

| Contract | Address |
|---|---|
| MOCK_USDC | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| LAKOMI_TOKEN | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| LAKOMI_VAULT | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| LAKOMI_GOVERN | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| LAKOMI_LOANS | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
