import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { brand } from "@/config/brand";
import { logger } from "./logger";

/**
 * Email delivery for sign-in links.
 * EMAIL_TRANSPORT:
 *   smtp    – production; requires SMTP_URL and EMAIL_FROM
 *   console – development only; prints the sign-in link to the server console
 *   file    – automated tests only; writes the latest link per address to .dev-mailbox/
 */
type Transport = "smtp" | "console" | "file";

function transportKind(): Transport {
  const raw = process.env.EMAIL_TRANSPORT;
  if (raw === "smtp" || raw === "console" || raw === "file") return raw;
  return process.env.NODE_ENV === "production" ? "smtp" : "console";
}

export function mailboxFileFor(email: string) {
  const safe = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  return path.join(process.cwd(), ".dev-mailbox", `${safe}.json`);
}

function renderMagicLink(url: string, locale: string) {
  const zh = locale === "zh-CN";
  const subject = zh ? `登录 ${brand.name}` : `Sign in to ${brand.name}`;
  const intro = zh
    ? `点击下面的链接登录 ${brand.name}。链接 15 分钟内有效，且只能使用一次。`
    : `Use the link below to sign in to ${brand.name}. It expires in 15 minutes and can be used once.`;
  const ignore = zh
    ? "如果这不是你本人的操作，可以忽略这封邮件。"
    : "If you did not request this, you can ignore this email.";
  const text = `${intro}\n\n${url}\n\n${ignore}`;
  const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const html = `<p>${intro}</p><p><a href="${escapedUrl}">${zh ? "登录" : "Sign in"}</a></p><p style="color:#555">${ignore}</p>`;
  return { subject, text, html };
}

export async function sendMagicLinkEmail(email: string, url: string, locale: string) {
  const kind = transportKind();
  const message = renderMagicLink(url, locale);

  if (kind === "console") {
    if (process.env.NODE_ENV === "production") {
      logger.warn("email.console_transport_in_production");
    }
    // Development convenience only. The link is a credential, never essay content.
    console.info(`\n[dev email] Sign-in link for ${email}:\n${url}\n`);
    return;
  }

  if (kind === "file") {
    const file = mailboxFileFor(email);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ to: email, url, sentAt: new Date().toISOString() }));
    return;
  }

  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;
  if (!smtpUrl || !from) {
    logger.error("email.smtp_not_configured");
    throw new Error("Email delivery is not configured");
  }
  const transporter = nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({ from, to: email, ...message });
  logger.info("email.magic_link_sent");
}
