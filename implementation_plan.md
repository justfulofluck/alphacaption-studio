# Implementation Plan - Transitions Feature

We will add a new "Transitions" styling panel to the right sidebar, allowing users to apply animations to either active caption lines or active highlighted words.

## User Review Required
> [!IMPORTANT]
> The transitions tab will be fully functional inside the editor. The transitions will render in real-time in the video preview player as the captions are played.

## Proposed Changes

### 1. State Hooks & UI Integration in `ReelEditor.tsx`
* Add states:
  * `transitionTarget`: `'LINE' | 'WORD'`
  * `activeTransition`: `'none' | 'fade' | 'pop' | 'zoom' | 'scale' | 'slide-lr' | 'slide-ud'`
  * `transitionSpeed`: `number` (default `70`)
  * `speedMode`: `'manual' | 'auto'`
* Render the `Transitions` tab contents inside the right sidebar:
  * Selection buttons for target (`LINE` vs `WORD`).
  * If `WORD` is selected, show the sub-warning: "Please select one or more words to apply animations".
  * Grid of 7 transition option boxes (None, Fade, Pop, Zoom, Scale, Slide Left/Right, Slide Up/Down) with custom SVG icons matching the design.
  * Speed Mode manual/auto switch.
  * Speed slider and numeric input.
* Pass transition properties down to `<VideoPlayer>` in `ReelEditor.tsx`.

### 2. Preview Animation Logic in `VideoPlayer.tsx`
* Accept the new props: `transitionTarget`, `activeTransition`, `transitionSpeed`.
* Add `key={activeCaption.id}` to the parent caption container element to force re-mounting and re-triggering of line transitions when the active caption segment changes.
* Inject dynamic transition classes/styles:
  * If `transitionTarget === 'LINE'`, apply animation to the caption container.
  * If `transitionTarget === 'WORD'`, apply animation inline to each `wordElement` when `isHighlight` is active.

### 3. CSS Transitions Definition in `index.css`
* Add keyframe animations and utility classes at the bottom of `index.css`:
  * `@keyframes fade-effect`
  * `@keyframes pop-effect`
  * `@keyframes zoom-effect`
  * `@keyframes scale-effect`
  * `@keyframes slide-lr-effect`
  * `@keyframes slide-ud-effect`

## Verification Plan
* Toggle between 'Line' and 'Word' targets.
* Click different transition options (Fade, Pop, Zoom) and verify that the preview player runs them at the chosen speeds.
