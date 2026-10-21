import {
  DEFAULT_SIZE, DURATION_VAR, PLAY_STATE_VAR, SIZE_VAR, STEP_VAR,
  type SpinnerName, type SpinnerProps
} from '../../lib/loaders/motion'

/** Styles are installed in this document or shadow root, once per loader. */
export type LoaderTarget = Document | ShadowRoot

export default function Frame(name: SpinnerName, css: string, target: LoaderTarget): Document {
  const doc = target.nodeType === 9 ? target as Document : target.ownerDocument!
  const container = target.nodeType === 9 ? doc.head : target
  if (!container.querySelector(`style[data-loader="${name}"]`)) {
    const style = doc.createElement('style')
    style.dataset.loader = name
    style.textContent = css
    container.append(style)
  }
  return doc
}

export function step(element: HTMLElement | SVGElement, index: number): void {
  element.style.setProperty(STEP_VAR, String(index))
}

export function spinnerRoot<T extends HTMLElement | SVGElement>(
  element: T,
  name: SpinnerName,
  { className, color, duration, playState, size = DEFAULT_SIZE }: SpinnerProps
): T {
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('class', [`ld-${name}`, className].filter(Boolean).join(' '))
  element.style.setProperty(SIZE_VAR, `${size}px`)
  if (color !== undefined) element.style.color = color
  if (duration !== undefined) element.style.setProperty(DURATION_VAR, `${duration}ms`)
  if (playState !== undefined) element.style.setProperty(PLAY_STATE_VAR, playState)
  return element
}

export function svgElement<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const element = doc.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
  return element
}
