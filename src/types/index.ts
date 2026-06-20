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
  markers: number[]
  createdAt: number
}

export type FontSize = 'sm' | 'md' | 'lg'
export type SilenceThreshold = 0.01 | 0.02 | 0.05
export type SilenceWindowMs = 200 | 300 | 500

export interface Settings {
  fontSize: FontSize
  silenceThreshold: SilenceThreshold
  silenceWindowMs: SilenceWindowMs
  autoPreview: boolean
}
