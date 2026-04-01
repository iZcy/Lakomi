# Booking Flow (Dashboard + Backend)

## Dashboard Flowchart

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

## Backend Flowchart

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

## Use-Case Schema

| Actor | Dashboard Use Case | Backend Use Case |
|---|---|---|
| CS/Admin | Search schedule, choose seat, lock/unlock seat | Validate availability, create/cancel/seat mutation |
| CS/Admin | Create booking (`create-order-admin`) | Generate `bookingCode`, persist order set |
| CS/Admin | Pay full / DP / pelunasan | Execute payment handlers and status transitions |
| Supervisor/Admin level | Unlock conflict seat | Enforce lock authorization + queue-based expiry unlock |
| Ops | View reservation list/detail | Aggregate reservation/order views by booking |
