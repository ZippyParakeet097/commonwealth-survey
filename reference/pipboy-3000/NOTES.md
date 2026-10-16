# Pip-Boy 3000 (Fallout 3 and New Vegas): reference notes

What the Pip-Boy look is matched against. The screenshots and crops in this folder are Bethesda's
game art, gathered from the fan wikis for comparison only; they stay out of git (see `.gitignore`).
These notes are ours. Pixel measurements below are from the 1920 × 1200 screenshot
`fo3/FO3_Pip_Boy_Sections_17.jpg` unless another file is named.

## Sources

- Fallout Wiki, Pip-Boy 3000: <https://fallout.wiki/wiki/Pip-Boy_3000>. Every STATS, ITEMS and
  DATA screen (`fo3/FO3_Pip_Boy_Sections_*.jpg`), the device front (`fo3/Pip-Boy_3000Cover.png`,
  `fo3/Pip-Boy_3000.png`), the unused temp screens and the development art.
- Fallout Wiki file search (`fallout.wiki/api.php`, namespace 6): the New Vegas screens
  (`fnv/FNV_Pip-Boy_low_texture_bug*.jpg`), a labelled Fallout 3 world map crop
  (`fnv/Rockopolis_loc.jpg`, despite the folder it is Fallout 3), the quest screen at
  higher resolution (`fo3/Fo3_FI_Date.png`).
- Default colours: Fallout 3's `FalloutPrefs.ini` stores the Pip-Boy colour as one packed RGBA
  integer. The default `uPipboyColor=452952319` is `0x1AFF80FF`, so **green is #1AFF80**; the
  "Default Amber" value `4290134783` is `0xFFB642FF`, so **amber is #FFB642**
  (STEP forum, Fallout 3 default INI values; Nexus Mods 4737). The four presets the games offer:
  **amber #FFB642, blue #2ECFFF, green #1AFF80, white #C0FFFF** (Nexus Mods 65423).
  Fallout 3 defaults to green, New Vegas to amber.
- Fonts, from Fallout 3's default `Fallout.ini` `[Fonts]`: `Glow_Monofonto_Large`,
  `Monofonto_Large`, `Glow_Monofonto_Medium`, `Monofonto_VeryLarge02_Dialogs2`,
  `Fixedsys_Comp_uniform_width` (terminals), `Glow_Monofonto_VL_dialogs`,
  `Baked-in_Monofonto_Large`, `Glow_Futura_Caps_Large`. The Pip-Boy is set in **Monofonto**
  (Typodermic). Its free licence is desktop only; the web needs a paid licence, so the site
  uses a stand-in (below). Glyph samples: `font/mf-*.png` (dafont previews).

## Monofonto, measured (`font/mf-small.png`, 40 px sample)

- Cap height 38 px, x-height 26 px (x/cap **0.68**), advance 26 px (advance/cap **0.68**):
  condensed, with a tall x-height.
- Heavy: the H stem is 7 px, **0.18 of the cap height**.
- Plain oval **0** (no slash, no dot); **1** has a flag and **no foot**; **l** ends in a short
  curve to the right; **a** two-storey; **g** one-storey.
- Free fonts measured the same way (advance/cap): Iosevka 0.68, Inconsolata at width 80 0.67,
  at 85 0.70, Noto Sans Mono at width 62.5 0.70, Share Tech Mono 0.77, Roboto Mono 0.84.
  Inconsolata 700–800 at width 85 matches Monofonto's line length and weight best, but its zero
  is slashed (Noto's and Iosevka's are too).

## The screen

- Background is a lit dark green, not black: **#0C2013** at the centre, #132519 low on the glass,
  **#060B07** at the edge (about 10% of the tint, falling to about 4% at the rim). Quest screen:
  #062416 to #082A1A.
- Brightest text **#1FD873** (about 85% of #1AFF80) with a soft bloom; the fonts are pre-glowed
  ("Glow_Monofonto"). Completed quests are much dimmer, **#0F6637** (about 40%): too faint for
  WCAG AA, so the site uses its 74% shade for dim text instead.
- Lines are 1–2 px of the full tint (measured #31784C because they are thin and anti-aliased).
- Fine horizontal scanlines over everything, a vignette, a soft diagonal glare at upper right,
  and the glass is a rounded rectangle whose corners curve noticeably.
- World map: dark textured ground #0C1D11 to #12301C, roads about 35% of the tint (#16592F),
  a faint square grid, the player as a solid arrowhead, the quest marker as a solid tab, and a
  dotted line between them.

## Screen layout

- **Header**, top of the glass: a bracket `┌──` at far left (a vertical tick down from a short
  horizontal line that meets the title at about its middle), then the **title** (STATS, ITEMS,
  DATA) in large capitals with wide letter spacing (about 0.35 em). After it, **readout boxes**,
  each a top line with a **vertical line down its right end only** (`──┐`), the label at the left
  and the value right-aligned against the vertical, boxes about 7 px apart. The top lines sit at
  the title's cap height; the verticals drop to just below the text. The lines tilt a little with
  the curve of the glass.
  - STATS: `LVL 1 ┐ HP 180/180 ┐ AP 75/75 ┐ XP 218/200 ┐`
  - ITEMS: `Wg 74/190 ┐ HP 180/180 ┐ DR 1 ┐ Caps 300 ┐` (New Vegas: `DT 22.0`)
  - DATA: one long box with the location right-aligned (`The Capital Wasteland ┐`), then the
    date and time (`08.17.77, 11:44 ┐`): month.day.two-digit-year, 24-hour clock.
- **Footer**, bottom of the glass: the sub-tabs on one line, joined by short dashes at the
  text's middle height, with a gap either side of each unselected label. The **selected sub-tab is
  boxed** (1–2 px rectangle) and the dashes either side **touch the box**. The rule turns **up
  at both ends** (`└` at left, `┘` at right), rising about two lines' height, so header and footer
  together bracket the four corners of the screen.
  - STATS: Status, S.P.E.C.I.A.L., Skills, Perks, General
  - ITEMS: Weapons, Apparel, Aid, Misc, Ammo
  - DATA: Local Map, World Map, Quests, Notes, Radio
- **Prompts** (actions) sit at the top right just under the header, right-aligned, in the screen
  colour, often dimmer: `Show Location`, `Show Active Quest Notes`, `(11) Stimpak S`, `Repair R)`.
- **Lists**: left column, sentence case, about 1.75 lines apart. The active or equipped item has
  a small **filled square** bullet (■); objectives use a filled or hollow square. Scrollable lists
  show an up arrow with a stem (`↑`) at top left, a chevron (`∨`) at bottom left, and a short
  vertical bar between them marking the scroll position. Details sit in the right column.
- **Description box**: text inside a frame of a top line, a vertical at the right, and a short
  tick down at the left; the bottom is open.
- STATS > Status has a third row of tabs (CND, RAD, EFF) stacked at the top left, the selected
  one boxed.

## The device

- Worn olive-drab metal: olive green-brown base with darker grime, paint chipped to blue-grey
  bare metal along edges and corners. In the dim game lighting it reads almost black-green
  (#1C231C); on the plain cover render it is mid olive (about #4F4D3C).
- **Screen bezel**: a thick near-black frame (#1E1D16) with heavily rounded corners, set in a
  larger housing whose top edge rises into a hood. Phillips screws at the housing's corners.
- **Left panel**, top to bottom:
  - **Rad gauge**: a round chrome bezel. The left third of the face is covered by a dark metal
    plate with two rivets; the cream face shows a scale arc on the right half, **0 at the
    bottom, 2, 4, 6, 8, to 10 at the top**, as a ladder of ticks between two arcs, with **6–10
    filled red**. `x100` printed at the middle left, a black and white **radiation trefoil**
    below it, a black needle pivoting at the left middle (resting near 0).
  - **"Pip-Boy"** in raised italic script, silver on the olive.
  - Four deep **horizontal ribs**.
  - A small dark plate reading **`• Model 3⁰⁰⁰ •`** (the 000 raised and smaller).
  - A big dark **knob** on a crescent dial plate with 6–7 cream tick marks round its right side,
    rivets at the plate's ends, a Phillips screw below.
- **Thumbwheel**: a ribbed brass roller in a chrome slot, upright, right against the screen's
  left edge.
- **Right side**: a raised rounded column with four **horizontal** grip ribs between two Phillips
  screws (`crops/cover-right.png`), then the flat arm clamp with a worn chrome edge.
- The **"Pip-Boy" badge** is chrome italic script with a hyphen (`crops/cover-logo.png`); the
  closest free face tried is Courgette. The thumbwheel is a ribbed **brass** roller in a chrome
  frame with a small ball on top (`crops/cover-wheel.png`). The model plate's text is a plain
  light sans.
- **Below the screen**: a raised plate between two upright rails, labelled **STATS ITEMS DATA**
  in yellow-cream paint (about #C8B46A), over **three round lamp buttons** in chrome rings. The
  lamp of the open tab is lit: a hot yellow core (measured #FEFE4A) going orange; the others are
  dark red-brown glass. The lamps are always orange whatever the screen colour. Under the plate,
  four vertical vent slots. The Xbox 360 render puts `LT` and `RT` labels either side.

## The world map markers (Fallout 3)

`fnv/Rockopolis_loc.jpg` (a wiki crop of the Fallout 3 world map): each place is a small square
badge in the screen colour with its type cut out in black (house, factory, monument columns,
metro M, cave, vault cog…). The game shows names on hover; the wiki crops label them in the screen
colour on dark plates, big names for major places. The selected spot (or the player) sits in
four corner brackets. New Vegas marks discovered places as filled squares and places only heard
of as hollow squares.

## In the survey

Where each observation above went (`css/survey.css`, section "The Pip-Boy 3000", unless named):

- **Colours**: the four presets, exactly (`html[data-tint]`). The glass is lit to 11% of the tint in
  the middle (`--glass`) and falls to 3% at the rim; text runs at full tint, secondary text at 74%
  (the games' dimmer 40% fails WCAG AA, so it isn't used).
- **Font**: Survey Mono, Inconsolata fixed at 82% width with a plain zero, matched to the Monofonto
  measurements above (`scripts/make-font.py`, `assets/fonts/`).
- **Title bar**: the tab's name in the `┌` bracket, the survey's title, then readout boxes closed on
  the right, ending with the clock in Fallout 3's `MM.DD.YY, HH:MM` (`js/pipboy.js`, `titleBar`).
  Each tab has its own readouts (`js/main.js`, `READ`); narrow screens drop them from the left.
- **Prompts**: under the title bar at the right, label first and key after.
- **Sub-tabs**: along the foot, joined by dashes, the rule turning up at both ends, the open one
  boxed. The map's views work the same way; the box leaves when the map moves off the view.
- **Lists**: no row rules; the highlighted row is boxed.
- **Device**: rad gauge (needle reads the selected place), "Pip-Boy" badge, four ribs,
  `• Model 3⁰⁰⁰ •` plate, tuning knob (turns with the tab), brass thumbwheel, bezel with a hood,
  Phillips screws, the right-hand grip, and the lamp plate with the tabs as lamp buttons, the open
  one lit orange whatever the screen colour. Olive drab with chipped paint and grime.
- **Map**: places as squares, filled or hollow as in New Vegas; settlements as pennants; downtown
  Boston folded into one counted marker at whole-map zoom; routes dotted like the quest path;
  the selection in corner brackets.
- **Screen effects**: scanlines, vignette, the glare at upper right, faint smudges, a rolling band,
  a flicker on changing tab, and the power-on as the Pip-Boy rises into view. Settings turns the
  texture off; reduced motion stops the motion; more contrast removes the overlays.

Known differences: five lamp buttons rather than three, for the survey's five tabs, labelled and in
Fallout 4's slot order; the glass is flat, with no barrel curve, so the title bar's lines are
straight; the badge and plate are drawn in free fonts, not the original artwork; Vault Boy is left
out.
