import { SFCBlock } from "vue-template-compiler";

export const getReplacer = (input: string, script: SFCBlock) => {
  const { start, end } = script;
  // @TODO
  if (start == null || end == null) throw new Error("Something went wrong.");
  return getReplacerByCursor(input, start, end);
};

const getReplacerByCursor =
  (input: string, start: number, end: number) =>
  (script: string): string => {
    const before = input.substring(0, start);
    const after = input.substring(end);

    return `${before}${script}${after}`;
  };
