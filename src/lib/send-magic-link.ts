import { magicLinkHtml, magicLinkText } from "./email-template";

export async function sendMagicLinkEmail({
  to,
  magicUrl
}: {
  to: string;
  magicUrl: string;
}) {
  const subject = "Sign in to AlgoEdge Pro";
  const html = magicLinkHtml({ magicUrl, email: to });
  const text = magicLinkText({ magicUrl, email: to });

  // Dev fallback: if no email provider configured
  if (!process.env.RESEND_API_KEY && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    console.log(`[DEV MAGIC LINK] for ${to}:\n${magicUrl}`);
    return { ok: true as const, provider: "dev" as const, devUrl: magicUrl };
  }

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "AlgoEdge Pro <onboarding@resend.dev>",
        to,
        subject,
        html,
        text,
      });

      return { ok: true as const, provider: "resend" as const };
    } catch (err) {
      console.error("Resend send failed:", (err as Error)?.message || err);
      // Fall through to SMTP
    }
  }

  // Try SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text,
      });

      return { ok: true as const, provider: "smtp" as const };
    } catch (err) {
      console.error("SMTP send failed:", (err as Error)?.message || err);
    }
  }

  // Final dev fallback
  console.log(`[DEV FALLBACK] Magic link for ${to}:\n${magicUrl}`);
  return { ok: true as const, provider: "dev" as const, devUrl: magicUrl };
}
