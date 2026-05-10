# Settings UI Notes

SettingsScene is currently a shell for preferences that can be wired into full localization and audio systems later. It intentionally does not play audio, load audio files, or translate game text yet.

## Language dropdown

- The language control is a dropdown/select-style menu instead of separate language buttons.
- Current options are:
  - English (`en`)
  - Polish (`pl`)
- The selected language is saved locally so the shell can restore the choice after a browser refresh.
- Future languages should be added by extending the SettingsScene language option list rather than adding new one-off buttons.

## Audio controls

- Audio preferences are split into separate slider-style controls:
  - Music Volume
  - SFX Volume
- Each slider displays its value as a percentage, for example `50%`.
- The mute control is a row-style toggle with a unified, vector-drawn speaker icon and text label:
  - `Sound Enabled` means audio is active.
  - `Sound Muted` means audio is muted and uses the same speaker icon crossed by a slash.
- The full toggle row remains tappable, and these controls update visual state only. They are placeholders for a future audio system and should not be treated as proof that playback exists.

## Persistence

SettingsScene stores the following preferences in `localStorage` when browser storage is available:

- `language`
- `musicVolume`
- `sfxVolume`
- `muted`

If local storage is unavailable or blocked, SettingsScene falls back to in-memory defaults for the current session.

## Future audio asset paths

Reserve these folders for eventual audio content:

- `public/assets/audio/music/`
- `public/assets/audio/sfx/`

Do not add audio files until the project intentionally implements playback, loading, and licensing rules for audio assets.
