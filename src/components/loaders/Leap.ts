import { animation, SIZE, STEP_VAR, stagger, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, step, type LoaderTarget } from './Frame'

export interface LeapProps extends SpinnerProps {}

const DOTS = 3
const css = `
.ld-leap {
  --ld-leap-dot: round(calc(${SIZE} * 0.22), 1px);
  --ld-leap-gap: round(down, calc((${SIZE} - var(--ld-leap-dot)) / 2), 1px);
  position: relative;
  width: ${SIZE};
  height: ${SIZE};
}

.ld-leap-wrapper {
  position: absolute;
  top: round(calc((${SIZE} - var(--ld-leap-dot)) / 2), 1px);
  left: calc(${SIZE} - var(--ld-leap-dot) - var(--ld-leap-gap) * 2);
  width: calc(var(--ld-leap-gap) * 2 + var(--ld-leap-dot));
  height: var(--ld-leap-dot);
  ${animation('leap', 'ld-leap-hop', 'ease-in-out')}
  animation-delay: ${stagger('leap', DOTS)};
}

.ld-leap-dot {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--ld-leap-dot);
  background: currentColor;
  border-radius: 50%;
}

@keyframes ld-leap-hop {
  0% { transform: translateX(0) rotate(0); }
  33.33% { transform: translateX(0) rotate(180deg); }
  66.66% { transform: translateX(calc(var(--ld-leap-gap) * -1)) rotate(180deg); }
  100% { transform: translateX(calc(var(--ld-leap-gap) * -2)) rotate(180deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ld-leap-wrapper {
    transform: translateX(calc(var(${STEP_VAR}) * var(--ld-leap-gap)));
    animation: none;
  }
}
`

export default function Leap(props: LeapProps = {}, target: LoaderTarget = document): HTMLDivElement {
  const doc = Frame('leap', css, target)
  const root = spinnerRoot(doc.createElement('div'), 'leap', props)
  for (let index = 0; index < DOTS; index++) {
    const wrapper = doc.createElement('div')
    wrapper.className = 'ld-leap-wrapper'
    step(wrapper, index)
    const dot = doc.createElement('div')
    dot.className = 'ld-leap-dot'
    wrapper.append(dot)
    root.append(wrapper)
  }
  return root
}
