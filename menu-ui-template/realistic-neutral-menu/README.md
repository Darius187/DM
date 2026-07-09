# Realistic Neutral Medieval Menu Prototype

This is a portable UI prototype for the more realistic 1300/1400 settings menu direction.

Open:

`C:\Obsidian\DM\menu-ui-template\realistic-neutral-menu\index.html`

Reference image:

`C:\Obsidian\DM\menu-ui-template\realistic-neutral-1300-1400-settings-template.png`

## What is flexible

- Labels and rows are data-driven in `menu.js`.
- Tabs can be added or removed in the `tabs` array.
- Values and keybinds live in the `defaults` object.
- Colors, spacing, materials, and responsive behavior live in `styles.css`.
- The generated PNG is only a visual reference. The actual menu is not baked into one image.

## Integration Notes

For a DOM-based game UI, this can be used almost directly.

For Phaser, port the same structure into a UI Scene:

- `SettingsMenu`
- `SettingsTabButton`
- `SettingsSection`
- `MedievalSlider`
- `MedievalToggle`
- `MedievalSelect`
- `KeybindButton`
- `MenuActionButton`

Keep the visual rules from `styles.css`: parchment panel, dark wood frame, iron corners, leather tabs, neutral background, no fantasy glow.
