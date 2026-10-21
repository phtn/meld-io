import { type EasingProps, rotationCss, spinClass } from '../../lib/loaders/easing'
import { SIZE, type SpinnerProps } from '../../lib/loaders/motion'
import Frame, { spinnerRoot, svgElement, type LoaderTarget } from './Frame'

export interface ClockProps extends SpinnerProps, EasingProps {}

const css = `
.ld-clock {
  width: ${SIZE};
  height: ${SIZE};
}

${rotationCss('clock')}
`

export default function Clock({ easing, ...props }: ClockProps = {}, target: LoaderTarget = document): SVGSVGElement {
  const doc = Frame('clock', css, target)
  const root = spinnerRoot(svgElement(doc, 'svg', {
    fill: 'none', role: 'presentation', viewBox: '0 0 16 16'
  }), 'clock', props)
  root.append(
    svgElement(doc, 'circle', { cx: 8, cy: 8, fill: 'currentColor', opacity: 0.1, r: 8 }),
    svgElement(doc, 'path', {
      class: spinClass('clock', easing),
      d: 'M11.1937 2.92061C10.5206 2.49739 9.77304 2.21397 8.9954 2.08314C8.45076 1.99151 8 2.44772 8 3V7.20324C8 7.49211 8.12492 7.76686 8.34259 7.95677L11.8999 11.0603C12.3287 11.4344 12.9913 11.378 13.2643 10.8787C13.6356 10.1998 13.8736 9.45248 13.9617 8.67713C14.0892 7.55433 13.8971 6.41834 13.4074 5.39993C12.9177 4.38152 12.1503 3.5221 11.1937 2.92061Z',
      fill: 'currentColor'
    })
  )
  return root
}
