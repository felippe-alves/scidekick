# Scidekick TUI — Visual Identity

## Concept

**Signal / Graph.** A scientific instrument aesthetic: monochrome, calibrated, purposeful. The TUI looks like something that belongs in a research environment — not a coding assistant dressed up, but an instrument purpose-built for inquiry.

The visual language borrows from oscilloscopes, ECG traces, and signal readouts: a single color family at different intensities, where brightness encodes meaning. Active = bright. Structural = dim. Everything else is depth.

The logo is a **binary tree** — hierarchical branching that references hypothesis trees, citation networks, decision trees, and the recursive structure of scientific inquiry itself.

---

## Logo

A binary tree rendered in ASCII block characters, color-mapped by role:

```
        ●
       ╱ ╲
      ●   ●
     ╱ ╲ ╱ ╲
    ●   ●   ●
```

- Leaf nodes → `accent` (bright chartreuse `#aac832`)
- Inner nodes → `mid` (olive `#7b8f45`)
- Edges `╱╲` → `dim` (deep olive `#3d4822`)

The gradient intro animation sweeps brightness bottom-up, like signal propagating through a network.

---

## Color Palette

A strictly monochrome system. One hue family (yellow-green / olive) at six intensities, plus a single danger color. No secondary hues.

```
Role          Hex        Name
────────────────────────────────────────
accent        #aac832    chartreuse      active, highlighted, bright nodes
glow          #c0de44    lime glow       accent + animated shine
mid           #7b8f45    olive           site-exact match, resting state
dim           #3d4822    deep olive      structure, borders, edges
deep          #1a2410    near-dark       barely-visible elements
bg            #080a04    near-black      base background (olive-tinted)
────────────────────────────────────────
text          #e8ead4    off-white       warm, slightly greenish
muted         #8a9470    gray-green      secondary text
────────────────────────────────────────
danger        #cc3311    red-orange      only non-green; errors, dirty git
```

The `mid` value (`#7b8f45`) is taken directly from the site's CSS `--accent` token, establishing continuity between the landing page and the terminal.

---

## Welcome Screen

Two-column box layout. Left: logo + session context. Right: tips + recent sessions.

```
╭─── scidekick v1.0.0 ─────────────────────────────────────────╮
│                          │ Tips                               │
│     Welcome back!        │ ?  keyboard shortcuts              │
│                          │ #  prompt actions                  │
│          ●               │ /  commands                        │
│         ╱ ╲              │ !  run bash                        │
│        ●   ●             │ ──────────────────────────────     │
│       ╱ ╲ ╱ ╲            │ Recent                             │
│      ●   ●   ●           │ • hypothesis-eval      (2h ago)    │
│                          │ • lit-review-gnn       (yesterday) │
│   claude-opus-4-8        │ • experiment-run-47    (3d ago)    │
│   anthropic              │                                    │
╰──────────────────────────┴────────────────────────────────────╯
  Tip: Use /wiki to search your research knowledge base
```

Color assignments:

| Element | Color |
|---|---|
| Box border | `dim` `#3d4822` |
| Title `scidekick v…` | `muted` `#8a9470` |
| "Welcome back!" | `accent` `#aac832` |
| Logo leaf nodes | `accent` `#aac832` |
| Logo inner nodes | `mid` `#7b8f45` |
| Logo edges | `dim` `#3d4822` |
| Model name | `mid` `#7b8f45` |
| Provider name | `dim` `#3d4822` |
| Section labels (Tips, Recent) | `accent` `#aac832` bold |
| Section separators `──` | `dim` `#3d4822` |
| Session names | `muted` `#8a9470` |
| Session timestamps | `dim` `#3d4822` |
| Tip label | `mid` `#7b8f45` italic |
| Tip body | `dim` `#3d4822` italic |

---

## Status Bar

Powerline-style. Filled segments separated by `▌`, anchored by `▐` on each end. The `◉` glyph (U+25C9, already used on the site) anchors the brand mark to the left of the model name.

```
▐ ◉ claude-opus-4-8 ▌  ~/projects/scidekick ▌  main ✓ ▌ ≈$0.42 ▐
```

| Segment | Color | Notes |
|---|---|---|
| `◉` glyph | `accent` `#aac832` | Brand mark |
| Model name | `accent` `#aac832` | Brightest segment |
| Working directory | `mid` `#7b8f45` | |
| Git branch + status (clean) | `mid` `#7b8f45` | `✓` in mid |
| Git branch + status (dirty) | `danger` `#cc3311` | `✗` in red |
| Cost | `dim` `#3d4822` | Least prominent |
| Separators `▌` | `deep` `#1a2410` | Barely visible |
| Bar background | `bg` `#080a04` | Same as terminal bg |

---

## Thinking Level Visualization

Thinking depth maps to intensity. Block-fill characters encode effort level visually.

```
off       ░░  #1a2410   barely visible — model not thinking
minimal   ░░  #3d4822   dim olive
low       ▒▒  #5a6e32   medium-dim
medium    ▒▒  #7b8f45   site olive — resting active
high      ▓▓  #96b038   warm lime
x-high    ██  #aac832   full chartreuse — maximum effort
```

---

## Message Backgrounds

Backgrounds are near-invisible tints, preserving the monochrome feel while giving spatial separation.

| Message type | Hex | Notes |
|---|---|---|
| User message | `#0c1208` | Lightest trace of green |
| Tool pending | `#0a1106` | Cooler, barely there |
| Tool success | `#0d1409` | Trace of green |
| Tool error | `#1a0a06` | Trace of red-brown |
| Custom / wiki | `#0e1509` | Same family as success |

---

## Markdown Rendering

```
Headings   → accent  #aac832   stands out clearly
Links      → mid     #7b8f45   matches site link color
Code       → #96b038           warm lime, slightly lighter than mid
Code block → #aac832           border in dim, content in lime
Blockquote → dim     #3d4822
List bullet→ accent  #aac832
HR rule    → dim     #3d4822
```

---

## Diff Colors

```
Added   → accent  #aac832
Removed → danger  #cc3311
Context → dim     #3d4822
```

---

## Syntax Highlighting

Kept minimal — only enough to be readable. No full VS Code spectrum.

```
Keywords    → mid      #7b8f45
Functions   → accent   #aac832
Strings     → #96b038  warm lime
Numbers     → #7b8f45  mid
Types       → #5a6e32  medium-dim
Comments    → dim      #3d4822
Operators   → muted    #8a9470
Punctuation → muted    #8a9470
```

---

## Light Mode

The light mode derives from the same palette, inverted. Paper background with deep olive text — like a physical lab notebook.

```
bg          #f6f4ec   warm off-white, slight olive tint
text        #1a2410   deep olive (near-black)
muted       #5a6e32   medium olive
dim         #8a9470   gray-green
accent      #4a6020   dark olive (replaces chartreuse for legibility)
glow        #7b8f45   site exact (hover states)
border      #c8cbb0   warm light rule
danger      #aa2200   dark red
```

The logo uses the same binary tree, with nodes in `accent` (`#4a6020`) and edges in `dim` (`#8a9470`).

---

## App Name

`scidekick` — lowercase throughout the TUI, consistent with the site's `nav-brand` usage and the `sk` CLI binary.

The `◉` glyph precedes the name in the status bar and welcome box title. It is the only persistent brand element across both the site and the TUI.

---

## Implementation Scope

| File | Change |
|---|---|
| `.sk/dark.json` | Full palette replacement per spec above |
| `.sk/light.json` | Full palette replacement per spec above |
| `vendor/oh-my-pi` (submodule) | Logo replacement in `src/modes/components/welcome.ts` — requires decision: fork, local patch, or override hook |

The `APP_NAME` used in the welcome box title comes from `@oh-my-pi/pi-utils`. If it reads `oh-my-pi` rather than `scidekick`, that also needs to be overridden at the submodule or harness layer.
