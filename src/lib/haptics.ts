export function vibrate(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function vibrateSuccess() {
  vibrate([10, 50, 10])
}

export function vibrateError() {
  vibrate([50, 30, 50, 30, 50])
}
