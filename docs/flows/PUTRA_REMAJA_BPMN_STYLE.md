# Putra Remaja Consolidated BPMN-Style Schema

This diagram combines the 3 requested aspects in one cross-lane view:
- Booking flow
- Report flow (DW)
- Finance flow (manifest -> kas ledger)

```mermaid
flowchart LR
  subgraph L1[Dashboard Lane]
    D1[Reservasi UI]
    D2[Report UI]
    D3[Uang Saku UI]
    D4[Realisasi UI]
    D5[Premi UI]
    D6[Ledger UI]
  end

  subgraph L2[Backend API Lane]
    B1[/orders + /reservation]
    B2[/report-* + /report-outlet/sync-data-warehousing]
    B3[/admin/uang-saku-driver]
    B4[/admin/realisasi]
    B5[/admin/premi-driver-crew]
    B6[/admin/ledger]
  end

  subgraph L3[Domain/Processing Lane]
    P1[Seat lock/unlock + booking status transitions]
    P2[DW full/incremental aggregation + checkpoint]
    P3[Manifest cost sync + claim locking]
    P4[Ledger auto-entry engine + saldo recompute]
  end

  subgraph L4[Data Store Lane]
    S1[(Orders/Reservations)]
    S2[(DW Report Collections)]
    S3[(Manifest/UangSaku/Realisasi/Premi)]
    S4[(Kas Ledger + Categories)]
  end

  %% Booking
  D1 --> B1 --> P1 --> S1
  P1 --> S2

  %% Report DW
  D2 --> B2 --> P2 --> S2

  %% Finance chain
  D3 --> B3 --> P3 --> S3
  D4 --> B4 --> P3
  D5 --> B5 --> P3
  P3 --> P4 --> S4
  D6 --> B6 --> P4
  B6 --> S4

  %% Cross-domain linkage
  S3 --> P4
  S1 --> P2
```

## Consolidated Use-Case Matrix

| Aspect | Primary Actor | Dashboard Action | Backend Action | Data Impact |
|---|---|---|---|---|
| Booking | CS/Admin | lock seat, create booking, pay/DP/pelunasan | `/orders` create + payment handlers + unlock flows | order + reservation status + DW refresh trigger |
| Report DW | Ops/Analyst/Admin | open report, filter, export, sync DW | `/report-*` read/export, `/report-outlet/sync-data-warehousing` | DW report collections + checkpoint |
| Finance | Finance/Kas/Admin | create uang saku, post realisasi, claim premi, monitor ledger | `/admin/uang-saku-driver`, `/admin/realisasi`, `/admin/premi-driver-crew`, `/admin/ledger` | manifest-linked financial docs + kas ledger saldo |
