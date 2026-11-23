# WonkaWare

Arcade microgames in Willy Wonka's factory. Plain HTML/CSS/JS, no build step, no audio files.

    node serve.mjs        # http://localhost:8765

## Debug URLs

- `?game=violet&level=3` plays one microgame at a level, forever (`charlie`, `violet`, `veruca`, `mike`, `augustus`)
- `?scene=menu|transition|round|scoreboard|tourend|celebrate|ending` jumps to a screen
- `?fast=4` runs the whole game faster (testing only)

## Faces

Drop 512×512 transparent PNGs in `faces/` as `{name}.png` and `{name}-scared.png`
(charlie, augustus, violet, veruca, mike, wonka). Tune where each head splits in
`src/faces.js` (`FACE_CONFIG`) using `/faces.html`.

## Sound

Everything is synthesised in `src/audio.js`. To swap in a real file later:
`registerFile('chomp', 'audio/chomp.ogg')` or `registerFile('music:menu', 'audio/menu.ogg')`.
