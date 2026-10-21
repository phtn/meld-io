import { createRoot } from 'octane'
import RouterRoot from './RouterRoot.btsx'
import './style.css'

const container = document.getElementById('app')
if (container === null) throw new Error('Missing #app container.')

createRoot(container).render(RouterRoot, {})
