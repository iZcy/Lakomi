# Report Flow (DW Function)

## Dashboard Flowchart

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

## Backend Flowchart

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

## Use-Case Schema

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| Ops/Analyst | Open report modules and apply filter | Query report controllers (`report-*`) |
| Ops/Analyst | Trigger export (CSV/XLS/PDF-like) | Build export dataset from report service |
| Admin | Trigger DW sync (`report-outlet`) | Run full/incremental DW sync + checkpoint update |
| System | Auto reflect paid/cancel/mutation events | Update DW aggregates from transactional changes |
