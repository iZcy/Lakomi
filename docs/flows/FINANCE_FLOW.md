# Finance Flow (Manifest -> Uang Saku Claim -> Realisasi -> Premi Claim -> Kas Ledger)

## Dashboard Flowchart

```mermaid
flowchart TD
  A[Manifest tersedia] --> B[Uang Saku module]
  B --> C[Create/adjust uang saku claim]
  C --> D[Realisasi module]
  D --> E[Load manifest budget baseline]
  E --> F[Input actual realisasi]
  F --> G{Status}
  G -->|Draft| H[Saved but not posted to kas]
  G -->|Posted| I[Post to kas harian]
  I --> J[Premi module]
  J --> K[Select manifests + preview person payout]
  K --> L[Create premi claim batch]
  L --> M[Ledger page]
  M --> N[View saldo, source links, print, sync saldo]
```

## Backend Flowchart

```mermaid
flowchart TD
  A1[Departure Manifest + master costs] --> B1[UangSakuDriver POST/PUT]
  B1 --> C1[Create/replace auto ledger entry: UANG SAKU DRIVER]
  C1 --> D1[Sync saldo by date]
  B1 --> E1[Sync edited cost back to manifest]
  E1 --> F1[Realisasi create: status draft]
  F1 --> G1[No ledger entry while draft]
  F1 --> H1[Realisasi update status posted]
  H1 --> I1[Create auto ledger entries for realisasi]
  I1 --> J1[PremiDriverCrew create]
  J1 --> K1[Lock role claim flags per manifest/person]
  K1 --> L1[Create per-person premi ledger entries]
  L1 --> M1[LedgerService list/saldo/print/sync-saldo/sync-sources]
```

## Use-Case Schema

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| Finance/Ops | Input uang saku per manifest | Validate manifest cost, write `admin/uang-saku-driver`, create ledger auto-entry |
| Finance/Ops | Save realisasi as draft | Persist realisasi with `status=draft` (no kas posting yet) |
| Finance/Ops | Post realisasi | Convert to `posted`, generate ledger entries from realisasi accounting logic |
| Finance/Ops | Build premi claim batch | Validate claim flags, lock claim role, generate premi ledger entries |
| Kas/Admin | Monitor kas harian | Read `admin/ledger`, top-up/pull-saldo/manual/print/sync-saldo |
| Auditor | Trace source transaction | Follow `sourceType/sourceId` links to Uang Saku/Realisasi/Premi documents |
