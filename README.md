# Datalab Research Consulting website

Responsive multi-page site built with React, TypeScript, Vite, React Router and Lucide icons. The brand uses the supplied Datalab logo, navy and teal colours, and reduced-motion-aware transitions.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

## Supabase setup

1. Create a Supabase project.
2. Apply [`supabase/schema.sql`](supabase/schema.sql) using the SQL editor or your migration workflow.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. The anon/publishable key is intended for browser use; never put a service-role key in a `VITE_` variable.
4. Restart Vite. The project enquiry form will insert into `enquiries`. Public insert is restricted by RLS and column grants; public reads and updates are not granted.

Without valid Supabase settings, the form prepares an email and labels itself as demo mode; it does not claim an enquiry was saved. Project access-link requests use a generic RPC response to avoid confirming whether a project reference matches. To actually deliver access links, configure a trusted Supabase Edge Function or database trigger to process `project_access_requests`, issue high-entropy one-time links, and send them through a verified email provider. Do not expose project tokens or private records to browser queries.

This setup does not implement a staff dashboard, project workspace, authentication, payment verification, private file storage, or final-file release. Those require server-side authorisation and trusted payment and email callbacks. The supplied project table is a private schema baseline only.

## Contact and branding

The public email is `datalabresearchconsulting@gmail.com`. The supplied logo is `public/logo.png`; `public/favicon.png` is its favicon-sized version. Phone and WhatsApp use the number already present in the original website. Confirm the service area and location details before launch.

## Content and launch review

The site includes service pages, audience pages, illustrative case studies, role-based team placeholders, indicative pricing, blog content, FAQ, contact, and draft privacy, terms and confidentiality pages. Review all marked illustrative or placeholder material and have legal text reviewed against actual operations and applicable Kenyan data-protection requirements before launch. Do not treat the site's legal text as a compliance certification.

Vercel configuration is included for SPA routing. Add production Supabase environment variables in the hosting dashboard; do not commit real secrets.

## Source map

The source is split by responsibility to make edits easier to trace:

- `src/pages/` contains one file per route: `Home.tsx`, `Services.tsx`, `ServiceDetail.tsx`, `WhoWeServe.tsx`, `CaseStudies.tsx`, `About.tsx`, `Team.tsx`, `Pricing.tsx`, `Blog.tsx`, `BlogPost.tsx`, `FAQ.tsx`, `Contact.tsx`, `TrackProject.tsx`, and `Legal.tsx`.
- `src/content/siteContent.ts` holds service descriptions, FAQs, indicative pricing, blog examples, and shared contact details.
- `src/components/BrandLayout.tsx` holds the shared header, footer, logo, page headings, and service cards.
- `src/App.tsx` is the route map. Add or adjust a page path here.
- `src/pages/Admin.tsx` is the staff portal at `/admin`.
- `src/lib/supabase.ts` contains database and auth helpers; `supabase/schema.sql` defines access policies and tables.

## Admin portal

Visit `/admin`. Apply `supabase/schema.sql`, enable Supabase email/password auth, create staff users in Supabase, and assign editor roles only to trusted people. For example, an operator with SQL access can set a role using `insert into public.staff_roles (user_id, role) values ('AUTH-USER-UUID', 'admin');` after replacing the UUID. Never place the service-role key in the website.

The editor currently exposes selected home, contact, and about fields. Database access is protected by the `staff_roles` policy. Remaining pages are split into separate files and can be edited directly in `src/pages/` until corresponding admin fields are added. A successful admin save currently persists structured content rows; wiring these rows into every public page is the next implementation step.

## Admin portal

Open `/admin`. Configure Supabase credentials in `.env.local`, apply the schema in `supabase/schema.sql`, enable email/password authentication and assign an authenticated user an `admin` or `editor` role in `staff_roles`. Never add a service role key to browser environment variables. The portal edits the homepage hero, contact introduction and about page heading/introduction. Saved values are read by those public pages. Other page copy can be adjusted in its named page module.
