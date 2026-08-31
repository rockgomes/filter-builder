/**
 * The same chevron the selects draw, so every "opens something" control in the app
 * shares one shape. Replaces the ▾ character, which is asymmetric, sits off the
 * text baseline, and renders differently across fonts.
 *
 * Stroked in currentColor, so it inherits whatever state its button is in.
 */
export function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="10"
      height="6"
      viewBox="0 0 10 6"
      style={{
        display: 'block',
        transition: 'transform 120ms ease',
        transform: open ? 'rotate(180deg)' : undefined,
      }}
    >
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
