# WonkaWare

Arcade microgames in Willy Wonka's factory. Plain HTML/CSS/JS, no build step.

    node serve.mjs        # http://localhost:8765

Debug: `?game=violet&loop=3` loops one microgame forever; `?scene=title|transition|faster|gameover`.

Faces: drop 512×512 transparent PNGs in `faces/` as `{kid}.png` and `{kid}-scared.png`
(charlie, augustus, violet, veruca, mike). Tune the mouth split in `src/faces.js` (`FACE_CONFIG`)
using `/faces.html`.
