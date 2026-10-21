import { type EasingProps, rotationCss, spinClass } from '../../lib/loaders/easing'
import { SIZE, stagger, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, step, type LoaderTarget } from './Frame'

export interface AtomProps extends SpinnerProps, EasingProps {}

const ORBITS = 3
const TILT = 180 / ORBITS
const css = `
.ld-atom {
  position: relative;
  width: ${SIZE};
  height: ${SIZE};
}

.ld-atom-shell {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: calc(${SIZE} * 0.055) solid currentColor;
  border-radius: 9999px;
}

.ld-atom-orbit {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotate(var(--ld-atom-tilt)) rotateX(90deg);
}

.ld-atom-ring {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: calc(${SIZE} * 0.045) solid currentColor;
  border-radius: 9999px;
  transform: rotateX(90deg);
}

${rotationCss('atom')}

.ld-atom-spin {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation-delay: ${stagger('atom', ORBITS)};
}

@media (prefers-reduced-motion: reduce) {
  .ld-atom-spin {
    transform: rotate(${TILT}deg);
  }
}
`

export default function Atom({ easing, ...props }: AtomProps = {}, target: LoaderTarget = document): HTMLDivElement {
  const doc = Frame('atom', css, target)
  const root = spinnerRoot(doc.createElement('div'), 'atom', props)
  const shell = doc.createElement('div')
  shell.className = 'ld-atom-shell'
  root.append(shell)
  for (let index = 0; index < ORBITS; index++) {
    const orbit = doc.createElement('div')
    orbit.className = 'ld-atom-orbit'
    orbit.style.setProperty('--ld-atom-tilt', `${index * TILT}deg`)
    const spin = doc.createElement('div')
    spin.className = spinClass('atom', easing)
    step(spin, index)
    const ring = doc.createElement('div')
    ring.className = 'ld-atom-ring'
    spin.append(ring)
    orbit.append(spin)
    root.append(orbit)
  }
  return root
}
