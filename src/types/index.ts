export interface Paragraph {
  id: string
  text: string
}

export interface Script {
  id: string
  title: string
  paragraphs: Paragraph[]
  createdAt: number
  updatedAt: number
}

export interface Clip {
  id: string
  scriptId: string
  orderIndex: number
  blob: Blob
  durationSec: number
  trimEndSec?: number
  markers: number[]
  createdAt: number
}

export type FontSize = 'sm' | 'md' | 'lg'

export interface Settings {
  fontSize: FontSize
  autoPreview: boolean
}
