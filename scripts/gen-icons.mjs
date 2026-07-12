// Generates the SB CashFlow brand icons from an SVG mark.
// The mark is a monogram of CURRENCY SYMBOLS: "$" (dollar, for S) and
// "฿" (baht, for B) — a nod to the business being a money tracker.
import { Resvg } from "@resvg/resvg-js"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS = resolve(__dirname, "..", "public", "icons")
const APPDIR = resolve(__dirname, "..", "src", "app")
mkdirSync(ICONS, { recursive: true })

/** Build the mark SVG. `maskable` = full-bleed square with a safe margin. */
function markSvg({ maskable = false } = {}) {
  const rx = maskable ? 0 : 112
  const fontSize = maskable ? 210 : 250
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <text x="256" y="270" text-anchor="middle" dominant-baseline="central"
    font-family="'Segoe UI','Arial',sans-serif" font-weight="800"
    font-size="${fontSize}" letter-spacing="-14" fill="#ffffff">$฿</text>
</svg>`
}

function render(svg, size) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: true },
  })
  return r.render().asPng()
}

const rounded = markSvg({ maskable: false })
const maskable = markSvg({ maskable: true })

const jobs = [
  { svg: rounded, size: 192, out: resolve(ICONS, "icon-192.png") },
  { svg: rounded, size: 512, out: resolve(ICONS, "icon-512.png") },
  { svg: maskable, size: 512, out: resolve(ICONS, "icon-maskable-512.png") },
  { svg: rounded, size: 180, out: resolve(ICONS, "apple-touch-icon.png") },
  // Next.js file conventions (auto <link rel=icon> / apple):
  { svg: rounded, size: 256, out: resolve(APPDIR, "icon.png") },
  { svg: rounded, size: 180, out: resolve(APPDIR, "apple-icon.png") },
]

for (const j of jobs) {
  writeFileSync(j.out, render(j.svg, j.size))
  console.log("wrote", j.out.replace(resolve(__dirname, ".."), "."))
}

// Also drop the source SVG for reference / future editing.
writeFileSync(resolve(ICONS, "mark.svg"), rounded)
console.log("done")
