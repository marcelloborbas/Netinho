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
- Orders are created only via the `create_order(payload)` SQL function — prices are recomputed server-side from `products`, so clients can't tamper with them.
- Order items snapshot code/price/application and orders snapshot the customer — history must not change when the catalog changes.
- The in-progress order draft lives in localStorage (`src/lib/order-store.ts`) — survives connection loss and reloads.
- Authenticated pages live under `src/routes/_authenticated/`; reads use the browser client with RLS (seller sees own rows, admin sees all via `has_role`).
