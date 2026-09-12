# Responsive authoring

The shared shell and admin navigation are described in [Administration settings navigation](28_admin_settings_navigation.md). The compact-navigation breakpoint is 900 CSS pixels; `100dvh` and flex minimum sizes account for browser chrome and keep independent scroll regions usable.

## Editor

`EditorCanvas` owns the live formatting toolbar. Below 900 pixels it uses `flex-wrap: nowrap`, a bounded width, horizontal overflow, and non-shrinking controls. The toolbar has a keyboard focus target and an accessible label that describes sideways navigation. Touch controls are at least 44 pixels. Desktop toolbar wrapping is unchanged. Page titles use an autosizing multiline field, retaining the 28/36-pixel title scale and Enter-to-focus-editor behavior. Mobile decorative background glows are omitted because their absolute dimensions previously widened the editor's scrollable area.

`EditorHeader` retains primary actions and visible Edit/Done labels on phones. Secondary history, analytics, and watch controls move into the page-actions menu. The menu itself remains available to readers, while its original mutation entries remain disabled unless `canEdit` is true. Its existing deleted-page restriction remains in place. This does not change server authorization. Desktop secondary controls remain visible.

`CommentDrawer` changes from persistent desktop navigation to a temporary mobile drawer. The desktop paper is positioned relative to its flex region instead of using a hard-coded top offset. Mobile paper is capped to the viewport, handles safe-area/classification offsets, and uses MUI backdrop, focus, and Escape behavior.

`DocumentPage` supplies no collaboration token to `EditorCanvas` only when explicitly rendered in mock mode. This enables local component/UI authoring checks without waiting for a nonexistent mock WebSocket server. Authenticated production pages continue to wait for synchronization readiness. Mock UI checks do not replace real multi-replica synchronization tests.

## Forms and controls

The mobile CSS rule raises native and MUI text-entry controls to 16 pixels to avoid automatic zoom on iOS. `touch-action: manipulation` applies to controls while retaining pinch zoom. `TopNavbar` uses semantic buttons for the account and home controls, labelled navigation/search controls, and router navigation instead of full-document reloads.

Admin forms use responsive grids and local table-scroll regions. Color styling continues to come from theme variables; the theme chooser intentionally previews each preset's own colors. No mobile stylesheet supplies a separate fixed light/dark palette.

## Verification

Frontend unit tests cover route-based admin/sidebar substitution, keyboard and pointer navigation, focus restoration, mobile search, and pending-save behavior. Bounded browser verification uses mock data to inspect phone, tablet, and desktop widths, route/content overflow, editing controls, and light/dark theme presets. The temporary verification server and entry point are removed afterward.

See [mobile user instructions](../user_guide/mobile.md).
