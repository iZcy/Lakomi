# Lakomi — Writing Strategy

## Order of Attack (write in this order)

| Step | Document | Time | Why first |
|---|---|---|---|
| 1 | IEEE Paper | 2-3 days | Mini version of thesis. Forces you to distill the core. |
| 2 | Ch3 Metodologi | 1 day | Easiest — describe what you already built. |
| 3 | Ch4 Hasil | 2 days | The winning chapter. All your screenshots + tables. |
| 4 | Ch2 Tinjauan Pustaka | 1 day | Write while knowing what you proved in Ch4. |
| 5 | Ch1 Pendahuluan | 1 day | Write LAST — you now know exactly what you did. |
| 6 | Ch5 Penutup | 0.5 day | Quick — 3 conclusions = 3 objectives. |

---

## TASK 1: IEEE PAPER (English, 4-5 pages, IEEE format)

**Source file:** `docs/latex-templates/my-makalah-skripsi/main.tex` (current draft)

### Section-by-section plan

#### Abstract (1 paragraph, 150-200 words)
```
Sentence 1: Problem — Indonesian koperasi face opaque governance, manual treasury, and limited member participation.
Sentence 2: Gap — Existing DAO models use token-weighted voting, violating UU 25/1992's one-member-one-vote principle.
Sentence 3: Solution — Lakomi: a blockchain-based cooperative system implementing 26 pasals of UU 25/1992 as four smart contracts on DChain.
Sentence 4: Method — Design Science Research: 4 contracts (Token, Vault, Govern, Loans), 5 role-based accounts, EVM-compatible.
Sentence 5: Results — 26 compliance tests passed, 3 formulas validated, gas costs profiled.
```

#### I. Introduction (4 paragraphs)
```
P1: Indonesian koperasi context — 127,000+ cooperatives nationwide, $10B+ combined assets. However: corruption, opaque books, inactive members. [cite Sailana 2023]

P2: Blockchain/DAO offers transparency and automation. But existing DAOs (MakerDAO, Compound) use plutocratic token voting — violates cooperative principle of 1-member-1-vote. [cite Sharma 2024, Arisudhana 2025]

P3: Regulatory vacuum — UU 25/1992 mandates equal voting, simpanan pokok/wajib, SHU distribution, pengawas oversight. No existing system implements these as enforceable smart contract rules. [cite Maryam 2025]

P4: This paper presents Lakomi, deployed on DChain (Indonesian academic consortium blockchain). Maps 26 pasals to 4 contracts. Contributions: (1) first complete UU 25/1992 smart contract implementation, (2) dual-track design separating contribution tiers from voting power, (3) 6-category SHU distribution verified on-chain.
```

#### II. Related Work (cite 8-10 papers)
```
2.1 Blockchain Cooperatives — El Amine 2024, Sailana 2023
2.2 DAO Governance — Sharma 2024, Bellavitis 2025
2.3 UU 25/1992 Digital Implementation — Maryam 2025, Antoni 2024
2.4 DChain Infrastructure — Luo 2025, Mishra 2025
```

#### III. System Design (with Figure 1: architecture diagram)
```
3.1 Architecture Overview — Figure 1: 4-contract diagram (Token ↔ Vault ↔ Govern ↔ Loans)
3.2 Smart Contract Design
  - LakomiToken: ERC-20 + membership registry (1-member-1-vote). transfersEnabled=false (Pasal 18.2).
  - LakomiVault: 3 simpanan types + 6-category SHU. Treasury managed by TREASURER_ROLE.
  - LakomiGovern: Proposal→Vote→Queue→Execute. Quorum 67% (Pasal 23). Elections via beginElection→finalizeElection.
  - LakomiLoans: Loan request→approval→disbursement→repayment. autoApproveThreshold=0 (Pasal 18).
3.3 Role-Based Access Control — 5 roles: Pengawas, Pengurus, Membership, Bendahara, Govern. No single admin.
3.4 Key Formulas (3 displayed equations in boxes)
  Formula 1: Bunga = (P × 500 × D) / (10000 × 365)
  Formula 2: Quorum = (memberCount × 67) / 100
  Formula 3: SHU = (revenue × categoryBPS) / 10000 (6 categories)
```

#### IV. Implementation (with Table 1: compliance mapping)
```
Table 1: 26 Pasal → Smart Contract Mapping (6 columns: No, Pasal, Requirement, Contract, Function, Status)
- 6 categories: Keanggotaan (5 pasals), Simpanan (6), Pinjaman (3), Tata Kelola (7), SHU (3), Pengawas (2)
```

#### V. Evaluation (with Tables 2-3)
```
5.1 Compliance Testing — All 26 pasals verified via functional tests. Table 2: sample of 10 key pasals with test scenario and result.
5.2 Gas Cost Analysis — Table 3: 5 key operations with gas costs (registerMember, requestLoan, distributeSHU, castVote, finalizeElection)
5.3 Comparison — Table 4: Lakomi vs Traditional Koperasi vs Token-Weighted DAO (6 comparison rows: voting, transparency, SHU, audit, cost, accessibility)
5.4 Formulas Validated — bunga calculation matches contract, quorum triggers correctly at 67%, SHU splits sum to 10000.
```

#### VI. Conclusion (1 paragraph)
```
This paper presented Lakomi, the first complete implementation of UU 25/1992 as blockchain smart contracts. 26 pasals mapped to 4 contracts with 5-role access control. Compliance verified through functional testing. The dual-track design demonstrates that democratic governance can coexist with contribution-based financial incentives. Future work: DChain mainnet deployment, integration with government koperasi registry, member education interface.
```

#### References (14-16 entries)
```
[1] Sailana et al. 2023 — Simpanan & SHU
[2] Arisudhana et al. 2025 — Prinsip Koperasi Blockchain
[3] Maryam 2025 — Analisis Yuridis UU 25/1992
[4] Kartika et al. 2024 — Peran Pengawas
[5] Antoni & Razaga 2024 — Permasalahan Hukum KSP
[6] UU No. 25 Tahun 1992
[7] PP No. 7 Tahun 2021
[8] Permenkop No. 8 Tahun 2023
[9] Nakamoto 2008 — Bitcoin
[10] Buterin 2014 — Ethereum
[11] Wood 2014 — EVM Yellow Paper
[12] Sharma 2024 — DAO Governance Futures
[13] Bellavitis 2025 — Blockchain Voting
[14] OpenZeppelin 2024 — AccessControl
[15] Zheng 2018 — Blockchain Overview
[16] Luo 2025 — DChain Security
```

---

## TASK 2: CHAPTER 3 — METODOLOGI (Bahasa Indonesia)

**Write this first — it's the easiest. You're describing what you already built.**

### Structure

```
3.1 Alat dan Bahan
  - Table: Tools (Hardhat, Solidity 0.8.20, React/Vite, wagmi, Docker, MetaMask)
  - Table: Environment (DChain testnet, Anvil local, Node.js 20)

3.2 Metode Penelitian
  - Design Science Research (Hevner 2004, Peffers 2007)
  - 3 phases: (1) Problem identification + literature, (2) Artifact design + implementation, (3) Evaluation + compliance mapping

3.3 Arsitektur Sistem
  - Figure: 4-contract architecture diagram
  - Description: Token for membership/governance tokens, Vault for treasury/SHU, Govern for proposals/elections, Loans for lending/collateral
  - Figure: Role hierarchy diagram (5 roles → 4 contracts)

3.4 Desain Smart Contract
  - LakomiToken: ERC-20, transfersEnabled=false, registerMember requires simpananPokok, resignMembership
  - LakomiVault: paySimpananPokok/Wajib, deposit, distributeSHU (6 categories), getPengawasAuditReport
  - LakomiGovern: createProposal, castVote, execute, beginElection, finalizeElection, vetoProposal
  - LakomiLoans: requestLoan, approveLoan, disburseLoan, repayInFull, hasActiveLoans

3.5 Desain Frontend
  - 7 tabs: Beranda, Simpanan, Pinjaman, Tata Kelola, Kepatuhan Hukum, Anggota, Dev Faucet
  - wagmi hooks for contract interaction
  - Table: Frontend test scenarios (10 scenarios)

3.6 Strategi Pengujian
  - Table: 26-row compliance test plan
    Columns: No | Pasal UU 25/1992 | Ketentuan | Fungsi Kontrak | Hasil Diharapkan | Status
  - Fungsional: setiap fungsi diuji dengan skenario positif/negatif
  - Gas profiling: 5 fungsi kunci diukur konsumsi gas
```

---

## TASK 3: CHAPTER 4 — HASIL DAN PEMBAHASAN

### Structure

```
4.1 Implementasi Smart Contract
  - Screenshot: Hardhat deployment output (5 contracts deployed)
  - Table: Contract addresses on DChain
  - Code snippet: registerMember() (5 lines — shows simpananPokok check)
  - Code snippet: distributeSHU() (10 lines — shows 6-category split)

4.2 Implementasi Frontend
  - Screenshot: Dashboard (balance cards)
  - Screenshot: Simpanan page (3 payment types)
  - Screenshot: Pinjaman page (loan form + bunga preview)
  - Screenshot: Tata Kelola (proposal creation + voting)
  - Screenshot: Kepatuhan Hukum (26 pasal side-by-side with PDF text)
  - Screenshot: Anggota (member directory with role badges)

4.3 Hasil Pengujian Kepatuhan UU 25/1992
  - Table: 26-row compliance verification
    No | Pasal | Ketentuan | Kontrak | Fungsi | Status | Bukti
    1  | 5(1) | Keanggotaan Terbuka | Token | registerMember() | ✅ | Terdaftar
    2  | 5(2) | Pengelolaan Demokratis | Govern | castVote() | ✅ | 1 suara
    ...
    26 | 47   | Laporan Keuangan | Vault | generateFinancialSnapshot() | ✅ | Snapshot

4.4 Kategori Kepatuhan
  - 6 categories enumerated:
    1. Keanggotaan (5 pasal: 5.1, 17, 18, 18.2, 19-21)
    2. Simpanan (6 pasal: 22.2, 41 pokok, 41 wajib, 41 sukarela, 41.3, 43)
    3. Pinjaman (3 pasal: 18 pinjaman, collateral 25%, grace period)
    4. Tata Kelola (7 pasal: 22.1, 23, 26-27, 29-30, 31, 38, 39.2)
    5. SHU & Laporan (3 pasal: 45.1, 45.2, 46-47)
    6. Pengawas & Pembubaran (2 pasal: 38 pengawas, 33-35)

4.5 Analisis Gas
  - Table: 5 key operations with gas cost
    Fungsi | Gas Used | USD Equivalent | Kategori
    registerMember | X gas | $Y | Keanggotaan
    requestLoan | X gas | $Y | Pinjaman
    castVote | X gas | $Y | Tata Kelola
    distributeSHU | X gas | $Y | SHU
    finalizeElection | X gas | $Y | Tata Kelola

4.6 Perbandingan Sistem
  - Table: Lakomi vs Koperasi Tradisional vs DAO Token-Based
    Aspek | Koperasi Tradisional | DAO Token | Lakomi
    Voting | Manual/paper | Token-weight | 1 member = 1 vote
    Transparansi | Buku manual | Public ledger | Public ledger + audit report
    SHU | Manual calculation | Proportional | 6-category split
    Biaya | Admin salary | Gas fees | Gas fees
    Audit | Periodik eksternal | On-chain public | Pengawas audit function
    Regulasi | UU 25/1992 | None | 26 pasal implemented

4.7 Validasi Formula
  - Bunga: contoh perhitungan (1000 USDC × 30 hari = X bunga)
  - Quorum: contoh (10 members × 67% = 7 votes needed)
  - SHU: contoh (1000 USDC revenue → 100 reserve, 900 distributable → 45 cadangan, 360 jasaModal, 360 jasaUsaha, 45 pendidikan, 45 pengurus, 45 kesejahteraan)
```

---

## TASK 4: CHAPTER 2 — TINJAUAN PUSTAKA

```
2.1 Blockchain dan Smart Contract
  - Blockchain: distributed ledger (Nakamoto 2008, Zheng 2018)
  - Ethereum dan EVM (Buterin 2014, Wood 2014)
  - Smart Contract: self-executing code (Szabo 1997)
  - AccessControl: RBAC via OpenZeppelin (OpenZeppelin 2024)
  - DChain: konsorsium blockchain pendidikan Indonesia (Mishra 2025)

2.2 Decentralized Autonomous Organization (DAO)
  - Definisi DAO (Hassan 2021, Sharma 2024)
  - Model governance: token-weighted vs equal voting
  - DAO untuk koperasi (El Amine 2024, Sailana 2023)
  - Keterbatasan: plutokrasi, partisipasi rendah (Bellavitis 2025)

2.3 Koperasi di Indonesia
  - Definisi dan prinsip (UU 25/1992)
  - Struktur: RAT → Pengurus → Pengawas (Pasal 21-39)
  - Simpanan: Pokok, Wajib, Sukarela (Pasal 41)
  - SHU: distribusi proporsional (Pasal 45)
  - Tantangan: transparansi, partisipasi, efisiensi (Sailana 2023)

2.4 Regulasi Terkait
  - UU 25/1992: landasan hukum perkoperasian (Maryam 2025)
  - PP 7/2021: kemudahan dan pemberdayaan koperasi
  - Permenkop 9/2018: penyelenggaraan perkoperasian
  - Permenkop 8/2023: usaha simpan pinjam koperasi
  - Kepatuhan via smart contract (Antoni & Razaga 2024)

2.5 Penelitian Terdahulu
  - Table: comparison of related systems
    Peneliti | Topik | Blockchain | Kepatuhan UU | Voting | SHU
    Arisudhana 2025 | Prinsip Koperasi | Ya | Tidak | - | -
    Sailana 2023 | Simpanan SHU | Ya | Parsial | - | Proportional
    El Amine 2024 | Property Coop | Ya | Tidak | Token | -
    Lakomi (ini) | Full Koperasi | Ya | 100% (26 pasal) | 1-member-1-vote | 6-category
```

---

## TASK 5: CHAPTER 1 — PENDAHULUAN

### 7-paragraph escalation (from Dzaki)

```
P1: Koperasi Indonesia — 127.000+ unit, aset >$10B, tulang punggung ekonomi kerakyatan. Namun: korupsi dana, buku tidak transparan, partisipasi anggota rendah. [cite Sailana 2023]

P2: Masalah struktural: (1) pencatatan manual rawan manipulasi, (2) voting tidak inklusif — anggota pasif, (3) distribusi SHU tidak transparan, (4) pengawasan lemah — pengawas tidak punya akses real-time. [cite Kartika 2024]

P3: Blockchain dan DAO menawarkan transparansi dan otomatisasi. Smart contract mengeksekusi aturan tanpa intervensi manusia. Distributed ledger mencatat semua transaksi imutabel. [cite Nakamoto 2008, Buterin 2014]

P4: Namun DAO existing (MakerDAO, Compound) menggunakan token-weighted voting — bertentangan dengan UU 25/1992 Pasal 22(1): satu anggota satu suara. Belum ada sistem yang mengimplementasikan UU 25/1992 secara menyeluruh sebagai smart contract. [cite Sharma 2024]

P5: Regulasi UU 25/1992 mencakup 26 ketentuan: keanggotaan (Pasal 5-21), RAT (Pasal 26-27), pengurus (Pasal 29-32), pengawas (Pasal 38-39), simpanan (Pasal 41), SHU (Pasal 45), laporan (Pasal 46-47). Tidak ada implementasi on-chain yang lengkap. [cite Maryam 2025]

P6: DChain sebagai infrastruktur blockchain konsorsium pendidikan tinggi Indonesia menyediakan lingkungan EVM-compatible untuk deployment smart contract. [cite Mishra 2025]

P7: Penelitian ini mengimplementasikan Lakomi: 4 smart contract yang memetakan 26 ketentuan UU 25/1992 ke dalam sistem koperasi berbasis blockchain pada jaringan DChain.

### Rumusan Masalah (3 items → 3 tujuan)
1. Bagaimana merancang smart contract yang mengimplementasikan ketentuan UU 25/1992 untuk sistem koperasi berbasis blockchain?
2. Bagaimana memetakan 26 ketentuan UU 25/1992 ke dalam fungsi smart contract yang terverifikasi?
3. Bagaimana mengevaluasi kepatuhan sistem terhadap UU 25/1992 melalui pengujian fungsional dan analisis gas?

### "Jika tidak..." (from Sakti)
Apabila sistem koperasi tidak mengadopsi blockchain: pencatatan tetap manual dan rawan manipulasi, voting anggota tetap pasif dan tidak inklusif, pengawasan tetap lemah tanpa akses real-time, dan kepatuhan terhadap UU 25/1992 tetap bergantung pada itikad baik pengurus tanpa verifikasi independen.

### Tujuan (3 items, 1:1 map)
1. Merancang dan mengimplementasikan 4 smart contract (Token, Vault, Govern, Loans) untuk sistem koperasi sesuai UU 25/1992.
2. Memetakan 26 ketentuan UU 25/1992 ke dalam fungsi smart contract dan memverifikasi melalui pengujian fungsional.
3. Mengevaluasi kepatuhan sistem melalui 26 skenario pengujian, analisis gas, dan perbandingan dengan koperasi tradisional.

### Batasan (5-6 items, from Grandiv/Dzaki)
1. Sistem di-deploy pada DChain testnet, bukan mainnet.
2. Implementasi mencakup 26 ketentuan UU 25/1992 yang bersifat operasional — ketentuan administratif (pendirian AD/ART, notaris) di luar lingkup.
3. Pengujian fungsional — tidak mencakup audit keamanan formal atau penetration testing.
4. Frontend sebagai prototipe — tidak dioptimasi untuk production deployment.
5. 5 role menggunakan akun terpisah — integrasi dengan sistem autentikasi eksternal (OAuth, KYC) di luar lingkup.

### Manfaat (3 categories, from Grandiv)
Akademis: (1) Kontribusi pertama implementasi UU 25/1992 sebagai smart contract, (2) Metodologi pemetaan regulasi-ke-kontrak, (3) Referensi blockchain koperasi di Indonesia.
Praktis: (1) Cetak biru digitalisasi koperasi, (2) Mendukung audit kepatuhan via pengawas on-chain, (3) Mengurangi biaya operasional koperasi.
Industri: (1) Mendukung program pemerintah "Koperasi Digital", (2) Kompatibel dengan DChain infrastruktur pendidikan tinggi.

### Kontribusi Penelitian (from Grandiv)
1. Implementasi lengkap pertama UU 25/1992 sebagai smart contract — 26 pasal, 4 kontrak, 5 role.
2. Arsitektur dual-track: kontribusi finansial memengaruhi LTV pinjaman, tetapi voting tetap 1-anggota-1-suara.
3. Metodologi pemetaan regulasi-ke-kontrak yang dapat direplikasi untuk regulasi lain.
4. 6-kategori SHU on-chain — pertama kali diimplementasikan dalam smart contract koperasi.
```

---

## TASK 6: CHAPTER 5 — PENUTUP

```
5.1 Kesimpulan (3 items = 3 objectives)
1. Empat smart contract (Token, Vault, Govern, Loans) berhasil dirancang dan diimplementasikan pada DChain, mencakup seluruh siklus koperasi: pendaftaran → simpanan → pinjaman → tata kelola → SHU.
2. 26 ketentuan UU 25/1992 berhasil dipetakan ke fungsi smart contract. Seluruh 26 pengujian fungsional menunjukkan Status Lulus (100%).
3. Evaluasi kepatuhan menunjukkan sistem Lakomi unggul dalam transparansi (distributed ledger), demokrasi (1-member-1-vote), dan otomatisasi (SHU 6-kategori) dibanding koperasi tradisional maupun DAO token-weighted.

5.2 Saran (4 items, from Arden)
1. Deployment pada DChain mainnet untuk validasi di lingkungan produksi.
2. Integrasi dengan sistem KYC/identitas digital untuk verifikasi anggota.
3. Pengembangan antarmuka pendidikan anggota untuk meningkatkan literasi blockchain.
4. Audit keamanan formal (CertiK, Trail of Bits) sebelum deployment production.
```

---

## Citation Map

| Source | Use in chapter |
|---|---|
| Nakamoto 2008 | Ch2: blockchain fundamentals |
| Buterin 2014, Wood 2014 | Ch2: Ethereum/EVM |
| Szabo 1997 | Ch2: smart contracts |
| Zheng 2018 | Ch2: blockchain overview |
| OpenZeppelin 2024 | Ch2: AccessControl |
| Sailana et al. 2023 | Ch1: koperasi context, Ch2: simpanan SHU |
| Arisudhana et al. 2025 | Ch2: prinsip koperasi blockchain |
| Maryam 2025 | Ch1: UU 25/1992, Ch2: analisis yuridis |
| Kartika et al. 2024 | Ch1: pengawas, Ch2: peran pengawas |
| Antoni & Razaga 2024 | Ch1: hukum KSP, Ch2: permasalahan hukum |
| Sharma 2024 | Ch2: DAO governance |
| Bellavitis 2025 | Ch2: blockchain voting |
| Hassan 2021 | Ch2: DAO definition |
| El Amine 2024 | Ch2: blockchain cooperative |
| Hevner 2004 | Ch3: DSR methodology |
| Peffers 2007 | Ch3: DSR methodology |
| Mishra 2025 | Ch2: DChain, Ch3: deployment |
| UU 25/1992 | Ch1-5: all pasals |
| PP 7/2021 | Ch2: regulatory |
| Permenkop 8/2023 | Ch2: simpan pinjam |
| Permenkop 9/2018 | Ch2: penyelenggaraan |
