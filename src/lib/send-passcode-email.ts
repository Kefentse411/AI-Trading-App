import { Resend } from "resend";
import { passcodeHtml, passcodeText } from "./email-template";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasscodeEmail({ to, code }: { to: string; code: string }) {
  const from = process.env.EMAIL_FROM || "AlgoEdge Pro <onboarding@resend.dev>";
  const subject = "Your AlgoEdge Pro Verification Code";
  const html = passcodeHtml({ code });
  const text = passcodeText({ code });

  // Dev fallback: if no email provider configured
  if (!process.env.RESEND_API_KEY && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    console.log(`[DEV CODE] Passcode for ${to}: ${code}`);
    return { ok: true as const, provider: "dev" as const, devCode: code };
  }

  // Try Resend first
  if (resend && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from,
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
        from,
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

  // Final dev fallback (never crash the app)
  console.log(`[DEV FALLBACK] Passcode for ${to}: ${code}`);
  return { ok: true as const, provider: "dev" as const, devCode: code };
}