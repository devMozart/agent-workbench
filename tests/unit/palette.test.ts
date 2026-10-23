import { beforeEach, describe, expect, it, vi } from "vitest";
import { attention } from "$lib/attention.svelte";
import { chordFor, describe as spell, resetKeys } from "$lib/keys.svelte";
import {
  ATTENTION_LABEL,
  closePalette,
  matches,
  openPalette,
  palette,
  paletteItems,
} from "$lib/palette.svelte";
import { create, exact, reset, select, started } from "$lib/sessions.svelte";

vi.mock("$lib/core", () => ({
  core: () => ({
    kill: async () => {},
    setBadge: async () => {},
  }),
}));

const A = "/home/ada/dev/one";
const B = "/home/ada/dev/two";

beforeEach(() => {
  reset();
  resetKeys();
  closePalette();
  attention.focused = true;
});

describe("matching", () => {
  it("takes every word, in any order and any case", () => {
    expect(matches("Show or hide the terminal", "TERM hide")).toBe(true);
    expect(matches("Show or hide the terminal", "term shell")).toBe(false);
    expect(matches("anything", "   ")).toBe(true);
  });
});

describe("opening", () => {
  it("starts with an empty field", () => {
    palette.query = "left over";
    openPalette();
    expect(palette.open).toBe(true);
    expect(palette.query).toBe("");
  });
});

describe("what the palette lists", () => {
  it("is the jump first, then the sessions, then the actions", () => {
    create(A);
    create(B);
    const items = paletteItems("");
    expect(items[0]).toMatchObject({ kind: "attention", label: ATTENTION_LABEL });
    expect(items.slice(1, 3).map((item) => item.kind)).toEqual(["session", "session"]);
    expect(items.slice(3).every((item) => item.kind === "action")).toBe(true);
  });

  it("leaves out the palette itself and the jump's own action", () => {
    const actions = paletteItems("").flatMap((item) => (item.kind === "action" ? [item.action] : []));
    expect(actions).not.toContain("palette");
    expect(actions).not.toContain("session.attention");
    expect(actions).toContain("zoom.in");
  });

  it("finds a session by its project and an action by its words", () => {
    create(A);
    create(B);
    expect(
      paletteItems("two").map((item) => (item.kind === "session" ? item.detail : item.label)),
    ).toEqual(["two"]);
    expect(paletteItems("terminal zoom").map((item) => item.label)).toEqual([
      "Zoom the terminal in",
      "Zoom the terminal out",
      "Reset the terminal's zoom",
    ]);
  });

  it("shows each action's chord", () => {
    const item = paletteItems("open settings").find((candidate) => candidate.kind === "action");
    expect(item?.kind === "action" && item.chord).toBe(spell(chordFor("settings")));
  });

  it("counts the sessions waiting on the user", () => {
    attention.focused = false;
    const first = create(A);
    started(first.key, "pty-1", "session-pty-1");
    exact("session-pty-1", "stop");
    create(B);
    expect(paletteItems("")[0]).toMatchObject({ kind: "attention", waiting: 1 });
    select(first.key);
    expect(paletteItems("")[0]).toMatchObject({ kind: "attention", waiting: 0 });
  });
});
