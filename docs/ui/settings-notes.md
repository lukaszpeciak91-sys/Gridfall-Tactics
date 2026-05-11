# Settings UI Notes

SettingsScene is currently a shell for preferences that can be wired into full localization and audio systems later. It intentionally does not play audio, load audio files, or translate game text yet.

## Language dropdown

- The language control is a dropdown/select-style menu instead of separate language buttons.
- Current options are:
  - English (`en`)
  - Polish (`pl`)
- The selected language is saved locally so the shell can restore the choice after a browser refresh.
- The language dropdown is the source of truth for the active locale exposed by `src/localization/localeService.js`.
- The locale service currently supports `en` and `pl`, normalizes invalid values back to `en`, and reuses the existing SettingsScene storage object instead of creating a separate localization key.
- Future languages should be added to the locale service supported-locale list and given a SettingsScene label rather than adding new one-off buttons.

## Audio controls

- Audio preferences are split into separate slider-style controls:
  - Music Volume
  - SFX Volume
- Each slider displays its value as a percentage, for example `50%`.
- The mute control is a compact icon button centered directly below the `AUDIO` title and above the sliders so it reads as the master audio toggle.
- The unmuted state draws a speaker icon; the muted state draws a crossed speaker icon with a subtle active highlight so the muted preference is immediately readable.
- The taller audio panel gives the mute control and sliders balanced top, middle, and bottom padding without crowding the controls or leaving excessive empty space above the bottom navigation.
- Sliders and the mute button remain visible and keep their stored values. These controls update visual state only; they are placeholders for a future audio system and should not be treated as proof that playback exists.

## Persistence

SettingsScene stores the following preferences in `localStorage` under `gridfall:tactics:settings:v1` when browser storage is available:

- `language`
- `musicVolume`
- `sfxVolume`
- `muted`

If local storage is unavailable or blocked, SettingsScene falls back to in-memory defaults for the current session. The locale service reads and writes the same settings object so the Settings language option remains the active-locale source of truth.

## Localization foundation

- Full UI translation dictionaries are not implemented yet; do not add `pl.json` until the project intentionally starts broad text localization.
- General UI strings and card effect text remain English.
- Existing Polish presentation metadata is active for card and faction names when the selected locale is `pl`; missing Polish presentation names fall back to English presentation names, then source gameplay names.

## Future audio asset paths

Reserve these folders for eventual audio content:

- `public/assets/audio/music/`
- `public/assets/audio/sfx/`

Do not add audio files until the project intentionally implements playback, loading, and licensing rules for audio assets.
