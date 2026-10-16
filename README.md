# Commonwealth Survey

The Fallout 4 map warped onto real eastern Massachusetts, so you can measure the Commonwealth in true miles.

The game squeezes Boston and its suburbs into a few square miles. This tool puts every game location back on the real ground: real landmarks sit where they really are (Diamond City on Fenway Park, the Castle on Fort Independence), and fictional places are placed by stretching the game map to fit them. It is built for lore writers, modders and anyone who wants a realistic sense of how big the Commonwealth is, and how far the Sole Survivor walked looking for Shaun.

## What it does

- **Scale grid.** Even squares over the game map, sized ¼ mi to 10 mi (or ½ km to 20 km), or sized to the zoom automatically. Columns are lettered and rows numbered from the northwest corner, so every place has a grid reference like `G6` that you can cite in your own writing.
- **Measure.** Click out any route to get its straight-line length and walking time. Points snap to nearby places.
- **The Sole Survivor's search.** One click traces the main quest from Vault 111 to the Courser at Greenetech Genetics: ten legs, about 93 miles as the crow flies.
- **Every location.** 258 marked map locations and 151 unmarked ones, each with its real latitude and longitude, real town, the real site it stands on where there is one, and how its position was worked out.
- **Real coordinates anywhere.** Hover for latitude, longitude and grid square; click empty ground to drop a pin with links to OpenStreetMap and Google Maps.
- **The Glowing Sea.** The in-game Sea warped onto real ground, plus a theory of how far it runs past the map's edge, worked out from fallout drift, October winds and real terrain. Both nuclear craters are drawn at their estimated true size.
- **Nuka-World, theorized.** The park is off the game map, so it gets its own figure: southern New England with the survey sheet, the game map and the fan-favoured site, Six Flags New England in Agawam, about 66 miles west-southwest of the transit center. The fastest real drive there, 82 miles by the Mass Pike, is drawn on it. The figure and the place card give the reasoning and sources.
- **Places on real ground:** site plans of Diamond City, the Castle, Fort Strong and Hangman's Alley, drawn from OpenStreetMap at true scale.
- **A Pip-Boy screen.** The survey is laid out like the Pip-Boy 3000 Mark IV: SURVEY, SITES, DATA, MAP and SEA tabs in the game's own slot order, quests and workshops under DATA, and a key-hint bar along the bottom. Pick the Pip-Boy colour under Settings: green (the Fallout 4 default), amber (New Vegas), blue or white.
- Miles or kilometres, and links that open on a place: `…/#place=Diamond%20City`.

## Keyboard and accessibility

Everything works from the keyboard, and the keys follow the game where it has one. Press `?` for the full list.

| Keys | Does |
|---|---|
| `1`–`5` | Survey, Sites, Data, Map, Sea |
| `M`, `J` | Map, Data (as in Fallout 4) |
| `A` `D` | Previous or next sub-tab |
| `W` `S` or `↑` `↓` | Move up or down a list; `E` or `Enter` shows the highlighted row on the map |
| On the map: arrows or `W` `A` `S` `D`, `+` `−` | Move the crosshair, zoom |
| On the map: `E`, `Enter` or `Space` | Select the place under the crosshair, drop a pin, or add a measuring point |

The letter and number shortcuts can be turned off under Settings (WCAG 2.1.4), and never fire while you type in a field. Tab, the arrow keys, Enter and Esc always work.

The page aims at WCAG 2.2 AA. Every shade is a mix of the chosen Pip-Boy colour with black, and `npm run check` verifies that each text and control colour pair meets AA contrast for every tint. With one colour on screen, map layers are told apart by line style and texture rather than hue: wetlands by marsh tufts, the Glowing Sea by a hatched band inside its edge, Brotherhood of Steel places by the Brotherhood's emblem and its ground (Logan Airport) by cross-hatching inside a double border, the game map's edge by a dash-dot line. Selections and changes are announced to screen readers. Scanlines and glow can be switched off, and switch off by themselves when your system asks for more contrast.

## Run it

You need [Node.js](https://nodejs.org/) 18 or newer; there is nothing else to install.

```sh
git clone https://github.com/ZippyParakeet097/commonwealth-survey.git
cd commonwealth-survey
npm start          # then open http://localhost:8080
```

Or build the single-file version, `npm run build`, and open `dist/commonwealth-survey.html`. It is the whole tool in one file: it opens straight from disk, works offline (the web fonts fall back to system fonts) and can be shared on its own.

## Use the data

Everything the map shows is in [`data/`](data/), ready for QGIS, Google Earth, a spreadsheet or your own project:

| File | What's in it |
|---|---|
| [`locations.csv`](data/locations.csv) | Every game location with real `lat`/`lon` (WGS 84). One row per place. |
| [`glowing-sea.geojson`](data/glowing-sea.geojson) | The Glowing Sea (in-game and theorized), and both craters with their estimated yields. |
| [`nuka-world.geojson`](data/nuka-world.geojson) | Nuka-World's theorized site, with the reasoning, and the fastest real drive to it from the transit center (82 mi, by the Mass Pike). |
| `basemap.json`, `sites.json`, `plans.json`, `glowing-sea.json`, `region.json` | The map's own drawing data, as SVG paths in sheet kilometres (see below). |

### `locations.csv` columns

| Column | Meaning |
|---|---|
| `name` | The game's name for the place. Several unmarked names repeat (there are many Red Rockets). |
| `label` | Shorter label for the map, if any (`Red Rocket` for `Red Rocket truck stop`). |
| `type` | The game's map-marker type. |
| `marked` | `yes` if it has a marker on the game's map, `no` for unmarked places. |
| `key` | Label priority: `2` always labelled, `1` labelled from a moderate zoom, `0` only up close. |
| `workshop` | For the 30 Minutemen workshop settlements: `Base game`, `Automatron` or `Vault-Tec Workshop`. |
| `faction` | `Brotherhood of Steel` for the Brotherhood's places, marked with the Brotherhood emblem. |
| `game_x`, `game_y` | Position on the game's 2048 × 2048 map grid, origin top-left. |
| `lat`, `lon` | Real-world position. **This is what the map draws.** |
| `position` | How it was placed: `real landmark`, `likely real analogue`, `shares a real site` (e.g. the Institute under CIT), `placed from game clues`, `extrapolated`, or `extrapolated, moved to shore`. |
| `real_counterpart` | The real place, where there is one. |
| `town` | The real town it lands in (marked places only). |
| `glowing_sea` | `yes` if it is inside the in-game Glowing Sea. |
| `note` | A short note shown on the place card, mostly on how the place was sited. |

The map data files use **sheet coordinates**: kilometres in Massachusetts State Plane ([EPSG:26986](https://epsg.io/26986)), measured east and south from the sheet's top-left corner at State Plane E 166,834.74 m, N 948,143.33 m. `js/geo.js` converts both ways.

## How the positions were made

55 game locations have a real counterpart, such as Fenway Park for Diamond City, Fort Independence for the Castle and Scollay Square for Goodneighbor. A thin-plate spline fitted through those pairs, plus 11 fictional sites placed by hand from in-game clues (Hangman's Alley, the Nakano residence and others), moves everything else. Leave-one-out testing puts a typical place within about 0.7 miles of where the anchors say it should be, and none more than about 2.8 miles off. Fictional land sites that the warp dropped into the sea were moved to the nearest shore, and their cards say so.

Fictional positions are interpretations, not canon. If you think a place belongs somewhere else, open an issue or a pull request with your reasoning.

## Contributing

Corrections to positions, real counterparts and notes are the most useful contributions.

1. Edit `data/locations.csv` (any spreadsheet app works; keep the columns as they are).
2. Run `npm run check` to validate it.
3. Open a pull request saying what you changed and why: the in-game evidence, or the real place you matched.

```sh
npm start          # serve at http://localhost:8080
npm run check      # validate data/locations.csv and the palette's contrast
npm run build      # write the single-file version to dist/commonwealth-survey.html
```

Opening `index.html` straight from disk won't work, because browsers block the data requests; use `npm start` or the single-file build.

The code is plain JavaScript modules in `js/` with no build step: `map.js` draws and pans the map, `grid.js` is the scale grid, `measure.js` the route tool, `card.js` the place card, `panels.js` the tables and notes, and `geo.js` the projection and unit formatting.

## Sources and licences

- Town boundaries and hydrography: [MassGIS](https://www.mass.gov/orgs/massgis-bureau-of-geographic-information) (1:25,000).
- Landmark positions, real site outlines and site plans: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. The data derived from OpenStreetMap (`data/sites.json`, `data/plans.json`) is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/).
- Road route to Nuka-World: [OSRM](https://project-osrm.org/) on OpenStreetMap roads.
- Nuka-World figure: coastline from [Natural Earth](https://www.naturalearthdata.com/) (public domain) and US state boundaries from the US Census Bureau, both via the [world-atlas](https://github.com/topojson/world-atlas) and [us-atlas](https://github.com/topojson/us-atlas) packages.
- Terrain: AWS Terrain Tiles (USGS elevation). Winds: Iowa Environmental Mesonet. Crater scaling: Glasstone & Dolan, *The Effects of Nuclear Weapons*.
- Game locations: the game's own location table on the 2048 map grid.

The code is under the [MIT License](LICENSE).

An unofficial fan project, not affiliated with or endorsed by Bethesda Softworks or ZeniMax Media. Fallout is a trademark of ZeniMax Media Inc.
