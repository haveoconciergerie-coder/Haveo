# Performance reference

## Measure the actual failure

“Laggy” can mean different things:

- dropped visual frames,
- delayed input response,
- layout jumps,
- sticky detachment,
- state boundaries firing late,
- animation lag intentionally introduced by scrub smoothing,
- media decode stalls,
- or a browser/driver/device issue.

Reproduce before changing architecture.

## Common causes

### Main-thread scroll work

Look for:

- scroll listeners doing parsing, filtering, DOM queries, or state updates,
- multiple independent listeners,
- synchronous storage access,
- large framework rerenders,
- logging inside hot paths,
- and third-party scripts.

### Layout thrashing

A dangerous repeated sequence is:

1. write style or class,
2. read layout,
3. write again,
4. repeat during scrolling.

Relevant reads include bounding rectangles, offsets, computed style, and dimensions when layout is dirty.

Batch reads, then writes. Prefer observers and precomputed stable geometry.

### Painting and compositing

Potentially expensive:

- large blur and backdrop-filter regions,
- huge soft shadows,
- fixed backgrounds,
- blend modes,
- masks and complex clipping,
- oversized translucent layers,
- many promoted layers,
- and high-resolution media inside sticky regions.

Transforms and opacity are safer defaults but are not a universal guarantee. Layer size and count still matter.

### Framework rerenders

A component should not rerender at wheel-event or animation-frame frequency merely to carry scroll progress.

Use framework state for discrete semantic changes. Keep continuous values in animation primitives, refs, stores with narrow subscribers, or CSS custom properties.

### Hidden work

Inactive panels may still run:

- autoplay video,
- canvas loops,
- requestAnimationFrame callbacks,
- WebGL scenes,
- Lottie,
- observers,
- timers,
- or expensive effects.

Pause or dispose inactive work.

## Verification evidence

Capture a trace around the section and inspect:

- long tasks,
- scripting time,
- rendering and painting,
- layout events,
- layer behavior,
- event handlers,
- and screenshots across state boundaries.

For framework projects, measure render counts.

Report device, browser, viewport, input method, and throttling. A smooth desktop workstation run does not prove a good mobile experience.

## Honest output

Allowed:

- “No long task appeared during the captured interaction.”
- “The component rendered only when activeIndex changed.”
- “The source scan found a global scroll listener.”
- “Runtime performance was not measured because browser tooling was unavailable.”

Not allowed:

- “Runs at 60 FPS” without measurement.
- “GPU accelerated, therefore no jank.”
- “Lighthouse 100” without a report.
- “Production ready” based only on code inspection.
