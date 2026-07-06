# SkillLeague

منصة اجتماعية تنافسية متكاملة تجمع الألعاب التعليمية والبطولات والاقتصاد الرقمي في مكان واحد.

## Run & Operate

- **Start workflow**: `Start application` — يشغّل الخادم الخلفي (port 8080) والواجهة الأمامية (port 5000) معاً
- `pnpm --filter @workspace/api-server run dev` — تشغيل الخادم الخلفي فقط
- `pnpm run typecheck` — فحص الأنواع عبر جميع الحزم
- `pnpm run build` — فحص الأنواع + بناء جميع الحزم
- `pnpm --filter @workspace/api-spec run codegen` — إعادة توليد API hooks و Zod schemas
- `pnpm --filter @workspace/db run push` — تطبيق تغييرات مخطط قاعدة البيانات (dev فقط)
- `DATABASE_URL` — مُدار تلقائياً بواسطة Replit (لا حاجة لإعداده يدوياً)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- الرد على المستخدم باللغة العربية دائماً في جميع الجلسات.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
