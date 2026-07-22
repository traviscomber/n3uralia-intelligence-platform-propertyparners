const pairs = [
  ['dark foreground', '#edf4f3', '#050807', 4.5],
  ['dark muted', '#b6c1bf', '#050807', 4.5],
  ['dark interactive red', '#ff766f', '#050807', 4.5],
  ['light foreground', '#111827', '#ffffff', 4.5],
  ['light muted', '#4b5563', '#ffffff', 4.5],
  ['white on brand red', '#ffffff', '#d7332b', 4.5],
]

function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255) }
function luminance(hex) {
  const values = rgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
}
function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

let failed = false
for (const [name, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background)
  const passes = ratio >= minimum
  console.log(`${passes ? 'PASS' : 'FAIL'} ${name}: ${ratio.toFixed(2)}:1`)
  failed ||= !passes
}
if (failed) process.exit(1)
