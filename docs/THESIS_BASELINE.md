# Lakomi Thesis Baseline

**Title**: Lakomi: A Blockchain-Based Cooperative System with Contribution-Based Reputation and Equal-Member Governance

**Author**: Yitzhak Edmund Tio Manalu (22/499769/TK/54763)
**Institution**: Departemen Teknologi Informasi, Universitas Gadjah Mada

---

## 1. Problem Statements

### P1: Opaque Governance in Traditional Koperasi
Traditional Indonesian cooperatives suffer from opaque governance, manual treasury management, and bureaucratic overhead. Members have limited visibility into decision-making and financial operations.
- **Source**: Hassan & De Filippi 2021 ("DAO as a special jurisdiction")
- **Source**: Arisudhana et al. 2025 (Prinsip Koperasi)
- **Lakomi Solution**: All cooperative rules encoded in immutable smart contracts; full transparency via on-chain data.

### P2: Token-Weighted Voting Conflicts with Cooperative Democracy
Most existing DAOs use token-weighted voting, creating plutocratic dynamics where wealthy members dominate. This violates the cooperative principle of democratic member control (Pasal 22 UU 25/1992).
- **Source**: Sun et al. 2022 ("Multiparty Democracy in MakerDAO") — token-weighted voting leads to plutocratic outcomes
- **Source**: Tamai & Kasahara 2024 ("DAO voting mechanism resistant to whale and collusion problems")
- **Source**: Sharma et al. 2024 ("Future of Algorithmic Organization") — large-scale DAO analysis
- **Lakomi Solution**: Strict 1-member-1-vote governance; `proposalForVotes += 1` per member, regardless of tokens held.

### P3: No Existing Blockchain System Complies with UU 25/1992
No prior blockchain cooperative implementation fully complies with Indonesian cooperative law (UU 25/1992), which mandates specific requirements for membership, deposits (Pasal 41), SHU distribution (Pasal 45), annual meetings (Pasal 26-27), and supervisory roles (Pasal 38).
- **Source**: Maryam 2025 (Pendirian Koperasi)
- **Source**: Sailana et al. 2023 (Simpanan & SHU)
- **Source**: Kartika et al. 2024 (Tanggung Jawab Pengawas)
- **Lakomi Solution**: Full UU 25/1992 compliance across all 4 smart contracts.

### P4: Tension Between Financial Contribution and Democratic Governance
Cooperatives need to incentivize financial contributions (deposits, loans) while maintaining equal voting rights. Existing systems either tie governance to capital (unfair) or ignore contribution incentives (unsustainable).
- **Source**: Saito & Rose 2023 ("Reputation-based DAO for non-profit sector")
- **Source**: Carata et al. 2024 ("Governance in the Blockchain Era: The Smart Social Contract")
- **Lakomi Solution**: Dual-track design — contribution-based reputation unlocks higher LTV tiers (30%/50%/70%), while governance remains strictly egalitarian.

### P5: Smart Contract Security Risks in Financial Applications
Cooperative financial operations (deposits, loans, SHU) handled via smart contracts are vulnerable to reentrancy, access control failures, and other attack vectors.
- **Source**: 24 papers in `smart-contract-security` category
- **Source**: Atzei et al. (Access Control Patterns for Smart Contracts)
- **Lakomi Solution**: Role-based access control (OpenZeppelin), reentrancy guards, `onlyRole` modifiers on sensitive functions (markDefaulted, claimCollateral).

### P6: Financial Exclusion in Rural/Underbanked Communities
Traditional cooperatives in Indonesia struggle to serve underbanked populations due to geographic barriers, manual processes, and lack of transparency.
- **Source**: 7 papers in `financial-inclusion` category
- **Source**: 37 papers in `koperasi-indonesia` category
- **Lakomi Solution**: Blockchain-based system accessible via wallet app, no physical presence required, transparent loan processing.

---

## 2. UU 25/1992 Compliance Mapping

| Pasal | Requirement | Contract | Implementation |
|---|---|---|---|
| **5(1)** | Keanggotaan Sukarela & Terbuka | LakomiToken | `registerMember()` — any address self-registers by paying Simpanan Pokok |
| **5(2)** | Pengelolaan Demokratis | LakomiGovern | 1-member-1-vote via `castVote()`, quorum based on member count |
| **5(3)** | Pembagian SHU Adil | LakomiVault | `distributeSHU()` — revenue distributed proportionally by contribution shares |
| **22(1)** | Setiap Anggota Satu Suara | LakomiGovern | `proposalForVotes += 1` per member (not token-weighted) |
| **22(2)** | Simpanan Pokok & Wajib | LakomiVault | Simpanan Pokok on join, Simpanan Wajib monthly via governance |
| **26-27** | Rapat Anggota (RAT) | LakomiGovern | `scheduleAnnualRAT()` — annual governance proposal for SHU approval |
| **32** | Pengurus | AccessControl | `DEFAULT_ADMIN_ROLE` manages operations, changeable by governance |
| **38** | Pengawas | LakomiGovern | `SUPERVISOR_ROLE` — can veto proposals, trigger audits |
| **41** | Simpanan (Pokok/Wajib/Sukarela) | LakomiVault | 3-tier deposit system: Pokok (join), Wajib (monthly), Sukarela (anytime) |
| **45** | SHU Distribution | LakomiVault | Revenue - costs = SHU pool, distributed by share percentage |

---

## 3. Research Methodology

Design Science Research (DSR) following Peffers et al. 2007 methodology:
1. **Problem Identification & Motivation** — P1-P6 above
2. **Objectives of the Solution** — UU 25/1992 compliant blockchain cooperative
3. **Design & Development** — 4 smart contracts (LakomiToken, LakomiVault, LakomiGovern, LakomiLoans)
4. **Demonstration** — 105 passing tests, deployed on Base Sepolia testnet
5. **Evaluation** — Gas profiling, test coverage, comparison with traditional cooperatives
6. **Communication** — This thesis + IEEE makalah skripsi

**DSR Sources**:
- Hevner et al. 2004 ("Design Science in Information Systems Research")
- Peffers et al. 2007 ("A Design Science Research Methodology")
- Vaishnavi & Kuechler 2004 ("Design Science Research Methods and Patterns")

---

## 4. System Architecture

4 Smart Contracts:
- **LakomiToken** — ERC-20 with membership management, contribution tracking, role-based access
- **LakomiVault** — Treasury management, 3-tier deposits (Pokok/Wajib/Sukarela), SHU distribution
- **LakomiGovern** — 1-member-1-vote proposals, quorum, voting periods, supervisor veto, RAT scheduling
- **LakomiLoans** — Collateralized microloans with LTV tiers (30%/50%/70%), partial repayment, default management

---

## 5. Source Paper Library (127 papers across 7 categories)

| Category | Count | Key Topics |
|---|---|---|
| `blockchain-foundations` | 11 | Bitcoin, Ethereum, EIP-20, DSR methodology |
| `cooperative-governance` | 30 | DAO governance, voting mechanisms, democratic blockchain |
| `financial-inclusion` | 7 | DeFi for developing countries, unbanked populations |
| `koperasi-indonesia` | 37 | Indonesian cooperative law, UU 25/1992, simpan pinjam |
| `smart-contract-security` | 24 | Access control, vulnerability detection, reentrancy |
| `tokenomics` | 18 | Token design, reputation systems, economic models |

**Cited in thesis** (references.bib): Nakamoto 2008, Wood 2014, Hassan & De Filippi 2021, Saito & Rose 2023, Sun et al. 2022, Tamai & Kasahara 2024, Sharma et al. 2024, Carata et al. 2024, El Amine & Sari 2024, Liu & Zhang 2024, Messias et al. 2023, Ma et al. 2023, Xu et al. 2023

---

## 6. Key Differentiation from Prior Work

| Prior Work | Limitation | Lakomi's Improvement |
|---|---|---|
| MakerDAO (Sun 2022) | Token-weighted voting | 1-member-1-vote |
| Generic DAOs (Sharma 2024) | No cooperative law compliance | Full UU 25/1992 compliance |
| Reputation DAOs (Saito 2023) | Reputation tied to governance | Reputation for LTV only, governance separate |
| Blockchain cooperatives (El Amine 2024) | Property registry focus | Full cooperative operations |
| DiktiChain | Credential verification | Financial cooperative operations |

---

## 7. E2E Compliance Testing Plan (Browser-Based Proof)

**Environment**: `http://localhost:5173` via Brave Wallet, Anvil chain ID 313377

**Setup**: Connect wallet with one of Anvil's funded accounts. Use DevFaucet to get USDC + LAK.

### Test 1: Pasal 5(1) — Keanggotaan Sukarela & Terbuka
- **Action**: Go to Pinjaman tab → fill registration form → click "Daftar"
- **TX**: `registerMember()` on LakomiToken
- **Expected**: Dashboard shows address as "Anggota" with LAK balance
- **Proof**: Any address can self-register voluntarily, no approval needed

### Test 2: Pasal 41 — Simpanan (Pokok / Wajib / Sukarela)
- **Action 1**: Verify Simpanan Pokok shows in Vault balance (paid on registration)
- **Action 2**: Click "Bayar Simpanan Wajib" → TX on LakomiVault
- **Action 3**: Enter amount → click "Setor Simpanan Sukarela" → TX on LakomiVault
- **Expected**: All 3 deposit types displayed separately with correct balances
- **Proof**: 3-tier deposit system per UU 25/1992 Pasal 41

### Test 3: Pasal 5(2) + Pasal 22(1) — 1 Anggota 1 Suara
- **Action 1**: Go to Tata Kelola tab → create proposal → TX
- **Action 2**: Cast vote on the proposal → TX
- **Expected**: Vote count = 1 per member, NOT weighted by LAK/USDC balance
- **Proof**: `proposalForVotes += 1` per `_castVote()` call, checked against `hasVoted`

### Test 4: Pasal 26-27 — Rapat Anggota Tahunan (RAT)
- **Action**: As admin, click "Jadwalkan RAT" → TX on LakomiGovern
- **Expected**: Proposal created with type "RAT Tahunan" visible in governance list
- **Proof**: `scheduleAnnualRAT()` creates a governance proposal for annual meeting

### Test 5: Pasal 38 — Pengawas (Veto Power)
- **Action**: As pengawas account, find active proposal → click "Veto" → TX
- **Expected**: Proposal status changes to "Diveto"
- **Proof**: Only `SUPERVISOR_ROLE` can call `veto()`, enforcing oversight

### Test 6: Pasal 5(3) + Pasal 45 — SHU Distribution & Claim
- **Action 1**: As admin, go to Vault → click "Distribusikan SHU" → TX
- **Action 2**: As member, select distribution ID → click "Klaim SHU" → TX
- **Expected**: SHU amount appears in member's claimable balance, then in USDC after claim
- **Proof**: `distributeSHU()` calculates per-share, `claimSHU(id)` pays out proportionally

### Test 7: Pinjaman — Full Loan Lifecycle
- **Action 1**: Request loan (approve USDC → requestLoan) → status "Menunggu"
- **Action 2**: As admin, click "Setujui" → status "Disetujui"
- **Action 3**: As admin, click " Cairkan" → status "Aktif", USDC received
- **Action 4**: As borrower, repay partial amount → remaining decreases
- **Action 5**: Repay full → status "Lunas"
- **Expected**: Full lifecycle from request to completion with all status transitions
- **Proof**: Collateral locked on disbursement, released on full repayment

### Test 8: Pasal 38 — Default Management (Pengawas Oversight)
- **Action 1**: Create loan, disburse, wait for or force past due
- **Action 2**: As approver, click "Tandai Gagal Bayar" → status "Gagal Bayar"
- **Action 3**: As approver, click "Klaim Jaminan" → collateral confiscated
- **Expected**: Defaulted loan flagged, collateral transferred to vault
- **Proof**: `onlyRole(APPROVER_ROLE)` protects both `markDefaulted()` and `claimCollateral()`

---

## 8. Test Evidence Collection

For each test, capture:
1. **Screenshot** of UI state before action
2. **Screenshot** of Brave Wallet TX confirmation dialog
3. **Screenshot** of UI state after TX confirms
4. **TX hash** from browser console or Anvil logs

These 8 tests provide complete proof that every relevant Pasal of UU 25/1992 is functionally enforced by the smart contracts through the frontend.

---

*This document serves as the baseline direction for the thesis. All future work should align with these problem statements, compliance requirements, and research methodology.*
