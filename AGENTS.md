<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Maintain the existing send-order-email Edge Function: read saved snapshots under caller RLS, generate both attachments, and confirm only a Resend email ID tied to the saved order; stable provider idempotency and a synchronous submit lock prevent repeated sends/creation on double clicks without changing prices.
- Maintain the existing delete-person Edge Function for permanent Auth deletion; its Auth lifecycle cleanup trigger removes target-only profiles/roles/linked commercial records atomically, preserves shared customers and order history, and rejects blocking supervisor references without editing other users.
- Delete-person returns structured success with the exact deleted user ID; PESSOAL removes cached rows only on that confirmation and revalidates the lists.
- Orders are created only via the `create_order(payload)` SQL function — prices are recomputed server-side from `products`, so clients can't tamper with them.
- Order items snapshot code/price/application and orders snapshot the customer — history must not change when the catalog changes.
- The in-progress order draft lives in localStorage (`src/lib/order-store.ts`) — survives connection loss and reloads.
- Authenticated pages live under `src/routes/_authenticated/`; reads use the browser client with RLS (seller sees own rows, admin sees all via `has_role`).
- Home-screen installation UI is isolated in InstallAppButton using the browser's one-use install event and a manual-instructions fallback; no worker is needed for this control.
- Keep page-specific share metadata on leaf routes; pageHead supplies consistent metadata without private data, and the homepage head and homepage-only server fallback share one asset definition to prevent divergent images.
- Sitemap is router-derived (`src/lib/sitemap.ts` + `src/routes/sitemap[.]xml.ts`); every route declares `staticData.sitemap`, the logged-in area uses "exclude-subtree", and `/` stays out because it redirects visitors to login.
- Home (`/`) uses the `netinho-home` root (never the legacy `home-page`/`home-visual-2026` classes, whose global overrides caused overlaps) as a single-screen 100dvh grid with min-content rows for header/KPIs (overflow-hidden items otherwise collapse their auto track): mobile is one column; desktop (lg) is 12 columns with greeting header, KPI strip, a full-bleed carousel, then the sales/orders panel beside the brands card; flexible rows are capped low (banner and activity row) and the stack is vertically centered on tall monitors so cards never grow giant; the sales panel uses tabs on mobile and both panes side by side on desktop (forceMount); only lists scroll internally; short viewports fall back to normal scrolling; icons go through `HomeIconTile` and the WhatsApp mark through the shared `WhatsAppIcon`.
- PESSOAL (`PeopleSection`, inside the admin panel) is one section: a compact searchable list where selecting a row mounts its editor inline below it, organized in collapsible `PersonEditorSections` blocks (Dados e contato, Acesso, Comissão, Carteira, Região) kept mounted so unsaved edits survive collapsing, with a sticky Cancelar/Salvar bar; the editor unmounts on cancel so unsaved edits are discarded; linked commercial records go through `useRepresentativeRecord` so one state feeds both personal and region blocks, and client-portfolio moves update `customers.seller_id` guarded by the current owner, leaving authorization to RLS.
- Administration is one page at `/admin?secao=<id>` (`AdminPanel` + `src/lib/admin-sections.ts`), loading each section lazily; old admin URLs are redirect-only routes via `redirectToAdmin` (keeping the anchor) and admins on `/clientes` go to the Clientes section, so each admin screen has a single home; admin controls that live inside sales screens (catalog campaigns, order status/cancel) stay there and are linked from the overview.
- Category-card size on `/catalogo` is defined once, in the final block of `src/styles.css` (`.catalog-showcase .catalog-category-filters .catalog-category-item`): desktop 180×168, mobile (<640px) 122×116, art always `object-fit: contain` so nothing is cropped; size tweaks edit that block instead of appending another one, because duplicated older blocks silently overrode each other and Tailwind `!important` utilities written in the JSX outrank unlayered CSS rules.
