#!/usr/bin/env node
/**
 * Generates public/hero-loop.mp4 + public/hero-loop-poster.jpg
 * using ffmpeg (no drawtext required — abstract UI via drawbox + noise).
 * Run: node scripts/generate-hero-loop.mjs
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outMp4 = join(root, "public", "hero-loop.mp4");
const outPoster = join(root, "public", "hero-loop-poster.jpg");

const W = 1280;
const H = 720;
const D = 14;

const filters = [
  `noise=alls=10:allf=t+u`,
  `drawbox=x=0:y=0:w=${W}:h=${H}:color=black@0.28:replace=1:t=0`,
  `drawbox=x=96:y=48:w=1088:h=624:color=black@0.15:replace=1:t=0`,
  `fade=t=in:st=0:d=0.55`,
  `fade=t=out:st=${D - 0.55}:d=0.55`,
  `drawbox=x=120:y=56:w=1040:h=608:color=0x0f1011:replace=1:enable='gte(t\\,0.4)'`,
  `drawbox=x=120:y=56:w=1040:h=608:color=white@0.14:t=1:enable='gte(t\\,0.4)'`,
  `drawbox=x=120:y=56:w=1040:h=46:color=white@0.07:replace=1:enable='gte(t\\,0.7)'`,
  `drawbox=x=120:y=102:w=1040:h=1:color=white@0.12:replace=1:enable='gte(t\\,0.85)'`,
  `drawbox=x=144:y=73:w=8:h=8:color=0x34d399:replace=1:enable='gte(t\\,0.9)'`,
];

const rowY = [138, 188, 238, 288];
for (let i = 0; i < rowY.length; i++) {
  const t0 = 1.1 + i * 0.35;
  filters.push(
    `drawbox=x=136:y=${rowY[i]}:w=1008:h=40:color=white@0.04:replace=1:enable='between(t\\,${t0}\\,${D})'`
  );
}

const baseline = 562;
const heights = [36, 58, 40, 72, 52, 64, 78];
const barX0 = 820;
for (let i = 0; i < heights.length; i++) {
  const h = heights[i];
  const x = barX0 + i * 22;
  const y = baseline - h;
  const t0 = 2.4 + i * 0.22;
  filters.push(
    `drawbox=x=${x}:y=${y}:w=14:h=${h}:color=white@0.22:replace=1:enable='between(t\\,${t0}\\,${D})'`
  );
}

filters.push(
  `drawbox=x=200:y=612:w=880:h=40:color=white@0.08:replace=1:enable='between(t\\,9.2\\,${D})'`,
  `drawbox=x=200:y=612:w=880:h=40:color=white@0.05:t=1:enable='between(t\\,9.2\\,${D})'`
);

const vf = filters.join(",");
const lavfi = `color=c=0x08090a:s=${W}x${H}:r=30:d=${D}`;

function run(bin, args, label) {
  const r = spawnSync(bin, args, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`${label} failed`);
    process.exit(r.status ?? 1);
  }
}

console.log("Writing", outMp4);
run(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    lavfi,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outMp4,
  ],
  "ffmpeg encode"
);

console.log("Writing", outPoster);
run(
  "ffmpeg",
  ["-y", "-ss", "2", "-i", outMp4, "-vframes", "1", "-q:v", "2", outPoster],
  "ffmpeg poster"
);

console.log("Done.");
