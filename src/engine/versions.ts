import type { Level, Purpose } from "../types";

export const GENERATOR_VERSION = 5;
export const PACER_VERSION = 1;

export const CURRENT_VERSIONS = Object.freeze({
  generator: GENERATOR_VERSION,
  pacer: PACER_VERSION,
});

export function tagGeneratedLevel(level: Level, purpose: Purpose): Level {
  return {
    ...level,
    generation: {
      generatorVersion: GENERATOR_VERSION,
      pacerVersion: PACER_VERSION,
      purpose,
    },
  };
}
