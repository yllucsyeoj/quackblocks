# SVG PDF Export Test (Spike 1)

This note tests whether inline SVG renders correctly in Obsidian's PDF export.

## Test 1: Simple inline SVG bar chart

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
  <style>
    .bar { fill: #4f46e5; }
    .label { font-family: sans-serif; font-size: 12px; fill: #374151; }
    .axis { stroke: #9ca3af; stroke-width: 1; }
    .title { font-family: sans-serif; font-size: 14px; font-weight: bold; fill: #111827; }
  </style>
  <text x="200" y="20" text-anchor="middle" class="title">Monthly Revenue</text>
  <line x1="50" y1="210" x2="380" y2="210" class="axis"/>
  <line x1="50" y1="30" x2="50" y2="210" class="axis"/>
  <rect x="70" y="110" width="40" height="100" class="bar"/>
  <rect x="130" y="70" width="40" height="140" class="bar"/>
  <rect x="190" y="130" width="40" height="80" class="bar"/>
  <rect x="250" y="50" width="40" height="160" class="bar"/>
  <rect x="310" y="90" width="40" height="120" class="bar"/>
  <text x="90" y="230" text-anchor="middle" class="label">Jan</text>
  <text x="150" y="230" text-anchor="middle" class="label">Feb</text>
  <text x="210" y="230" text-anchor="middle" class="label">Mar</text>
  <text x="270" y="230" text-anchor="middle" class="label">Apr</text>
  <text x="330" y="230" text-anchor="middle" class="label">May</text>
</svg>

## Test 2: SVG with gradients

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#818cf8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="380" height="180" rx="8" fill="#f9fafb" stroke="#e5e7eb"/>
  <rect x="30" y="40" width="60" height="120" rx="4" fill="url(#grad1)"/>
  <rect x="110" y="80" width="60" height="80" rx="4" fill="url(#grad1)"/>
  <rect x="190" y="20" width="60" height="140" rx="4" fill="url(#grad1)"/>
  <rect x="270" y="60" width="60" height="100" rx="4" fill="url(#grad1)"/>
</svg>

## Test 3: Error state rendering

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60" width="400" height="60">
  <rect x="0" y="0" width="400" height="60" rx="6" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="15" y="24" font-family="monospace" font-size="12" font-weight="bold" fill="#dc2626">SQL Error</text>
  <text x="15" y="44" font-family="monospace" font-size="11" fill="#991b1b">Column "reveune" not found. Did you mean "revenue"?</text>
</svg>

## Results

| Context | Simple SVG | Gradients | Error Box |
|---------|-----------|-----------|-----------|
| Edit Mode | ✅ | ✅ | ✅ |
| Reading View | ✅ | ❌ (stripped) | ✅ |
| PDF Export | ✅ | ✅ | ✅ |
