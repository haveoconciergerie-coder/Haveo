# Accessibility reference

## Native interaction first

- Use buttons for actions.
- Use links for navigation.
- Preserve scrolling with wheel, touch, keyboard, and assistive technology.
- Never require dragging, hovering, or precise pointer movement to access content.

## Active-step navigation

For chapter or process navigation:

- use an ordered list when sequence matters,
- use `aria-current="step"` on the active control,
- preserve a visible text label,
- and do not move focus when the active step changes due to scrolling.

Use ARIA tabs only when the interface truly behaves as tabs and implements the complete keyboard interaction model.

## Hidden panels

When panels are overlaid:

- inactive panels use `aria-hidden="true"`,
- inactive interactive descendants must not receive focus,
- use `inert` when available in the project,
- and ensure the active panel alone receives pointer events.

Do not use opacity alone to hide interactive content.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- turn smooth programmatic scrolling into instant/auto scrolling,
- eliminate parallax and prolonged scrubbing,
- simplify large spatial movement,
- preserve content and state communication,
- and allow subtle opacity changes only when they do not create discomfort.

## Sticky and zoom

Test at 200% zoom. Sticky stages must not obscure content or create two-dimensional scrolling merely because the viewport becomes effectively shorter or narrower.

If the sticky stage cannot fit, switch to normal flow.

## Focus and scroll

- Keep focus visible.
- Do not focus a panel merely because it became active.
- Do not repeatedly call `scrollIntoView()` in response to observer changes.
- Do not trap Page Up, Page Down, Home, End, Space, or arrow keys unless implementing a documented widget pattern.
