# Tracking one molecule

An interactive, dependency-free walkthrough of a single mRNA from capture in a
10x droplet through to a UMI-deduplicated counts matrix. Pure HTML/CSS/JS — no
build step. Open `index.html` directly, or serve the folder on GitHub Pages.

## Files

| File | What it is | Edit it when… |
|------|------------|----------------|
| `index.html` | Page skeleton + the colour key. Loads the CSS and the two scripts. | you change the page chrome or the legend |
| `styles.css` | All styling. Colours are `:root` tokens at the top; each `.k-<kind>` is a block colour. | you want a different look or palette |
| `content.js` | **The file you'll usually edit.** `CONTENT` (sequences, gene, coordinates, matrix), `STEPS` (the slides), `SPECIAL` (the four data panels). | you change what a slide says or shows |
| `engine.js` | The drawing + navigation engine. | rarely — only to change how molecules are drawn |

## Common edits

- **Reword a slide** — find it in `STEPS` (in `content.js`) and edit `title` / `c` / `d`.
- **Add a slide** — copy a `STEPS` entry and drop it in at the position you want.
- **Change the example sequences, gene, coordinates, or matrix numbers** — edit
  `CONTENT` at the top of `content.js`; the value propagates to every slide that uses it.
- **Recolour a region** — change the matching `:root` token in `styles.css`.
- **Add a new molecular part (block)** — add a block const in `engine.js`
  (e.g. `var FOO = {kind:"foo", label:"Foo"};`) and a `.k-foo { background: ... }`
  rule in `styles.css`, then use it in a column: `c(width, FOO, FOO)`.

## How molecules are drawn

A molecule is a left-to-right list of **columns**, built with `c(width, top, bot)`:

- both `top` and `bot` present → double-stranded (draws a base-pairing rung)
- only one present → single-stranded region or a one-base overhang

`topEnds` / `botEnds` are the `["3′","5′"]`-style strand labels. Arrows,
top brackets, and read brackets reference columns by index (0 = leftmost).
See the schema comment at the top of `content.js` for the full reference.

## Notes / placeholders to verify

- The alignment coordinates in `CONTENT.locus` are illustrative — set them to
  your reference build before presenting.
- The `CONTENT.r2seq` read is an example insert, not a real `CONTENT.gene` read;
  swap in a real read if you want the fragment and gene name to correspond.
