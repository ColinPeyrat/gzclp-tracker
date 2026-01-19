let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function playBeep(frequency = 800, duration = 200) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration / 1000)
  } catch {
    // Audio not supported
  }
}

export function playTimerEnd() {
  playBeep(800, 150)
  setTimeout(() => playBeep(800, 150), 200)
  setTimeout(() => playBeep(1000, 300), 400)
}
