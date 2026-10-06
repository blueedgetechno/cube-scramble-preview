# Scramble Preview

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-1f9d55?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](#install)
[![Brave](https://img.shields.io/badge/Brave-supported-FB542B?style=flat-square&logo=brave&logoColor=white)](#install)
[![Edge](https://img.shields.io/badge/Edge-supported-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)](#install)
[![Firefox](https://img.shields.io/badge/Firefox-supported-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white)](#install)
<br />
[![Vanilla JS](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](cube.js)
[![No dependencies](https://img.shields.io/badge/dependencies-none-1f9d55?style=flat-square)](manifest.json)
[![Puzzle 3x3](https://img.shields.io/badge/puzzle-3x3-e3191f?style=flat-square)](#use)
[![GitHub stars](https://img.shields.io/github/stars/blueedgetechno/cube-scramble-preview?style=flat-square&logo=github)](https://github.com/blueedgetechno/cube-scramble-preview/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/blueedgetechno/cube-scramble-preview?style=flat-square)](https://github.com/blueedgetechno/cube-scramble-preview/commits)

Browser extension (Chrome / Brave / Edge / Firefox, Manifest V3) that reads a 3x3 scramble from the current page and shows the scrambled cube as an unfolded net (U on top, L F R B across, D below; white top, green front). Use it to check that you scrambled your cube correctly before you start solving.

For example, you can use it on [rubikstrainer.com/cross2f2l](https://www.rubikstrainer.com/cross2f2l). The scramble there is picked up automatically, with no selector needed.

To see what it does, open [docs/index.html](docs/index.html) in a browser. It has a demo of the popup and a scramble playground.

<p align="center">
  <img src="screenshots/preview.png" alt="Cube preview for a detected scramble" width="360" />
</p>

| Not enabled | Settings |
| :---: | :---: |
| <img src="screenshots/disabled.png" alt="Popup when the extension is not enabled on a site" width="300" /> | <img src="screenshots/settings.png" alt="Settings panel with site toggle and CSS selector" width="300" /> |

## Install

1. Clone the repository (or [download it from GitHub](https://github.com/blueedgetechno/cube-scramble-preview)):
   ```sh
   git clone https://github.com/blueedgetechno/cube-scramble-preview.git
   ```
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the cloned folder.
4. Pin the extension to the toolbar if you like.

**Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…** and choose `manifest.json`. Temporary add-ons are removed when Firefox restarts.

## Use

Works on sites such as [rubikstrainer.com/cross2f2l](https://www.rubikstrainer.com/cross2f2l) and other timers or trainers that show the scramble as text.

- Every site is **off by default**. Open the popup and turn on the toggle under "Not Enabled" to enable it for the current site (saved per hostname). To turn it off again, use the toggle at the top of the ⚙ settings panel.
- Once enabled, the scramble is detected automatically and the cube preview is shown. While the popup is open it re-checks the page every 1.5 s, so a new scramble shows up on its own.
- Click the scramble text to edit it by hand. Click ↻ to read it from the page again.
- Click ⚙ to set a **CSS selector** for the current site (for example `#scramble`). You can also click **Pick on page** and then click the scramble text on the page. Click **Auto** to go back to auto-detection.

Supported notation: `R U F L D B` with `'`, `2` and `3`, wide moves (`Rw`, `r`), slice moves (`M E S`) and rotations (`x y z`).

Auto-detection first looks at visible elements whose id or class contains "scramble". If none match, it uses the longest line of page text that is mostly moves.
