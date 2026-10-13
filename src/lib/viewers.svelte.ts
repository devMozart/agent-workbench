/**
 * What each session had in the viewer, kept while the user is elsewhere and
 * put back when they return: the file, its view and the place marked in
 * it, what the agent presented, a plugin's page, the browser, or nothing.
 * Switching sessions shows the one switched to as it was left, so a
 * document open beside one session is still open when the user comes back
 * to it, and the viewer is closed for a session that had nothing in it,
 * and opened again for one that had, as a file opened there would.
 */

import { tick } from "svelte";
import type { MediaItem } from "$lib/media.svelte";
import { browser } from "$lib/browser.svelte";
import {
  closeViewer,
  files,
  select,
  setScope,
  showBrowser,
  showMedia,
  showPluginView,
  type View,
} from "$lib/files.svelte";
import { enterReview, layout } from "$lib/layout.svelte";
import { byKey } from "$lib/sessions.svelte";
import { workspace } from "$lib/workspace.svelte";

export type Viewed =
  | {
      kind: "file";
      project: string;
      path: string;
      view: View;
      target: NonNullable<typeof files.target> | null;
      picked: NonNullable<typeof files.picked> | null;
    }
  | { kind: "media"; project: string; item: MediaItem }
  | {
      kind: "plugin";
      project: string;
      page: NonNullable<typeof files.pluginView>;
    }
  | { kind: "browser"; project: string }
  | null;

const viewed = new Map<string, Viewed>();

/** The session whose viewer is on screen. */
let shown: string | null = null;

/** What the viewer holds right now, as the session on screen will get it
    back: null for nothing, and for the viewer closed. */
export function snapshot(): Viewed {
  const project = workspace.active;
  if (project === null || layout.mode !== "reviewing") return null;
  if (files.media !== null) return { kind: "media", project, item: files.media };
  if (files.pluginView !== null)
    return { kind: "plugin", project, page: files.pluginView };
  if (browser.showing) return { kind: "browser", project };
  if (files.selected === null) return null;
  return {
    kind: "file",
    project,
    path: files.selected,
    view: files.view,
    target: files.target?.path === files.selected ? files.target : null,
    picked: files.picked?.path === files.selected ? files.picked : null,
  };
}

/** Puts a session's viewer back, closed when it had nothing. Waits a tick
    first, since the switch may have moved the project and the tree clears
    itself on that. The keyboard stays where picking the session put it:
    this is the viewer coming back, not a file being opened. */
async function restore(what: Viewed) {
  await tick();
  if (what === null) {
    closeViewer();
    return;
  }
  if (what.project !== workspace.active) return;
  const focus = layout.focus;
  if (what.kind === "media") {
    showMedia(what.item);
  } else if (what.kind === "plugin") {
    showPluginView(what.page);
  } else if (what.kind === "browser") {
    showBrowser();
  } else {
    if (
      files.scope !== "all" &&
      !files.changed.some((file) => file.path === what.path)
    ) {
      await setScope("all");
    }
    files.view = what.view;
    files.target = what.target;
    await select(what.path);
    files.picked = what.picked;
    enterReview();
  }
  layout.focus = focus;
}

/** The user switched to a session: what the one they left had is kept,
    and what this one had comes back. Resolves once it is on screen. */
export async function sessionShown(key: string | null) {
  if (shown !== null && shown !== key) viewed.set(shown, snapshot());
  for (const stale of viewed.keys()) {
    if (byKey(stale) === null) viewed.delete(stale);
  }
  const was = shown;
  shown = key;
  if (key === null || key === was) return;
  await restore(viewed.get(key) ?? null);
}

/** Test seam. */
export function resetViewers() {
  viewed.clear();
  shown = null;
}
