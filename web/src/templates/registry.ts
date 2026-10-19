import type { ComponentType } from 'react'
import type { ResumeDocument, TemplateId } from '@arbor/shared'
import { Aurora, Onyx, Quantum, Meridian, Lumen } from './basic'
import { Nova, Vertex } from './columns'
import { Pulse } from './pulse'

export type TemplateComponent = ComponentType<{ doc: ResumeDocument }>

export const TEMPLATE_COMPONENTS: Record<TemplateId, TemplateComponent> = {
  aurora: Aurora,
  onyx: Onyx,
  nova: Nova,
  quantum: Quantum,
  meridian: Meridian,
  vertex: Vertex,
  lumen: Lumen,
  pulse: Pulse,
}

export function getTemplate(id: TemplateId | string): TemplateComponent {
  return TEMPLATE_COMPONENTS[id as TemplateId] ?? Aurora
}

export { Aurora, Onyx, Nova, Quantum, Meridian, Vertex, Lumen, Pulse }
