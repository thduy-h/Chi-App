# PROJECT_CONTEXT

Cập nhật gần nhất: 2026-03-01
Branch: `lovehub-mvp`
Commit tham chiếu: `8a2876d`

## 1) Tổng quan dự án
- Đây là app Next.js App Router phát triển từ template e-commerce, hiện mở rộng thành LoveHub (quản lý cuộc sống cho couple).
- Vẫn giữ các trang legacy e-commerce (`/products`, `/cart`, ...), song các trang LoveHub chính là:
  - `/` (landing)
  - `/auth` (đăng nhập Supabase magic link/OTP)
  - `/setup` (tạo/join/quản lý couple)
  - `/food` (menu món ăn local + order webhook)
  - `/tasks` (kanban hybrid local/Supabase)
  - `/finance` (sổ thu chi hybrid local/Supabase)
  - `/cycle` (theo dõi chu kỳ local/Supabase)
  - `/letters` (thư + góp ý, lưu Supabase nếu có couple)

## 2) Stack kỹ thuật
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Redux Toolkit (alert, cart, categories, products, auth cũ)
- Supabase JS + `@supabase/ssr`
- DnD: `@hello-pangea/dnd`
- Date utils: `date-fns`

## 3) Cấu trúc thư mục quan trọng
- `app/`: route pages và API routes
- `lib/components/pages/*`: UI theo từng trang
- `lib/components/shared/*`: layout/header/footer/alert...
- `lib/supabase/*`: client/server helpers + couples utils + types DB
- `lib/hooks/use-couple-context.ts`: hook dùng chung cho user/couple state ở client
- `lib/data/foods.ts`: dataset món ăn local
- `middleware.ts`: refresh session Supabase qua cookies

## 4) Route map

### App pages chính
- `/` -> `app/page.tsx` -> `lib/components/pages/home/lovehub-landing.tsx`
- `/auth` -> `app/auth/page.tsx` -> `AuthForm`
- `/auth/callback` -> `app/auth/callback/route.ts`
- `/setup` -> `app/setup/page.tsx` + `lib/components/pages/setup/setup-client.tsx`
- `/food` -> `app/food/page.tsx` + `lib/components/pages/food/food-page.tsx`
- `/tasks` -> `app/tasks/page.tsx` + `lib/components/pages/tasks/*`
- `/finance` -> `app/finance/page.tsx` + `lib/components/pages/finance/finance-dashboard.tsx`
- `/cycle` -> `app/cycle/page.tsx` + `lib/components/pages/cycle/cycle-tracker.tsx`
- `/letters` -> `app/letters/page.tsx` + `lib/components/pages/letters/letters-page.tsx`

### API routes
- `/api/order` -> forward order sang `FORMSPREE_ORDER_URL` hoặc `ORDER_WEBHOOK_URL`
- `/api/letters`
  - `GET`: lấy inbox 50 thư gần nhất của couple
  - `POST`: nếu có user + couple thì insert Supabase; nếu không thì fallback webhook
- `/api/couple/current`: trả user + couple hiện tại (server-side)
- `/api/couple/create`, `/api/couple/join`: API cũ (nhiều flow mới đang gọi RPC trực tiếp ở client)

## 5) Luồng Auth + Couple

### Supabase client helpers
- Browser client singleton: `lib/supabase/client.ts` (`createSupabaseBrowserClient`)
- Server client (cookies): `lib/supabase/server.ts` (`createClient`)
- Alias browser helper: `lib/supabase/browser.ts`

### Đăng nhập
- `/auth`: gọi `supabase.auth.signInWithOtp`.
- Callback `/auth/callback`: exchange code/verify OTP, rồi redirect `/setup`.

### Source of truth couple state
- Chuẩn hiện tại: dùng RPC `get_my_couple()` và normalize row (array/object).
- Setup page (`setup-client.tsx`) quản lý state machine:
  - `loading`
  - `none`
  - `active` (`coupleId`, `code`, `isOwner`)

### Các thao tác couple trên `/setup`
- Tạo: RPC `create_couple(p_code)`
- Join: RPC `join_by_code(p_code)`
- Leave: RPC `leave_couple(p_couple_id)`
- Delete (owner): RPC `delete_my_couple(p_couple_id)`
- Rotate code (owner): RPC `rotate_couple_code(p_couple_id)`
- Reset: leave/delete rồi tạo mới

### Đồng bộ trạng thái navbar ngay lập tức
- Hook `useCoupleContext()` lắng nghe auth state + event custom.
- Event global: `lovehub:couple-changed`
- `/setup` emit event sau create/join/leave/delete/reset/rotate.
- Navbar widget: `lib/components/shared/layout/header/couple-auth-widget.tsx`

## 6) Quy tắc privacy/RLS cho couples (rất quan trọng)
- Không query `couples` kiểu global.
- Chỉ select `couples` theo `id` khi đã có membership.
- Join bằng code phải dùng RPC `join_by_code`, không select couples theo code từ client.
- Trong code helper `lib/supabase/couples.ts` có guard `assertCoupleIdForSelect` để chặn select thiếu `couple_id` (dev).

## 7) Bản đồ storage theo feature

### `/food`
- Data món ăn local: `lib/data/foods.ts`
- Không dùng Supabase cho menu.
- Submit order qua `/api/order` -> webhook/formspree.

### `/tasks` (hybrid)
- Nếu không có user/couple: localStorage (`lovehub.tasks.shared.v1`, `lovehub.tasks.travel.v1`)
- Nếu có couple: Supabase table `tasks`
- Có banner import offline 1 lần/couple:
  - flag: `lovehub_tasks_imported_<coupleId>`

### `/finance` (hybrid)
- Không couple: localStorage `lovehub.finance.entries.v1`
- Có couple: Supabase table `finance_entries`
- Import offline 1 lần/couple:
  - flag: `lovehub_finance_imported_<coupleId>`

### `/cycle`
- Fallback local:
  - settings: `lovehub.cycle.settings.v1`
  - history: `lovehub.cycle.history.v1`
- Online: Supabase table `cycle_settings` (upsert theo `couple_id,user_id`)

### `/letters`
- Gửi thư:
  - Có user + couple: insert Supabase table `letters`
  - Không có: fallback webhook (`FORMSPREE_LETTERS_URL`/`LETTERS_WEBHOOK_URL`)
- Inbox lấy qua `GET /api/letters`.

## 8) LocalStorage keys đang dùng
- `lovehub.active_couple_id`
- `lovehub.active_couple_code`
- `lovehub.tasks.shared.v1`
- `lovehub.tasks.travel.v1`
- `lovehub.tasks.travel.itinerary.v1`
- `lovehub_tasks_imported_<coupleId>`
- `lovehub.finance.entries.v1`
- `lovehub_finance_imported_<coupleId>`
- `lovehub.cycle.settings.v1`
- `lovehub.cycle.history.v1`

## 9) Schema Supabase (từ `lib/supabase/types.ts`)

Lưu ý: `Relationships` trong file types hiện để trống, nên FK/constraint chi tiết cần kiểm tra trực tiếp DB nếu cần chắc chắn tuyệt đối.

### Tables

#### `couples`
- `id: string`
- `code: string`
- `created_at: string | null`
- `created_by: string | null`

#### `couple_members`
- `id: string`
- `couple_id: string`
- `user_id: string`
- `created_at: string | null`

#### `tasks`
- `id: string`
- `couple_id: string`
- `title: string`
- `description: string | null`
- `status: string`
- `priority: string | null`
- `due_date: string | null`
- `sort_order: number`
- `board: string` (`tasks` hoặc `travel` theo logic app)
- `created_at: string | null`
- `updated_at: string | null`

#### `finance_entries`
- `id: string`
- `couple_id: string`
- `type: 'income' | 'expense'`
- `amount: number`
- `category: string`
- `entry_date: string` (YYYY-MM-DD)
- `note: string | null`
- `created_at: string | null`

#### `cycle_settings`
- `id: string`
- `couple_id: string`
- `user_id: string`
- `last_period_start: string`
- `cycle_length: number`
- `period_length: number`
- `created_at: string | null`
- `updated_at: string | null`

#### `letters`
- `id: string`
- `couple_id: string`
- `kind: 'feedback' | 'love'`
- `title: string`
- `message: string`
- `mood: string | null`
- `anonymous: boolean`
- `created_at: string | null`
- `updated_at: string | null`

### RPC / Functions
- `create_couple(p_code: string) -> { id, code } | null`
- `join_by_code(p_code: string) -> string | null`
- `get_my_couple() -> { id, code, created_by } | null`
- `get_my_membership() -> string | { couple_id?: string; id?: string } | null`
- `leave_couple(p_couple_id: string) -> Json`
- `delete_my_couple(p_couple_id: string) -> Json`
- `rotate_couple_code(p_couple_id: string) -> string | { code?: string; new_code?: string } | null`
- `whoami() -> Json` (debug)

### Kỳ vọng quan trọng với DB function
- `create_couple` phải không chỉ tạo row `couples`, mà còn insert membership cho `auth.uid()` vào `couple_members`.
- Nếu không insert membership, UI sẽ tạo code xong nhưng vẫn hiện chưa có couple.

## 10) Environment variables
Từ `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL=`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `NEXT_PUBLIC_API_URL=https://fakestoreapi.com`
- `FORMSPREE_ORDER_URL=`
- `ORDER_WEBHOOK_URL=`
- `FORMSPREE_LETTERS_URL=`
- `LETTERS_WEBHOOK_URL=`

## 11) Chạy local nhanh
- Cài deps: `npm install`
- Tạo env local: copy `.env.example` -> `.env.local`
- Dev: `npm run dev`
- Build check: `npm run build`

## 12) Prompt handoff mẫu cho chat khác
Dán nguyên khối dưới vào chat mới:

```text
Đọc PROJECT_CONTEXT.md trước rồi mới sửa code.
Giữ nguyên kiến trúc Supabase hiện tại.
Ràng buộc bắt buộc:
1) Không query couples global; chỉ query couples theo id khi đã có membership.
2) Join couple phải qua RPC join_by_code.
3) get_my_couple là source of truth cho couple state ở client.
4) Không để lộ secret lên client.
5) Sau thay đổi phải chạy npm run build.

Nhiệm vụ cần làm: <mô tả task của bạn>
```
