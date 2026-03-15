---
name: refactor-react-component
description: Refactor an existing React component without changing behavior by extracting logic into hooks, moving effects into a dedicated effects hook, moving state into a store, and splitting oversized UI into subcomponents. Use when a component mixes UI and logic or exceeds 300 lines.
---

# Refactor React Component

Refactor large React components without changing observable behavior.

Use this skill when a component mixes UI and business logic, carries too much local state, contains many effects, or exceeds 300 lines.

## Goal

Separate responsibilities while keeping behavior, exports, styling, persistence keys, and side effects intact.

## Default stack

- Use Zustand for stores in this repository.
- Preserve the current public import surface. If a file becomes a folder, keep `index.tsx` as the stable entrypoint.
- For Next.js route files such as `page.tsx`, keep the route file as a thin entrypoint and move the implementation into the mirrored tree under `app/modules/`.

## Target structure

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

For Next.js route files:

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
        useRoute1.ts
        useRoute1Effects.ts
      stores/
        useRoute1Store.ts
      ui/
        SectionA.tsx
        SectionB.tsx
      types.ts
    route-2/
      route-2-[id]/
        index.tsx
        hooks/
          useRoute2Id.ts
          useRoute2IdEffects.ts
        stores/
          useRoute2IdStore.ts
        ui/
          SectionA.tsx
          SectionB.tsx
        types.ts
```

## Shared app structure

When the refactor touches shared code under `app/`, use this global directory convention:

```text
app/
  api/                  # Next.js route handlers
  components/           # Shared UI pieces reused across features
  hooks/                # Global React hooks reused across features
  lib/                  # Shared non-UI logic
    ai/                 # AI/Ollama prompting, analyzers, planners
    audio/              # Audio/TTS integrations and orchestration
    config/             # Shared static config and option catalogs
    content/            # Chapter/text parsing and normalization helpers
    media/              # Image/video generation and export helpers
  modules/              # Feature/page implementations mirrored from routes
  stores/               # Global Zustand stores reused across features
  types/                # Global domain types shared across features
```

Rules for shared folders:

- Prefer `app/lib/*` for shared logic instead of creating new top-level folders such as `app/services`, `app/utils`, `app/config`, or `app/shared`.
- Put shared React UI in `app/components/*`, not in `app/shared`.
- Keep feature-local hooks, stores, types, and UI inside the owning module folder under `app/modules/...`.
- Keep `app/hooks`, `app/stores`, and `app/types` only for cross-feature artifacts. If something belongs to one route or feature, colocate it.

## Workflow

1. Audit the current component before changing structure. Capture props, exports, local state, effects, derived values, async flows, persistence, render branches, and any identity key that resets local state today.
2. Preserve the public import surface. If needed, turn the original file into a folder and keep `index.tsx` as the stable entrypoint.
   For Next.js routes, keep `page.tsx` in place and move the page implementation into the mirrored directory under `app/modules/.../index.tsx`.
3. Create `hooks/use<ComponentName>.ts` and move all non-effect logic there: derived data, event handlers, async actions, selectors, and view-model shaping.
4. Create `hooks/use<ComponentName>Effects.ts` and move all `useEffect` calls there. Preserve effect order, dependency arrays, cleanup behavior, and timing.
5. Create `stores/use<ComponentName>Store.ts` and move component state out of the hook into a Zustand store. Expose state, actions, and a `reset` function.
6. Update the main component so it mostly renders JSX and wires props, handlers, and view-model data from the hook and store.
7. Invoke the main logic first and then invoke the effects hook from the main component.
8. If the main component is still over 300 lines, split it into `ui/*` subcomponents by visual section, not by arbitrary line chunks.
9. Keep behavior unchanged unless the user explicitly requests a behavior change.
10. If shared files must move during the refactor, consolidate them into `app/components` or `app/lib/*` following the shared app structure above, and update every consumer import in the same change.

## Hard rules

- `use<ComponentName>.ts` must not contain `useEffect`.
- `use<ComponentName>Effects.ts` should only coordinate `useEffect` usage and return `void`.
- `use<ComponentName>Store.ts` must expose state, actions, and `reset`.
- `ui/*` components must remain presentational and receive data and callbacks through props.
- Do not move business logic into `ui/*`.
- Do not add store persistence unless the original component already persisted that state.
- If refactoring a Next.js `page.tsx`, the route file must remain minimal and delegate rendering to the mirrored module under `app/modules/...`.

## Regression guardrails

- If the component can mount multiple times at once, do not use a singleton global store. Use a store factory plus provider or another instance-safe pattern.
- If the original state was local to the component, reset the store on unmount or when the component identity key changes so the lifecycle matches the original behavior.
- Preserve existing prop names, export names, CSS class names, DOM structure requirements, persistence keys, and side-effect triggers unless the user asks otherwise.
- Preserve async sequencing, cleanup paths, and error handling.

## Completion checklist

- The entry component is mostly UI composition.
- If the target was a Next.js route, `page.tsx` is a thin entrypoint and the implementation lives under the mirrored path in `app/modules/...`.
- Non-effect logic lives in `use<ComponentName>.ts`.
- Effects live in `use<ComponentName>Effects.ts`.
- State lives in `use<ComponentName>Store.ts`.
- Oversized visual sections were split into presentational `ui/*` components if needed.
- The refactor keeps runtime behavior intact.
