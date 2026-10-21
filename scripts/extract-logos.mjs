#!/usr/bin/env node
/**
 * Extrae las imágenes (logos) de un PDF o de un SVG a PNG, sin dependencias.
 *
 * Los dos formatos que exporta Canva esconden lo mismo: una imagen de color y
 * una máscara en escala de grises con la silueta. El script:
 *
 *   PDF — cada logo es un XObject de imagen con su `/SMask`.
 *   SVG — cada logo son dos PNG incrustados en base64 (color + máscara),
 *         emparejados por tamaño; el SVG no trae vectores que valgan la pena.
 *
 * En ambos casos el resultado es el logo recortado a su silueta, con
 * transparencia, y deduplicado por contenido.
 *
 * Uso:
 *   node scripts/extract-logos.mjs <archivo.pdf|archivo.svg> <carpeta-destino>
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";

const [, , srcPath, outDir] = process.argv;
if (!srcPath || !outDir) {
  console.error("uso: node scripts/extract-logos.mjs <archivo.pdf|archivo.svg> <carpeta-destino>");
  process.exit(1);
}

const data = readFileSync(srcPath);
mkdirSync(outDir, { recursive: true });

/** Etiqueta de origen de los archivos: `pdf` o `svg`. */
const tag = extname(srcPath).toLowerCase() === ".svg" ? "svg" : "pdf";

/* ------------------------------------------------------------------ PNG --- */

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = ~0;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** PNG en color verdadero con alfa (8 bits por canal). */
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0; // filtro none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const chunk = (type, payload) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(payload.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "latin1"), payload])), 0);
    return Buffer.concat([head, payload, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Lienzo RGBA recortado a la silueta de la máscara. */
function cutToMask(rgb, alpha, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (alpha[y * w + x] > 16) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  const opaqueSum = [0, 0, 0];
  let opaque = 0;
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const sx = x0 + x;
      const sy = y0 + y;
      const s = (sy * w + sx) * 3;
      const d = (y * cw + x) * 4;
      out[d] = rgb[s];
      out[d + 1] = rgb[s + 1];
      out[d + 2] = rgb[s + 2];
      out[d + 3] = alpha[sy * w + sx];
      if (out[d + 3] > 200) {
        opaque += 1;
        opaqueSum[0] += out[d];
        opaqueSum[1] += out[d + 1];
        opaqueSum[2] += out[d + 2];
      }
    }
  }
  const color = opaque ? opaqueSum.map((v) => Math.round(v / opaque)) : [0, 0, 0];
  return { w: cw, h: ch, rgba: out, color };
}

/* -------------------------------------------------------------- escritura -- */

/** Nombre del color dominante del logo, en español y sin ambigüedad. */
function colorName([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 235 && min > 235) return "blanco";
  if (max < 40) return "negro";
  if (max - min < 24) return "gris";
  if (r > g + 40 && r > b + 40) return "rojo";
  if (g > r + 24 && g >= b) return "verde";
  if (b > r + 40) return "azul";
  return "color";
}

/** Mezcla de colores de una región, ordenada por frecuencia. */
function colorCounts(layer, x0, y0, x1, y1) {
  const counts = new Map();
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d = (y * layer.w + x) * 4;
      if (layer.rgba[d + 3] < 200) continue;
      const key = `${layer.rgba[d]},${layer.rgba[d + 1]},${layer.rgba[d + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** ¿Va a sangre (sin transparencia)? Los logos cuadrados sí; los apaisados no. */
function isOpaque(layer) {
  let transparent = 0;
  for (let i = 3; i < layer.rgba.length; i += 4) {
    if (layer.rgba[i] < 16) transparent += 1;
  }
  return transparent < layer.w * layer.h * 0.02;
}

/** Forma: los cuadrados son insignia; los apaisados, wordmark. */
function shapeName(layer) {
  const ratio = layer.w / layer.h;
  return ratio < 1.15 ? "insignia" : "wordmark";
}

const seen = new Map();
function write(layer) {
  const png = encodePng(layer.w, layer.h, layer.rgba);

  // El deduplicado es perceptual: se cuantiza el color (4 bits por canal) y el
  // alfa (3 bits) antes de resumir, para que dos renderizados del mismo logo
  // con distinto antialias no cuenten como dos. Canva repite el mismo logo en
  // varias páginas con ruido de ±2 por canal.
  const quantized = Buffer.alloc(layer.rgba.length);
  for (let i = 0; i < layer.rgba.length; i += 4) {
    quantized[i] = layer.rgba[i] & 0xf0;
    quantized[i + 1] = layer.rgba[i + 1] & 0xf0;
    quantized[i + 2] = layer.rgba[i + 2] & 0xf0;
    const a = layer.rgba[i + 3];
    quantized[i + 3] = a < 16 ? 0 : a > 240 ? 255 : a & 0xe0;
  }
  const digest = createHash("md5")
    .update(`${layer.w}x${layer.h}:`)
    .update(quantized)
    .digest("hex")
    .slice(0, 12);
  if (seen.has(digest)) {
    seen.get(digest).count += 1;
    return;
  }

  // Nombre legible: forma, tinta, fondo (si el logo va a sangre), origen y
  // tamaño. Se elige el logo por lo que se ve, no por un índice.
  const shape = shapeName(layer);
  const mx = Math.max(1, Math.floor(layer.w / 10));
  const my = Math.max(1, Math.floor(layer.h / 10));
  const center = colorCounts(layer, mx, my, layer.w - mx, layer.h - my);
  const total = center.reduce((acc, [, n]) => acc + n, 0) || 1;
  const nameOf = (key) => colorName(key.split(",").map(Number));
  const parts = [shape, nameOf(center[0]?.[0] ?? "0,0,0")];

  if (isOpaque(layer)) {
    // El fondo es lo que domina en el anillo exterior; la figura, el color del
    // centro que no sea el fondo.
    const ring = [
      ...colorCounts(layer, 0, 0, layer.w, my),
      ...colorCounts(layer, 0, layer.h - my, layer.w, layer.h),
      ...colorCounts(layer, 0, 0, mx, layer.h),
      ...colorCounts(layer, layer.w - mx, 0, layer.w, layer.h),
    ].sort((a, b) => b[1] - a[1]);
    const back = nameOf(ring[0]?.[0] ?? "0,0,0");
    const figure = center.find(([key]) => nameOf(key) !== back);
    const ink = figure ? nameOf(figure[0]) : parts[1];
    parts.length = 0;
    parts.push(shape, ink, "sobre", back);
  } else if (center[1] && center[1][1] / total > 0.18) {
    // Dos tintas cuando la segunda llena buena parte del centro.
    parts.push("y", nameOf(center[1][0]));
  }
  parts.push(tag);
  const base = `${parts.join("-")}-${layer.w}x${layer.h}`;

  // Si otro archivo ya tomó ese nombre (descripción igual pero contenido
  // distinto, no ruido), se distingue con una letra en vez de pisarlo.
  let file = `${base}.png`;
  for (let n = 0; [...seen.values()].some((v) => v.file === file); n += 1) {
    file = `${base}-${String.fromCharCode(98 + n)}.png`;
  }

  writeFileSync(join(outDir, file), png);
  seen.set(digest, { file, count: 1 });
  console.log(`PNG  ${file}`);
}

/* ------------------------------------------------------------------ PDF --- */

/** Componentes por píxel según el espacio de color del objeto. */
function channels(bodyOf, src) {
  const icc = /\/ICCBased\s+(\d+)/.exec(src);
  if (icc) return Number(/\/N\s+(\d+)/.exec(bodyOf(Number(icc[1])))?.[1] ?? 3);
  return /\/DeviceRGB/.test(src) ? 3 : 1;
}

/** Decodifica una imagen del PDF a RGB + máscara (sin recortar). */
function pdfImage(bodyOf, streamOf, ref) {
  const src = ref;
  const w = Number(/\/Width\s+(\d+)/.exec(src)[1]);
  const h = Number(/\/Height\s+(\d+)/.exec(src)[1]);
  const raw = streamOf(src);
  const comps = channels(bodyOf, src);

  // Sin `/DecodeParms` el paso es ancho × componentes; si no cuadra, se usa el
  // que resulta de repartir el flujo entre las filas.
  const declared = Number(/\/Columns\s+(\d+)/.exec(/\/DecodeParms\s*<<([^>]*)>>/.exec(src)?.[1] ?? "")?.[1] ?? 0);
  const stride = declared || Math.round(raw.length / h) || w * comps;

  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = y * stride + x * comps;
      const d = (y * w + x) * 3;
      if (comps >= 3) {
        rgb[d] = raw[s];
        rgb[d + 1] = raw[s + 1];
        rgb[d + 2] = raw[s + 2];
      } else {
        rgb[d] = rgb[d + 1] = rgb[d + 2] = raw[s];
      }
    }
  }

  const maskRef = /\/SMask\s+(\d+)/.exec(src);
  let alpha = Buffer.alloc(w * h, 255);
  if (maskRef) {
    const msrc = bodyOf(Number(maskRef[1]));
    const mw = Number(/\/Width\s+(\d+)/.exec(msrc)?.[1] ?? w);
    const mh = Number(/\/Height\s+(\d+)/.exec(msrc)?.[1] ?? h);
    const mraw = streamOf(msrc);
    const mstride = Math.round(mraw.length / mh) || mw;
    if (mw >= w && mh >= h) {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) alpha[y * w + x] = mraw[y * mstride + x];
      }
    }
  }
  return { w, h, rgb, alpha };
}

/** PNG incrustado (data URI) → RGBA listo para leer. */
function decodeEmbeddedPng(bytes) {
  // Los chunks se recorren SIN descomprimir: el flujo real es la concatenación
  // de los IDAT, que se infla una sola vez al final.
  let pos = 8; // se salta la firma
  let w = 0;
  let h = 0;
  let colorType = 6;
  let bitDepth = 8;
  const idat = [];
  let palette = null;
  while (pos + 8 <= bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString("latin1", pos + 4, pos + 8);
    const payload = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = payload.readUInt32BE(0);
      h = payload.readUInt32BE(4);
      bitDepth = payload[8];
      colorType = payload[9];
    } else if (type === "PLTE") {
      palette = payload;
    } else if (type === "IDAT") {
      idat.push(payload);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`PNG incrustado con ${bitDepth} bits por canal: no soportado`);
  const channelsFor = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const ch = channelsFor[colorType];
  if (!ch) throw new Error(`PNG incrustado con colorType ${colorType}: no soportado`);

  const idatData = inflateSync(Buffer.concat(idat));
  const bytesPerPixel = ch;
  const stride = w * bytesPerPixel;
  const out = Buffer.alloc(stride * h);
  const filters = { 0: null, 1: 1, 2: 2, 3: 3, 4: 4 };
  for (let y = 0; y < h; y += 1) {
    const filter = idatData[y * (stride + 1)];
    if (!(filter in filters)) throw new Error(`filtro PNG ${filter} desconocido`);
    const line = idatData.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const row = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
      const b = prev[i];
      const c = i >= bytesPerPixel ? prev[i - bytesPerPixel] : 0;
      let value = line[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = value & 0xff;
    }
  }
  return { w, h, ch, data: out, colorType, palette };
}

/* -------------------------------------------------------------- ejecución -- */

const extension = extname(srcPath).toLowerCase();

if (extension === ".pdf") {
  const objects = new Map();
  for (const m of data.toString("latin1").matchAll(/(\d+)\s+0\s+obj([\s\S]*?)\bendobj/g)) {
    objects.set(Number(m[1]), m[2]);
  }
  const bodyOf = (n) => objects.get(n) ?? "";
  const streamOf = (src) => {
    const idx = src.indexOf("stream");
    if (idx === -1) return Buffer.alloc(0);
    let bytes = Buffer.from(src.slice(idx + 6), "latin1");
    while (bytes[0] === 0x0d || bytes[0] === 0x0a) bytes = bytes.subarray(1);
    const length = Number(/\/Length\s+(\d+)/.exec(src)?.[1] ?? 0);
    if (length) bytes = bytes.subarray(0, length);
    return /\/FlateDecode/.test(src) ? inflateSync(bytes) : bytes;
  };

  for (const [, src] of objects) {
    if (!/\/Subtype\s*\/Image/.test(src)) continue;
    const image = pdfImage(bodyOf, streamOf, src);
    const layer = cutToMask(image.rgb, image.alpha, image.w, image.h);
    if (layer) write(layer);
  }
} else if (extension === ".svg") {
  // Cada logo son dos PNG incrustados: el de color y su máscara en grises, del
  // mismo tamaño. Se agrupan por dimensiones y se emparejan.
  const embedded = [...data.toString("latin1").matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(
    (m) => decodeEmbeddedPng(Buffer.from(m[1], "base64")),
  );
  const groups = new Map();
  for (const png of embedded) {
    const key = `${png.w}x${png.h}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(png);
  }

  for (const [key, pngs] of groups) {
    const color = pngs.find((p) => p.ch >= 3);
    const mask = pngs.find((p) => p.ch === 1);
    if (!color || !mask) {
      console.warn(`aviso: ${key} sin par color+máscara (${pngs.length} imágenes), se omite`);
      continue;
    }
    // Color a RGB y máscara a un byte por píxel.
    const rgb = Buffer.alloc(color.w * color.h * 3);
    for (let i = 0; i < color.w * color.h; i += 1) {
      const s = i * color.ch;
      rgb[i * 3] = color.data[s];
      rgb[i * 3 + 1] = color.data[s + 1];
      rgb[i * 3 + 2] = color.data[s + 2];
    }
    const alpha = mask.ch === 1 ? mask.data : Buffer.alloc(mask.w * mask.h, 255);
    const layer = cutToMask(rgb, alpha, color.w, color.h);
    if (layer) write(layer);
  }
} else {
  console.error(`extensión no soportada: ${extension} (usa .pdf o .svg)`);
  process.exit(1);
}

const duplicates = [...seen.values()].reduce((acc, v) => acc + v.count - 1, 0);

// Manifiesto para la galería: se acumula entre corridas (PDF + SVG) y se
// reescribe completo cada vez, así nunca lista un archivo que ya no está.
const manifestPath = join(outDir, "logos.json");
let manifest = [];
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  manifest = [];
}
const files = manifest.filter((f) => ![...seen.values()].some((v) => v.file === f.file));
files.push(...seen.values());
files.sort((a, b) => a.file.localeCompare(b.file, "es"));
writeFileSync(
  manifestPath,
  `${JSON.stringify(files.map((v) => ({ file: v.file })), null, 2)}\n`,
);

console.log(
  `\n${seen.size} imágenes únicas escritas en ${outDir}` +
    (duplicates ? ` (${duplicates} repetidas omitidas)` : ""),
);
console.log(`origen: ${basename(srcPath)}`);
