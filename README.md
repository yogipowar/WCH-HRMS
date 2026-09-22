# Web Create Hub HRMS

Internal Human Resource Management System frontend for **Web Create Hub Digital Solutions**.

This phase is frontend-only: mock authentication, mock data, and a service layer ready for later API integration.

**Live demo:** [https://yogipowar.github.io/WCH-HRMS/](https://yogipowar.github.io/WCH-HRMS/)

Demo logins: `admin` / `Admin@123` (management) and `yogesh` / `Yogesh@123` (employee).

## Roles

- **Management / Admin** — full access to employees, attendance, leave approvals, reports, and settings
- **Employee** — personal attendance, leave, holidays, documents, and profile

There are no separate HR or Manager roles.

## Attendance rule

Active working time = elapsed work session − lunch and personal breaks.

The daily target is **9 active working hours**.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Hook Form, Zod, Recharts, date-fns.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) and use the demo login to enter as Agency Admin or an employee.
