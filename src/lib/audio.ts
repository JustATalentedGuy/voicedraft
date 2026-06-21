import type { Clip } from '../types'

function writeString(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

export function getEffectiveDuration(clip: Clip): number {
  return Math.min(
    clip.durationSec,
    Math.max(0.25, clip.trimEndSec ?? clip.durationSec),
  )
}

export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  let offset = 44
  for (const sample of samples) {
    const clampedSample = Math.max(-1, Math.min(1, sample))
    const pcmSample = clampedSample < 0
      ? clampedSample * 0x8000
      : clampedSample * 0x7fff
    view.setInt16(offset, pcmSample, true)
    offset += bytesPerSample
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()

  try {
    return await audioContext.decodeAudioData(arrayBuffer)
  } finally {
    await audioContext.close()
  }
}

export function sliceAudioBuffer(
  source: AudioBuffer,
  startSec = 0,
  endSec = source.duration,
): AudioBuffer {
  const startSample = Math.min(
    source.length,
    Math.max(0, Math.floor(startSec * source.sampleRate)),
  )
  const endSample = Math.min(
    source.length,
    Math.max(startSample + 1, Math.floor(endSec * source.sampleRate)),
  )
  const length = endSample - startSample
  const slicedBuffer = new AudioBuffer({
    length,
    numberOfChannels: 1,
    sampleRate: source.sampleRate,
  })
  slicedBuffer.copyToChannel(
    source.getChannelData(0).slice(startSample, endSample),
    0,
  )
  return slicedBuffer
}

export async function buildWaveformPeaks(
  blob: Blob,
  barCount: number,
): Promise<number[]> {
  const audioBuffer = await blobToAudioBuffer(blob)
  const samples = audioBuffer.getChannelData(0)
  const count = Math.max(1, Math.floor(barCount))
  const samplesPerBar = Math.max(1, Math.floor(samples.length / count))
  const peaks: number[] = []
  let maximum = 0

  for (let bar = 0; bar < count; bar++) {
    const start = bar * samplesPerBar
    const end = bar === count - 1
      ? samples.length
      : Math.min(samples.length, start + samplesPerBar)
    let sumSquares = 0
    for (let index = start; index < end; index++) {
      sumSquares += samples[index] ** 2
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, end - start))
    maximum = Math.max(maximum, rms)
    peaks.push(rms)
  }

  if (maximum === 0) return peaks.map(() => 0.04)
  return peaks.map((peak) => Math.max(0.04, peak / maximum))
}

export function mergeAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) throw new Error('No buffers to merge')
  const sampleRate = buffers[0].sampleRate
  if (buffers.some((buffer) => buffer.sampleRate !== sampleRate)) {
    throw new Error('All buffers must use the same sample rate')
  }

  const totalLength = buffers.reduce(
    (length, buffer) => length + buffer.length,
    0,
  )
  const mergedBuffer = new AudioBuffer({
    length: totalLength,
    numberOfChannels: 1,
    sampleRate,
  })
  const output = mergedBuffer.getChannelData(0)
  let offset = 0

  for (const buffer of buffers) {
    output.set(buffer.getChannelData(0), offset)
    offset += buffer.length
  }
  return mergedBuffer
}

export async function exportSessionAsWAV(clips: Clip[]): Promise<Blob> {
  const audioBuffers = await Promise.all(clips.map(async (clip) => {
    const decoded = await blobToAudioBuffer(clip.blob)
    return sliceAudioBuffer(decoded, 0, getEffectiveDuration(clip))
  }))
  const mergedBuffer = mergeAudioBuffers(audioBuffers)
  return encodeWAV(
    mergedBuffer.getChannelData(0),
    mergedBuffer.sampleRate,
  )
}
