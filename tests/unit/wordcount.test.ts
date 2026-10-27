import { describe, expect, it } from "vitest";
import { countWords } from "@/lib/wordcount";

describe("countWords", () => {
  it.each([
    ["", 0],
    ["   \n\t ", 0],
    ["One two three.", 3],
    ["I can't stop—really, I can't.", 6],
    ["A well-known e-mail address", 4],
    ["Numbers like 2019 and 3.5 count", 6],
    ["我喜欢写作", 5],
    ["我在 night market 帮忙", 6],
    ["Line one\n\nLine two", 4],
  ])("counts %j as %i", (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});
