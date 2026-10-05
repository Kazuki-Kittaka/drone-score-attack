import { Howl } from "howler";
import type { Settings } from "./model";
export type Cue =
  | "hover"
  | "click"
  | "countdown"
  | "start"
  | "stop"
  | "finish"
  | "rank-in"
  | "new-record";
const files = import.meta.glob("./assets/sounds/*.{wav,mp3,ogg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const sounds = new Map<string, Howl>();
function get(name: string, loop = false) {
  const file = Object.entries(files).find(
    ([p]) => p.split("/").pop()?.split(".")[0] === name,
  )?.[1];
  if (!file) return;
  let h = sounds.get(name);
  if (!h) {
    h = new Howl({ src: [file], loop });
    sounds.set(name, h);
  }
  return h;
}
export function cue(name: Cue, s: Settings) {
  if (!s.se) return;
  try {
    const h = get(name);
    if (h) {
      h.volume(s.seVolume);
      h.play();
    }
  } catch {
    /* audio never blocks controls */
  }
}
export function bgm(on: boolean, s: Settings) {
  try {
    const h = get("bgm", true);
    if (!h) return;
    h.volume(s.bgmVolume);
    if (on && s.bgm) {
      if (!h.playing()) h.play();
    } else h.stop();
  } catch {
    /* optional */
  }
}
