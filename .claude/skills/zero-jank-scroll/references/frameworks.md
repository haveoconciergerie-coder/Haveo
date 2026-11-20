# Framework reference

## React and Next.js

- Use state for `activeId`, not continuous progress.
- Store elements and mutable progress in refs.
- Create one observer in an effect and disconnect it.
- Guard against development-mode effect re-execution.
- Use a stable callback or event boundary for active changes.
- Keep server-rendered content meaningful before hydration.
- Prevent image/font loading from changing sticky geometry unexpectedly.
- Do not let GSAP and Motion write the same transform.
- With GSAP, use framework-specific context/cleanup patterns.
- With Motion, derive styles from MotionValues rather than calling `setState` per frame.

## Vue and Nuxt

- Create observers in mounted lifecycle and disconnect on unmount.
- Avoid writing continuous progress into broad reactive objects.
- Use template refs for targets.
- Keep SSR markup and initial state deterministic.
- Use composables only when they centralize cleanup rather than hiding global listeners.

## Svelte and SvelteKit

- Prefer actions for element-bound observer/listener behavior.
- Return cleanup functions.
- Avoid broad store updates per frame.
- Guard browser-only APIs during SSR.
- Keep progressive enhancement: content remains in the server HTML.

## Astro

- Use the least hydration required.
- A semantic HTML/CSS sticky story may need only a small client island.
- Do not hydrate an entire page for one observer.
- Defer heavy animation libraries until the interactive section is near the viewport.

## Vanilla JavaScript

- One module owns activation and cleanup.
- Cache element references.
- Use `AbortController` for groups of event listeners when useful.
- Add no dependency when platform primitives solve the problem.

## Webflow and visual builders

- Inspect generated transforms and overflow ancestors.
- Avoid stacking multiple smooth-scroll systems.
- Verify that editor-generated wrappers do not break sticky positioning.
- Keep custom code lifecycle-safe across page transitions.
