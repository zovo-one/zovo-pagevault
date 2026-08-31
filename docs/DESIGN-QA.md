# Phase 6 design QA

Mandatory command executed from the engine:

`HEADLESS=1 node 7-design/capture.mjs <dist> --slug zovo-pagevault`

## Round 1 — 8.4/10, iterate

Strengths: a singular capture hero, original aperture art, restrained archive palette, confident type hierarchy, responsive library layout, and intentional light/dark compositions.

Findings:

- **Blocker:** dark options stat cards retained a pale fixed background while the labels inherited dark-mode light text.
- **Major:** light-mode primary actions read almost black and missed the system's purple action cue.
- **Major:** the pricing CTA looked secondary instead of communicating the gold Pro path.
- **Polish:** empty states needed a small piece of owned visual language.

Applied fixes: dark stat cards now use the theme panel token; light primary actions use the violet action token; the pricing CTA uses the amber Pro token; empty states carry a tiny two-tone aperture.

## Round 2 — 9.2/10, PASS

All four real extension renders were recaptured at `engine/7-design/shots/zovo-pagevault/r2/`:

- popup light and dark;
- options/library light and dark.

Pass rationale: clear single hero, purple/gold action hierarchy, readable dark-mode metrics, consistent 8-ish spacing rhythm, soft elevation, original empty-state art, responsive hierarchy, and no placeholder or overflow artifacts. No blocker or major fix remains.
