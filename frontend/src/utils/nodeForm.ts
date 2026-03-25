import type { NodeType, CreateNodeBody } from '../types'

export interface NodeFormState {
  name: string
  title: string
  content: string
  description: string
  tradition: string
  bornYear: string
  diedYear: string
  year: string
  publishedYear: string
}

export const EMPTY_NODE_FORM: NodeFormState = {
  name: '',
  title: '',
  content: '',
  description: '',
  tradition: '',
  bornYear: '',
  diedYear: '',
  year: '',
  publishedYear: '',
}

export function optionalYear(value: string): number | undefined {
  if (value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

export function buildNodeRequestBody(type: NodeType, form: NodeFormState): CreateNodeBody {
  switch (type) {
    case 'THINKER':
      return {
        type,
        name: form.name,
        ...(form.description ? { description: form.description } : {}),
        ...(form.tradition ? { tradition: form.tradition } : {}),
        ...(form.bornYear !== '' ? { bornYear: optionalYear(form.bornYear) } : {}),
        ...(form.diedYear !== '' ? { diedYear: optionalYear(form.diedYear) } : {}),
      }
    case 'CONCEPT':
      return {
        type,
        name: form.name,
        ...(form.description ? { description: form.description } : {}),
        ...(form.year !== '' ? { year: optionalYear(form.year) } : {}),
      }
    case 'CLAIM':
      return {
        type,
        content: form.content,
        ...(form.description ? { description: form.description } : {}),
        ...(form.year !== '' ? { year: optionalYear(form.year) } : {}),
      }
    case 'TEXT':
      return {
        type,
        title: form.title,
        ...(form.description ? { description: form.description } : {}),
        ...(form.publishedYear !== '' ? { publishedYear: optionalYear(form.publishedYear) } : {}),
      }
  }
}
