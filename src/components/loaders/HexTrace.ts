import { type CapProps, linecap } from '../../lib/loaders/cap'
import { type EasingProps, rotationCss, spinClass } from '../../lib/loaders/easing'
import { SIZE, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, svgElement, type LoaderTarget } from './Frame'

export interface HexTraceProps extends SpinnerProps, EasingProps, CapProps {}

const VIEW = 20
const RADIUS = 8.5
const POINTS = Array.from({ length: 6 }, (_, index) => {
  const angle = index * Math.PI / 3 - Math.PI / 2
  return `${VIEW / 2 + RADIUS * Math.cos(angle)},${VIEW / 2 + RADIUS * Math.sin(angle)}`
}).join(' ')
const css = `
.ld-hex-trace {
  width: ${SIZE};
  height: ${SIZE};
}

${rotationCss('hex-trace', `to {
  stroke-dashoffset: -100;
}`)}
`

export default function HexTrace(
  { cap, easing, ...props }: HexTraceProps = {},
  target: LoaderTarget = document
): SVGSVGElement {
  const doc = Frame('hex-trace', css, target)
  const root = spinnerRoot(svgElement(doc, 'svg', {
    fill: 'none', role: 'presentation', stroke: 'currentColor',
    'stroke-width': 2.5, 'stroke-linejoin': 'round', viewBox: `0 0 ${VIEW} ${VIEW}`
  }), 'hex-trace', props)
  // Normalize the perimeter so the dash travels exactly one full lap per cycle.
  const polygon = { points: POINTS, pathLength: 100 }
  root.append(
    svgElement(doc, 'polygon', { ...polygon, opacity: 0.2 }),
    svgElement(doc, 'polygon', {
      ...polygon, class: spinClass('hex-trace', easing),
      'stroke-dasharray': '25 75', 'stroke-linecap': linecap(cap)
    })
  )
  return root
}
