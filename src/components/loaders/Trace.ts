import { type CapProps, linecap } from '../../lib/loaders/cap'
import { type EasingProps, rotationCss, spinClass } from '../../lib/loaders/easing'
import { SIZE, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, svgElement, type LoaderTarget } from './Frame'

export interface TraceProps extends SpinnerProps, EasingProps, CapProps {}

const VIEW = 20
const SIDE = 17.5
const RADIUS = 4
const PERIMETER = 4 * (SIDE - 2 * RADIUS) + 2 * Math.PI * RADIUS
const DASH = 16
const RECT = {
  height: SIDE, rx: RADIUS, width: SIDE,
  x: (VIEW - SIDE) / 2, y: (VIEW - SIDE) / 2
}
const css = `
.ld-trace {
  width: ${SIZE};
  height: ${SIZE};
}

${rotationCss('trace', `to {
  stroke-dashoffset: ${-PERIMETER};
}`)}
`

export default function Trace({ cap, easing, ...props }: TraceProps = {}, target: LoaderTarget = document): SVGSVGElement {
  const doc = Frame('trace', css, target)
  const root = spinnerRoot(svgElement(doc, 'svg', {
    fill: 'none', role: 'presentation', stroke: 'currentColor',
    'stroke-width': 2.5, viewBox: `0 0 ${VIEW} ${VIEW}`
  }), 'trace', props)
  root.append(
    svgElement(doc, 'rect', { ...RECT, opacity: 0.2 }),
    svgElement(doc, 'rect', {
      ...RECT, class: spinClass('trace', easing),
      'stroke-dasharray': `${DASH} ${PERIMETER - DASH}`, 'stroke-linecap': linecap(cap)
    })
  )
  return root
}
