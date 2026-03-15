# React Modular Architecture

Build React and Next.js pages from modular pieces.

- Use this shared top-level convention inside `app/`:
  - `app/components`: shared reusable UI.
  - `app/hooks`: cross-feature React hooks.
  - `app/lib`: shared non-UI logic and integrations.
  - `app/modules`: feature and page implementations mirrored from routes.
  - `app/stores`: cross-feature Zustand stores.
  - `app/types`: cross-feature domain types.
- Start from reusable presentational building blocks.
- Reusable base components must not contain business logic.
- Business logic belongs in page wrappers, feature hooks, stores, `app/lib/*`, or server actions.
- Keep route entry files thin. For Next.js `page.tsx`, put the page implementation in the mirrored path under `app/modules/` and leave `page.tsx` as a small entrypoint.
- Keep every React component file under 300 lines.
- If a non-route component grows beyond 300 lines, convert it into a colocated folder.
- Use `index.tsx` as the composition shell. It should stay UI-focused and wire hooks, stores, and presentational sections together.
- Put feature-specific logic in colocated `hooks/` and `stores/`.
- Put visual sections in `ui/`. `ui/*` subcomponents must stay presentational and receive data and callbacks through props.
- Keep shared primitives in `app/components`. Keep component-specific pieces colocated with the feature that owns them.
- Consolidate shared helpers and integrations inside `app/lib` subfolders such as `ai/`, `audio/`, `config/`, `content/`, and `media/`.
- Do not introduce new top-level buckets like `app/shared`, `app/services`, `app/utils`, or `app/config` when `app/components` or `app/lib/*` already cover the responsibility.
- Keep `app/hooks`, `app/stores`, and `app/types` reserved for artifacts reused across multiple features. Otherwise, colocate them inside the owning module.
- For route modules, mirror the route hierarchy under `app/modules/`.

Required structure for oversized components:

```text
ComponentName/
  index.tsx
  hooks/
    useComponentName.ts
    useComponentNameEffects.ts
  stores/
    useComponentNameStore.ts
  ui/
    SectionA.tsx
    SectionB.tsx
  types.ts
```

Required structure for oversized Next.js routes:

```text
app/
  route-1/
    page.tsx
  route-2/
    route-2-[id]/
      page.tsx
  modules/
    route-1/
      index.tsx
      hooks/
      stores/
      ui/
      types.ts
    route-2/
      route-2-[id]/
        index.tsx
        hooks/
        stores/
        ui/
        types.ts
```

Do not split files by arbitrary line chunks. Split by responsibility: entrypoint, logic, effects, state, and presentational UI.
