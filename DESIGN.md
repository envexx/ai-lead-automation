# Firstpass - design direction

## Identity

Operations ledger. Firstpass is the first pass a lead makes. The interface should
feel like a tool a sales operator keeps open all day, not a marketing page.

## Audience

Sales and revenue operations teams. People who read a table fast and distrust
decoration.

## Personality

Precise, calm, slightly serious. It reports, it does not sell. Copy is short and
concrete. No hype nouns.

## Visual language

- Warm paper surfaces with ink type and hairline rules. Reads as a working
  document rather than a glassy dashboard.
- One accent, a burnt signal orange. The same tone marks a hot lead, so the
  color carries meaning rather than decorating.

## Dials

ENERGY 2 / RHYTHM 2 / MOTION 1

- ENERGY 2: clear hierarchy, no shouting.
- RHYTHM 2: mostly uniform panels with a few deliberately different sections
  (the live automation panel breaks the pattern on the dashboard).
- MOTION 1: hover and state feedback only. No entrance animation on a tool that
  is used dozens of times a day.

## Palette

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| paper | #f4f2ea | #14130f | app background |
| surface | #fbfaf6 | #1b1a14 | panels |
| ink | #1a1914 | #ece7d9 | primary text |
| ink-2 | #5b5749 | #a8a394 | secondary text |
| line | #e3dfd0 | #2e2c22 | hairlines |
| accent | #b4431a | #e07a45 | action, hot lead |
| ok / warn / danger | #2f6f4e / #8a5f10 / #a32a2a | #4fae7d / #d8a53f / #e06a6a | run status |

Reason for the palette: warm neutrals survive long reading sessions, and a single
earth accent keeps the semantic link between "hot" and "act now".

## Typography

- IBM Plex Sans for the interface. Reason: an engineering face with more
  character than the default UI sans, and it holds up in dense tables.
- IBM Plex Mono for numbers, timestamps, and IDs. Reason: scores and offsets are
  read in columns, so they need tabular figures.

## Layout

- Left rail navigation, one content column capped near 1180px.
- Panels, not floating cards. Hairlines do the separation work that shadows
  usually do.
- The dashboard has one focal point: the live automation panel.

## Motion

Hover and focus feedback only. A score meter animates its width once so a new
value is noticeable, and nothing else moves.

## Accessibility

- AA contrast in both themes, verified by token choice (ink on paper, accent on
  paper, on-accent for filled buttons).
- Visible focus ring on every control, keyboard reachable.
- Working light and dark toggle, both themes maintained.

## Out of scope

This is a demonstration project. It is not affiliated with a client, and any
figures shown are generated demo data, labeled as such in the README.
