/**
 * Central branding configuration. Change the product name, tagline, and logo here.
 * The logo is rendered by <Logo /> (src/components/Logo.tsx). Set `logoSrc` to an image in /public
 * to replace the built-in mark.
 */
export const brand = {
  name: "TrueDraft",
  /** Used in <title> suffixes and emails. */
  shortName: "TrueDraft",
  tagline: {
    en: "Your story. Your voice. Clearer feedback.",
    "zh-CN": "你的故事，你的声音。更清晰、更透明的文书反馈。",
  },
  /** Optional path to a logo image under /public, e.g. "/brand/logo.svg". Leave null to use the built-in mark. */
  logoSrc: null as string | null,
  /** Contact shown in the Privacy Center. Configure via env so it is deployment-specific. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
  /** Operating entity shown in privacy text. Configure via env. */
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || null,
} as const;
