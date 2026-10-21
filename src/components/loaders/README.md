The barrel exports native TypeScript DOM factories for Atom, Clock, HexTrace,
Leap, Ripple, and Trace. They have no framework dependency; the original `.btsx` components
remain available through direct imports.

```ts
import { Atom, Ripple } from './src/components/loaders'

const atom = Atom({ size: 32, color: 'rebeccapurple', easing: 'ease-in-out' })
document.body.append(atom)
atom.style.setProperty('--ld-play-state', 'paused')
atom.remove()

// Pass the shadow root so its styles are installed inside the same boundary.
const shadow = document.querySelector('#host')!.attachShadow({ mode: 'open' })
shadow.append(Ripple({ direction: 'in', duration: 900 }, shadow))
```

Each factory returns a detached `HTMLDivElement` (Atom, Leap, Ripple) or
`SVGSVGElement` (Clock, HexTrace, Trace), and installs one shared stylesheet per loader in
the target document's head or shadow root. The target defaults to `document`;
pass another document for iframes. Recreating or removing loaders does not remove
the shared stylesheet. Importing the module does not access the DOM; calling a
factory requires a document.

All loaders accept `className`, `color`, `duration` (milliseconds), `playState`
(`running` or `paused`), and `size` (pixels, default 20). Atom, Clock, HexTrace,
and Trace also accept `easing` (`linear`, `ease-in-out`, or `stacked`). HexTrace and Trace accept `cap`
(`round` or `flat`), and Ripple accepts `direction` (`out` or `in`). They inherit
text color by default and honor `prefers-reduced-motion`.

HexTrace follows a hexagonal outline; Trace follows a rounded square. Both draw
a faint track with a brighter dash traveling around its perimeter.

Loaders are decorative (`aria-hidden="true"`). Provide loading status text on
the containing UI, such as a `role="status"` region.
