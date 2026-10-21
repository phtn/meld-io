import { animation, SIZE, STEP_VAR, stagger, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, step, type LoaderTarget } from './Frame'

export type RippleDirection = 'in' | 'out'
export const DEFAULT_RIPPLE_DIRECTION: RippleDirection = 'out'

export interface RippleProps extends SpinnerProps {
  direction?: RippleDirection
}

const RINGS = 3
const css = `
.ld-ripple {
  position: relative;
  width: ${SIZE};
  height: ${SIZE};
}

.ld-ripple-ring {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: calc(${SIZE} * 0.08) solid currentColor;
  border-radius: 9999px;
  ${animation('ripple', 'ld-ripple-spread', 'ease-out')}
  animation-delay: ${stagger('ripple', RINGS)};
}

.ld-ripple-ring-in {
  animation-direction: reverse;
}

@keyframes ld-ripple-spread {
  from { opacity: 1; transform: scale(0); }
  to { opacity: 0; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .ld-ripple-ring {
    opacity: 0.4;
    transform: scale(calc((var(${STEP_VAR}) + 1) / ${RINGS}));
    animation: none;
  }
}
`

export default function Ripple(
  { direction = DEFAULT_RIPPLE_DIRECTION, ...props }: RippleProps = {},
  target: LoaderTarget = document
): HTMLDivElement {
  const doc = Frame('ripple', css, target)
  const root = spinnerRoot(doc.createElement('div'), 'ripple', props)
  for (let index = 0; index < RINGS; index++) {
    const ring = doc.createElement('div')
    ring.className = `ld-ripple-ring ld-ripple-ring-${direction}`
    step(ring, index)
    root.append(ring)
  }
  return root
}
