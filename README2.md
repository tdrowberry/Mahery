# Mahery Complete Animated Library v1

This package contains animated versions of every completed Mahery character and effect strip.

## Project layout

- `public/art/animations/`: optimized WebP clips used by the game at runtime.
- `reference-art/animation-library/`: the complete source library, including GIF previews and six individual PNG frames per animation.
- `src/data/combatAnimations.ts`: the single mapping between combat actions and runtime clips.

Inside the source library:

- `hero-hybrids/`: all hero character attacks and character-only casting motions, plus shared magic overlays.
- `companion-animals/`: all natural companion attacks.
- `humanoid-enemies/`: all left-facing humanoid enemy attacks and character-only casting motions.
- `enemy-animals/`: all left-facing natural enemy attacks reserved for future natural-enemy encounters.

Each category contains:

- `animated-webp/`: recommended transparent animated previews with better color and edge quality.
- `animated-gif/`: convenient transparent previews with broad compatibility.
- `individual-frames/`: six transparent PNG frames per animation for game-engine import.

The source animations loop for previewing. In combat, the renderer shows one 910 ms pass and then returns the fighter to its normal idle pose. Timing includes anticipation, a fast strike or release, an impact hold, and recovery.
