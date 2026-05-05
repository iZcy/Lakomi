# UU 25/1992 Compliance Mapping for Lakomi Protocol

## Legal Basis
- Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian
- Sources: Maryam 2025 (Pendirian Koperasi), Arisudhana et al. 2025 (Prinsip Koperasi), Sailana et al. 2023 (Simpanan & SHU)

## Pasal → Contract → Implementation

### Pasal 5(1): Keanggotaan Sukarela & Terbuka
- **Contract**: LakomiToken
- **Implementation**: `registerMember()` — any address can self-register by paying Simpanan Pokok
- **Source**: Arisudhana et al. 2025, "Keikutsertaan didasarkan pada kesukarelaan dan tanpa pembatasan"

### Pasal 5(2): Pengelolaan Demokratis
- **Contract**: LakomiGovern
- **Implementation**: 1-member-1-vote via `castVote()`, quorum based on member count
- **Source**: Arisudhana et al. 2025, "Pengelolaan koperasi dilakukan secara demokratis"

### Pasal 5(3): Pembagian SHU Adil
- **Contract**: LakomiVault (new: `distributeSHU()`)
- **Implementation**: Revenue from loan interest accumulated, distributed proportionally by contribution shares
- **Source**: Sailana et al. 2023, "SHU = Total Revenue - Total Cost, dibagi sesuai jasa usaha"

### Pasal 22(1): Setiap Anggota Satu Suara
- **Contract**: LakomiGovern._castVote()
- **Implementation**: Already implemented — `proposalForVotes += 1` per member
- **Source**: Pasal 22 UU 25/1992

### Pasal 22(2): Wajib Bayar Simpanan Pokok & Wajib
- **Contract**: LakomiVault (new: Simpanan tracking)
- **Implementation**: Simpanan Pokok required on join, Simpanan Wajib monthly
- **Source**: Sailana et al. 2023, "Simpanan pokok dibayar sekali saat masuk, simpanan wajib dibayar berkala"

### Pasal 26-27: Rapat Anggota (RAT)
- **Contract**: LakomiGovern (new: `scheduleAnnualRAT()`)
- **Implementation**: Annual governance proposal auto-created for SHU approval, financial report, elections
- **Source**: Peran Pemerintah Provinsi paper, "Rapat Anggota merupakan kekuasaan tertinggi"

### Pasal 32: Pengurus
- **Contract**: AccessControl DEFAULT_ADMIN_ROLE
- **Implementation**: Admin manages daily operations, can be changed by governance
- **Source**: Tanggung Jawab Pengawas paper, "Pengurus mengelola koperasi"

### Pasal 38: Pengawas
- **Contract**: LakomiGovern (new: SUPERVISOR_ROLE)
- **Implementation**: Can veto proposals, trigger audits, pause contracts
- **Source**: Kartika et al. 2024, "Pengawas bertugas melakukan pengawasan"

### Pasal 41: Simpanan
- **Contract**: LakomiVault (restructured)
- **Implementation**:
  - Simpanan Pokok: fixed amount on `registerMember()` (e.g. 100 USDC)
  - Simpanan Wajib: monthly amount set by governance
  - Simpanan Sukarela: existing `deposit()` function
- **Source**: Sailana et al. 2023

### Pasal 45: SHU Distribution
- **Contract**: LakomiVault (new: `distributeSHU()`)
- **Implementation**: Accumulated revenue (loan interest) - operational costs = SHU pool, distributed by share %
- **Source**: Sailana et al. 2023, Model Pengelolaan Simpan Pinjam paper
