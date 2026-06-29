# LasyaRasa Hub — Provider Portal

Angular 17+ SPA for the Vidya Rasa school admin vertical. Deployed at `app.lasyarasahub.com/school-admin`.

## Tech Stack

- Angular 17+ (standalone components, signals, `inject()`)
- Angular Material (tables, dialogs, tabs, cards)
- Spring Boot backend at `app.lasyarasahub.com/api`

## Local Development

```bash
npm install
ng serve
# http://localhost:4200
```

The `environment.ts` points to the production API by default. To develop against a local backend, change `apiUrl` in `src/environments/environment.ts`.

## Production Build & Deploy

```bash
# Build
npm run build -- --configuration production

# Deploy (SCP the browser/ subdirectory — NOT dist/provider-portal/ directly)
scp -i ~/.ssh/id_vps -r dist/provider-portal/browser/* \
  root@147.93.96.131:/root/lasyarasahub/provider-portal/
```

No container restart needed — nginx serves the volume directly.

## Route Map

| Route | Description |
|-------|-------------|
| `/login` | JWT auth |
| `/dashboard` | Single-API dashboard: stats, active classes, recent registrations, recent students, fee snapshot |
| `/vidya-rasa/students` | Student list with status tabs (All / Active / On Break / Needs Attention / Dropped), sort, drag-to-reorder columns |
| `/vidya-rasa/students/:id` | Student profile |
| `/vidya-rasa/classes` | Class management |
| `/vidya-rasa/fees` | Fee tracking; accepts `?status=PENDING|OVERDUE` query param for deep-link from dashboard |
| `/vidya-rasa/invoices` | Invoice list — generate, email, void |
| `/vidya-rasa/registrations` | Registration review — approve (assigns class, creates student) or reject |
| `/settings` | Age groups, dance styles, fee tiers, email, currency |
| `/register/:token` | Public student registration form (no auth) |

## Key Patterns

**Signals for state**
```typescript
students = signal<Student[]>([]);
filtered = computed(() => this.students().filter(...));
```

**Deep-linking to a filtered view**
```typescript
// Navigate with filter
this.router.navigate(['/vidya-rasa/fees'], { queryParams: { status: 'PENDING' } });

// Receive in target component
this.route.queryParams.subscribe(p => {
  if (p['status']) this.statusFilter.set(p['status']);
});
```

**Fixed-layout tables**
All column widths in `student-list` must be explicit and sum to 100%. Set in both `colDef` (TypeScript) and `.mat-column-*` (SCSS). Without this, `table-layout: fixed` cascades misalignment across all columns to the right of any missing entry.

## Project Structure

```
src/app/
├── core/
│   ├── auth/           ← JWT auth service, guards
│   ├── models/         ← TypeScript interfaces
│   └── services/       ← Currency service
├── features/
│   ├── dashboard/      ← Dashboard component
│   ├── vidya-rasa/
│   │   ├── students/
│   │   ├── classes/
│   │   ├── fees/
│   │   ├── invoices/
│   │   └── registrations/
│   ├── settings/
│   ├── register/       ← Public registration form
│   └── admin/          ← Super-admin (provider management)
└── layout/
    ├── shell/
    └── sidebar/
```
