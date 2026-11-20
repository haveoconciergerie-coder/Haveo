# Architecture matrix

Load this reference when choosing among native CSS, IntersectionObserver, Motion, GSAP, or a custom controller.

## Decision matrix

| Need | Preferred primitive | Why |
|---|---|---|
| Know which section is active | IntersectionObserver | Discrete, asynchronous visibility signal |
| Keep a visual in place | CSS `position: sticky` | Native layout behavior |
| Click a step and navigate to it | `scrollIntoView()` | Element-based and resilient to document changes |
| Simple enter/reveal | CSS transition + observer | Minimal runtime complexity |
| Continuous CSS property mapping | CSS scroll/view timeline | Declarative and compositor-friendly when supported |
| Existing React Motion codebase | Motion values | Integrates with existing animation state without React rerenders |
| Complex timeline or pin/scrub choreography | GSAP ScrollTrigger | Mature timeline and lifecycle controls |
| One simple progress value with no library | One rAF-coalesced controller | Acceptable when CSS timelines are unavailable |
| Scroll snapping between peer panels | CSS scroll snap | Native, but use only when snapping helps rather than fights intent |

## Rules for choosing

### Choose IntersectionObserver when

- the UI has named states,
- exact per-pixel progress is irrelevant,
- a center line or activation band determines the active item,
- or the code currently divides a section into equal percentage ranges.

### Choose CSS scroll-driven animation when

- the effect maps progress to animatable CSS properties,
- the browser support requirement is satisfied,
- failure can gracefully become a static or triggered experience,
- and JavaScript is not needed for business state.

### Choose Motion when

- Motion is already installed,
- the project is React, Vue, or vanilla code supported by Motion,
- the interaction needs springs, gestures, layout transitions, or scroll values,
- and continuous MotionValues can avoid component rerenders.

Do not add Motion solely for a panel opacity transition.

### Choose GSAP ScrollTrigger when

- several animation tracks must stay synchronized,
- scrub, reverse, pin, refresh, or timeline control is central,
- SVG/canvas/WebGL choreography is involved,
- or the interaction cannot be expressed cleanly with platform primitives.

Do not add GSAP for active-section highlighting.

### Choose no scroll animation when

- motion obscures content,
- the viewport is too short,
- reduced motion is enabled,
- performance cannot be made acceptable,
- or the product benefit is weaker than the interaction cost.

## Anti-pattern translations

| Anti-pattern | Replace with |
|---|---|
| `height: 400vh` for four steps | Four real step elements |
| Four hardcoded 25% ranges | Observer-based step identity |
| `window.scrollTo(sectionTop + percentage)` | `target.scrollIntoView()` |
| JS `position: fixed` pinning | CSS sticky |
| React `setProgress()` on scroll | MotionValue, CSS timeline, or direct custom property |
| Library chosen before behavior | Classify interaction first |
| Desktop-only sticky disabled at width breakpoint | Width + height + motion-aware fallback |
