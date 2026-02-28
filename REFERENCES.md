# Reference Repositories

This document tracks reference repos cloned under `_refs/` for design/pattern research only.

## 1) shadcn-ui-landing-page
- Repo: https://github.com/akash3444/shadcn-ui-landing-page
- Framework:
  - Next.js `15.5.9`
  - App Router (`app/`)
- Key UI/component folders:
  - `components/`
  - `components/ui/`
  - `components/navbar/`
- License:
  - No `LICENSE` file found (treat as non-permissive / all rights reserved)
- Reuse plan:
  - Borrow visual ideas only (hero spacing, card hierarchy, section composition)
  - Do not copy code directly

## 2) shadcn-dashboard-landing-template
- Repo: https://github.com/silicondeck/shadcn-dashboard-landing-template
- Framework:
  - Monorepo-style template with multiple versions at root
  - Next.js implementation is in `nextjs-version/`
  - Next.js `16.1.1`
  - App Router (`nextjs-version/src/app`)
- Key UI/component folders:
  - `nextjs-version/src/components/ui/`
  - `nextjs-version/src/components/landing/`
  - `nextjs-version/src/components/layouts/`
  - `nextjs-version/src/app/landing/components/`
- License:
  - MIT (`License.md`)
- Reuse plan:
  - Safe to reuse UI sections/components/patterns with attribution
  - Priority source for landing sections, nav, cards, and dashboard-style blocks

## 3) task-manager-nextjs
- Repo: https://github.com/hasanulmukit/task-manager-nextjs
- Framework:
  - Next.js `15.1.6`
  - App Router (`src/app`)
- Key UI/component folders:
  - `src/components/` (`Board.tsx`, `Column.tsx`, `TaskCard.tsx`, modals)
- License:
  - No `LICENSE` file found (treat as non-permissive / all rights reserved)
- Reuse plan:
  - Borrow interaction ideas only (task board flows, modal interactions)
  - Do not copy code directly

## 4) formspree-example-next
- Repo: https://github.com/formspree/formspree-example-next
- Framework:
  - Next.js `latest` (from `package.json`)
  - Pages Router (`pages/`)
- Key UI/component folders:
  - `components/` (`contact-form.js`)
  - `pages/` (`index.js`, API examples)
- License:
  - MIT (`LICENSE`)
- Reuse plan:
  - Safe to reuse form submission patterns for contact/order flows with attribution
  - Use mostly for API/form wiring patterns, not full page styling

## 5) nextjs-dashboard
- Repo: https://github.com/IgorAugust0/nextjs-dashboard
- Framework:
  - Next.js `15.0.0-rc.0`
  - App Router (`app/`)
- Key UI/component folders:
  - `app/ui/dashboard/`
  - `app/ui/invoices/`
  - `app/ui/customers/`
- License:
  - No `LICENSE` file found (treat as non-permissive / all rights reserved)
- Reuse plan:
  - Borrow dashboard information architecture ideas only
  - Do not copy code directly

## 6) nextjs-travel-planner
- Repo: https://github.com/koolkishan/nextjs-travel-planner
- Framework:
  - Next.js `14.0.3`
  - App Router (`src/app`)
- Key UI/component folders:
  - `src/components/home/` (featured/search/suggestions/benefits)
  - `src/components/navbar/`
  - `src/components/footer/`
- License:
  - No `LICENSE` file found (treat as non-permissive / all rights reserved)
- Reuse plan:
  - Borrow UX composition ideas only (search/filter flows, section layout)
  - Do not copy code directly

## License Guardrail
- MIT repos (`shadcn-dashboard-landing-template`, `formspree-example-next`) can be used for direct code reuse with license notice retention.
- Repos without explicit permissive licenses are restricted to idea-level inspiration only.
