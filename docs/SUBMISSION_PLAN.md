# Lakomi — Submission Evaluation Plan

## Title
Blockchain-Based Cooperative System: Studi Kasus Implementasi DAO pada Jaringan DChain

---

## 5 Friends — Comparative Summary

| | Arden | Bian | Grandiv | Sakti | Dzaki |
|---|---|---|---|---|---|
| **Topic** | Blockchain RWA | dApp Crowdfund | AI Agent Trust | NLP Essay | ISO 27001 IR |
| **Thesis pages** | 56 | 117 | 113 | 161 | 110 |
| **Paper pages** | 4 | 4 | ACM (failed) | 5 | 5 |
| **Ch1 lines** | 80 | 152 | 97 | 225 | 82 |
| **Ch2 lines** | 128 | 250 | 872 | 1034 | **962** |
| **Ch3 lines** | 328 | 290 | 955 | 1683 | 427 |
| **Ch4 lines** | 491 | 660 | 509 | 1508 | 437 |
| **Ch5 lines** | 28 | 527 | 63 | 93 | 37 |
| **Total lines** | 1055 | 1879 | 2496 | 4576 | 1960 |
| **Closest to us** | 🎯🎯🎯 | 🎯🎯 | 🔶 | 🔶 | 🎯🎯🎯 |

**Dzaki is our NEW closest match** — he maps ISO 27001 controls (93 items) to compliance documents. We map UU 25/1992 pasals (26 items) to smart contracts. Same "compliance mapping" thesis pattern.

---

## What We Steal From Each

### From Arden (Blockchain — closest domain match)
- Ch1: 4-paragraph latar belakang flow (situation → problems → blockchain → gap)
- Ch3: DSR methodology + test plan tables (16 SC + 12 FE = 28 scenarios)
- Ch4: Screenshots with captions proving each feature
- Ch5: 3 conclusions matching 3 objectives word-for-word
- Paper: Clean 4-page IEEE format with test result tables

### From Bian (dApp — quantitative depth)
- Enumerated features list (10 fitur keamanan → we do 6 kategori kepatuhan)
- Gas cost table per operation
- Platform comparison table (3 columns)
- Formulas in displayed boxes (we use: bunga, quorum, SHU split)
- Gap-driven narrative: every chapter ties back to filling identified gaps

### From Grandiv (Most formal writing)
- **Kontribusi Penelitian** section — nobody else has this
- Manfaat: 3 categories (Akademis, Praktis, Industri)
- 6 specific Batasan with technical justifications
- Citation density: 1 cite per 1-2 sentences in Latar Belakang
- Every technical term is `\textit{}` in Indonesian text

### From Sakti (Deepest methodology)
- **"Jika tidak..." paragraph** after Rumusan Masalah — explains CONSEQUENCES of inaction. Unique to Sakti.
- 4 problems → 4 objectives exact mapping
- Extremely systematic experiment design (every parameter enumerated)

### From Dzaki (ISO Compliance Mapping — NEW BEST MATCH)
- **7-paragraph Latar Belakang** — escalation chain: digital transformation → cyber attacks → ISO 27001 → audit complexity → SoA bottleneck → LLM/RAG solution → THIS research gap
- **8 Batasan items** (most detailed — each a full technical justification paragraph)
- **Statistical significance baked into Rumusan Masalah** — "dan apakah perbedaan... signifikan secara statistik?"
- **Compliance mapping parallel**: 93 kontrol ISO → dokumen = 26 pasal UU → smart contracts
- Ch2 is 962 lines of literature review — massive depth
- **6 chapters!** (he has a Chapter 6 for Saran/Kesimpulan separated)

---

## Chapter Targets (updated for 5-friend average)

### Chapter 1 — Pendahuluan (target: 80-100 lines)
- [x] Latar Belakang: 6-7 escalating paragraphs (from Dzaki's pattern)
  1. Current koperasi situation in Indonesia
  2. Problems: opaque governance, manual treasury, limited participation
  3. Blockchain/DAO as potential solution
  4. Existing blockchain DAOs fail cooperative principles (token-weight voting)
  5. UU 25/1992 mandates equal voting, simpanan, SHU — no existing implementation
  6. DChain as Indonesian academic blockchain infrastructure
  7. This research: implement UU 25/1992 as smart contracts on DChain
- [x] Rumusan Masalah: 3 items → mapped 1:1 to Tujuan (from Arden)
- [ ] "Jika tidak..." paragraph (steal from Sakti)
- [ ] 5-8 Batasan items (from Dzaki/Grandiv: specific, technical)
- [ ] Manfaat: 3 categories (from Grandiv: Akademis, Praktis, Industri)
- [ ] Kontribusi Penelitian section (from Grandiv)

### Chapter 2 — Tinjauan Pustaka (target: 200-300 lines, 40+ citations)
- [ ] Blockchain fundamentals → EVM → Smart Contracts → AccessControl → DAO
- [ ] Koperasi fundamentals → UU 25/1992 → PP 7/2021 → Permenkop
- [ ] DChain architecture & deployment
- [ ] Similar systems comparison table (from Arden/Dzaki: prior work table)
- [ ] Compliance mapping theory (from Dzaki: mapping controls→documents = pasal→contracts)

### Chapter 3 — Metodologi (target: 300-400 lines)
- [x] DSR methodology (from Arden: 3 phases)
- [x] 4-contract architecture diagram
- [x] 26-item compliance test plan table (from Arden: 16+12 pattern)
- [ ] Tools stack table (from Arden: tech stack table)
- [ ] Evaluation metrics (from Dzaki: what we measure and how)

### Chapter 4 — Hasil & Pembahasan (target: 400-500 lines)
- [x] Screenshots of working app with explanations (from Arden)
- [x] 26-row compliance test table: Pasal → Contract Function → Status ✅ (from Dzaki's mapping pattern)
- [x] 3-column comparison: Lakomi vs Koperasi Tradisional vs DAO Token-Based (from Bian)
- [ ] Gas cost table: 5 key operations (from Bian)
- [ ] 2-3 key code snippets (from Arden/Bian)
- [ ] 3 formulas in boxes: bunga, quorum, SHU split (from Bian)
- [ ] 6 compliance categories enumerated (from Bian's 10 fitur pattern)

### Chapter 5 — Penutup (target: 30-50 lines)
- [x] 3 conclusions matching 3 objectives 1:1 (from Arden)
- [ ] 4-5 Saran items (from Arden)

### IEEE Paper (target: 250-350 lines, English, 4-5 pages)
- [x] Abstract: 1 paragraph, problem → solution → result (from Arden)
- [x] Sections: Intro → Related Work → System Design → Implementation → Evaluation → Conclusion
- [x] Quantitative results: 26 compliance tests, gas per function, comparison table
- [x] 4 tables, 1 architecture diagram
- [x] 14-16 references
- [ ] 2-3 displayed formulas (from Bian)

---

## Good to do (simplified from Bian)
- [ ] 6 compliance categories enumerated in Ch4
- [ ] 3 equations in mdframed boxes (from Bian)
- [ ] Gas cost table per key function
- [x] Comparison with traditional cooperatives

## Skip entirely
- Fuzz/invariant/fork tests
- Code coverage %
- Proxy pattern documentation
- Reentrancy attack analysis
- Slither static analysis
- 11 separate test tables → **1 consolidated compliance table**

---

## Submission Checklist

| # | Item | Status |
|---|---|---|
| 1 | Cover naskah (signed dosbing) | ⬜ Need signature |
| 2 | Cover paper (signed dosbing) | ⬜ Need signature |
| 3 | IEEE Paper (ENG, 4-8 pages) | ⬜ To write |
| 4 | Kartu bimbingan (signed) | ⬜ Physical document |
| 5 | Scan kehadiran KP 10x | ⬜ Physical document |
| 6 | Turnitin <30% | ⬜ Run after final |
| 7 | Thesis Ch1-5 LaTeX | ⬜ To write |
| 8 | 4 Regulation PDFs | ✅ Downloaded |
| 9 | 5 Academic paper PDFs | ✅ Downloaded |
