function writeString(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
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

export function findLastPause(
  channelData: Float32Array,
  sampleRate: number,
  thresholdAmplitude = 0.02,
  windowMs = 300,
): number {
  const windowSamples = Math.max(
    1,
    Math.floor((windowMs / 1000) * sampleRate),
  )
  const totalSamples = channelData.length
  const stepSize = Math.max(1, Math.floor(windowSamples / 2))

  for (
    let start = totalSamples - windowSamples;
    start >= 0;
    start -= stepSize
  ) {
    let maxAmplitude = 0
    const end = Math.min(start + windowSamples, totalSamples)

    for (let index = start; index < end; index++) {
      const amplitude = Math.abs(channelData[index])
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude
      }
    }

    if (maxAmplitude >= thresholdAmplitude) {
      return Math.min(start + windowSamples, totalSamples)
    }
  }

  return 0
}

export function trimAudioBuffer(
  source: AudioBuffer,
  trimSec: number,
): AudioBuffer {
  const trimSample = Math.floor(Math.max(0, trimSec) * source.sampleRate)
  const length = Math.min(trimSample, source.length)

  if (length === 0) {
    return new AudioBuffer({
      length: 1,
      numberOfChannels: 1,
      sampleRate: source.sampleRate,
    })
  }

  const trimmedBuffer = new AudioBuffer({
    length,
    numberOfChannels: 1,
    sampleRate: source.sampleRate,
  })
  trimmedBuffer.copyToChannel(source.getChannelData(0).slice(0, length), 0)
  return trimmedBuffer
}

export function mergeAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) {
    throw new Error('No buffers to merge')
  }

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

export async function trimBlobToLastPause(
  blob: Blob,
  thresholdAmplitude: number,
  windowMs: number,
): Promise<{ trimmedBuffer: AudioBuffer; trimSec: number }> {
  const audioBuffer = await blobToAudioBuffer(blob)
  const trimSample = findLastPause(
    audioBuffer.getChannelData(0),
    audioBuffer.sampleRate,
    thresholdAmplitude,
    windowMs,
  )
  const trimSec = trimSample / audioBuffer.sampleRate

  return {
    trimmedBuffer: trimAudioBuffer(audioBuffer, trimSec),
    trimSec,
  }
}

export async function exportSessionAsWAV(blobs: Blob[]): Promise<Blob> {
  const audioBuffers = await Promise.all(blobs.map(blobToAudioBuffer))
  const mergedBuffer = mergeAudioBuffers(audioBuffers)
  return encodeWAV(
    mergedBuffer.getChannelData(0),
    mergedBuffer.sampleRate,
  )
}
