# Putra Remaja App Flows (Dashboard + Backend)

Source mapping was taken from remote server `izcy-engine`, mainly:
- `putraremajadev/pr-shuttle-dashboard`
- `putraremajadev/pr-shuttle-backend`

---

## 1. Booking Flow

### 1.1 Dashboard Flowchart

```mermaid
flowchart TD
  A[CS/Admin opens Reservasi page] --> B[Load outlets + departures + seat map]
  B --> C[Select trip and seats]
  C --> D[Lock seat via /api/lock-seat-admin]
  D --> E[Calculate fare via /api/orders/calculate-admin]
  E --> F[Create booking via /api/orders/create-order-admin]
  F --> G{Payment mode}
  G -->|Full| H[Pay via /api/orders/create-order-admin/pay]
  G -->|DP| I[Pay DP via /api/orders/admin/pay-dp]
  I --> J[Pelunasan via /api/orders/admin/pay-pelunasan]
  H --> K[Booking confirmed]
  J --> K
  K --> L[Optional: print manifest/ticket + send notification]
```

### 1.2 Backend Flowchart

```mermaid
flowchart TD
  A1[OrderController /orders/*] --> B1[Validate schedule, seats, pricing]
  B1 --> C1[Create order records + bookingCode]
  C1 --> D1[Seat lock lifecycle]
  D1 --> D2[lock]
  D1 --> D3[unlock by user/admin]
  D1 --> D4[unlock-seat-expired-queue worker]
  C1 --> E1{Payment event}
  E1 -->|pay| F1[Mark paid / update order status]
  E1 -->|dp| G1[Mark DP paid]
  E1 -->|pelunasan| H1[Mark fully paid]
  F1 --> I1[Trigger report/DW updates]
  G1 --> I1
  H1 --> I1
  I1 --> J1[Reservation read models for dashboard]
```

### 1.3 Use-Case Schema (Dashboard + Backend)

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| CS/Admin | Search schedule, choose seat, lock/unlock seat | Validate availability, create/cancel/seat mutation |
| CS/Admin | Create booking (`create-order-admin`) | Generate `bookingCode`, persist order set |
| CS/Admin | Pay full / DP / pelunasan | Execute payment handlers and status transitions |
| Supervisor/Admin level | Unlock conflict seat | Enforce lock authorization + queue-based expiry unlock |
| Ops | View reservation list/detail | Aggregate reservation/order views by booking |

---

## 2. Report Flow (DW Function)

### 2.1 Dashboard Flowchart

```mermaid
flowchart TD
  A[User opens report page] --> B{Report type}
  B --> B1[Laporan Harian]
  B --> B2[Laporan Outlet]
  B --> B3[Laporan Kota]
  B --> B4[Laporan Log Mutasi]
  B --> B5[OTA Settlement]
  B1 --> C[Call /api/report-daily]
  B2 --> D[Call /api/report-outlet]
  B3 --> E[Call /api/report-city]
  B4 --> F[Call /api/report-mutation]
  B5 --> G[Call /api/report-settlement/ota/*]
  C --> H[Render table + filters]
  D --> H
  E --> H
  F --> H
  G --> H
  H --> I[Export endpoint per report]
```

### 2.2 Backend Flowchart

```mermaid
flowchart TD
  A1[Operational transactions: order/payment/mutation] --> B1[DW updater hooks]
  B1 --> C1[DW collections]
  C1 --> C2[dwreportoutlets]
  C1 --> C3[checkpoint sync state]
  D1[GET /report-outlet/sync-data-warehousing] --> E1[Full/incremental sync process]
  E1 --> C2
  C2 --> F1[/report-outlet query]
  A1 --> G1[/report-daily, /report-mutation, /report-settlement]
  F1 --> H1[Paginated report response]
  G1 --> H1
  H1 --> I1[Export endpoints]
```

### 2.3 Use-Case Schema (Dashboard + Backend)

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| Ops/Analyst | Open report modules and apply filter | Query report controllers (`report-*`) |
| Ops/Analyst | Trigger export (CSV/XLS/PDF-like) | Build export dataset from report service |
| Admin | Trigger DW sync (`report-outlet`) | Run full/incremental DW sync + checkpoint update |
| System | Auto reflect paid/cancel/mutation events | Update DW aggregates from transactional changes |

---

## 3. Finance Flow (Manifest -> Uang Saku Claim -> Realisasi -> Premi Claim -> Kas Ledger)

### 3.1 Dashboard Flowchart

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

### 3.2 Backend Flowchart

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

### 3.3 Use-Case Schema (Dashboard + Backend)

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| Finance/Ops | Input uang saku per manifest | Validate manifest cost, write `admin/uang-saku-driver`, create ledger auto-entry |
| Finance/Ops | Save realisasi as draft | Persist realisasi with `status=draft` (no kas posting yet) |
| Finance/Ops | Post realisasi | Convert to `posted`, generate ledger entries from realisasi accounting logic |
| Finance/Ops | Build premi claim batch | Validate claim flags, lock claim role, generate premi ledger entries |
| Kas/Admin | Monitor kas harian | Read `admin/ledger`, top-up/pull-saldo/manual/print/sync-saldo |
| Auditor | Trace source transaction | Follow `sourceType/sourceId` links to Uang Saku/Realisasi/Premi documents |

---

## Notes

- Booking APIs are centered at `/orders` and dashboard wrappers call `/api/orders/*`.
- Report DW sync is explicit at `/report-outlet/sync-data-warehousing`.
- Finance posting behavior is explicit in realisasi: `draft` does not create ledger entries, `posted` does.
- Premi batch creation includes claim locking per role and ledger creation.
