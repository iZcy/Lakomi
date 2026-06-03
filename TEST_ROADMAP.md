# Lakomi Test Roadmap

## Accounts

| # | MetaMask | Address | Role | Test Purpose |
|---|---|---|---|---|
| Main | Wallet 1 | `0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6` | Member | Primary user |
| Acc1 | Acc1 | `0x7099...79C8` | Pengawas | Veto (case 12) |
| Acc2 | Acc2 | `0x3C44...93BC` | Pengurus | Approve/Reject loans (cases 1,17) |
| Acc3 | Acc3 | `0x90F7...B906` | Member | Quorum voter + kick target |
| Acc4 | Acc4 | `0x15d3...6A65` | Bendahara | Sertifikat (case 20) |
| Acc5 | Acc5 | `0x9965...A4dc` | Govern | SHU + Election admin (10,15) |
| Acc6 | Acc6 | `0x976E...0AA9` | Member | Quorum voter |
| Acc7 | Acc7 | `0x14dc...9955` | Member | Quorum voter |
| Acc8 | Acc8 | `0x2361...1E8f` | Member | Quorum voter |

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
