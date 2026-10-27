import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import zhCN from "@/i18n/messages/zh-CN";
import { createTranslator, interpolate } from "@/i18n/translate";
import { isLocale, LOCALES } from "@/i18n/config";

function shape(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [`${path}:string`];
  if (Array.isArray(value)) return [`${path}:array(${value.length})`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}:${typeof value}`];
}

function placeholders(value: unknown, path = ""): Record<string, string[]> {
  if (typeof value === "string") return { [path]: (value.match(/\{\w+\}/g) ?? []).sort() };
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [k, v]) => ({ ...acc, ...placeholders(v, path ? `${path}.${k}` : k) }), {});
  }
  return {};
}

describe("localization", () => {
  it("Simplified Chinese has exactly the same message structure as English", () => {
    expect(shape(zhCN)).toEqual(shape(en));
  });

  it("every translation keeps the same placeholders", () => {
    const a = placeholders(en);
    const b = placeholders(zhCN);
    for (const key of Object.keys(a)) expect(b[key], key).toEqual(a[key]);
  });

  it("has no empty strings", () => {
    const empties = shape(zhCN).length && JSON.stringify(zhCN).includes('""');
    expect(empties).toBe(false);
  });

  it("translates and interpolates", () => {
    expect(createTranslator("en").t("common.wordsOfLimit", { count: 10, limit: 650 })).toBe("10 / 650 words");
    expect(createTranslator("zh-CN").t("nav.privacy")).toBe("隐私中心");
    expect(interpolate("{brand} rocks")).toBe("TrueDraft rocks");
  });

  it("supports exactly the configured locales", () => {
    expect(LOCALES).toEqual(["en", "zh-CN"]);
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
