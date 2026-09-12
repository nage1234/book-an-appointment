import nodemailer, { type Transporter } from 'nodemailer';

const CANCELLATION_BODY =
  'Due to unforeseen circumstances, the booking is cancelled. We are extremely ' +
  'sorry for the inconvenience caused. Please book another available slot, or for ' +
  'anything urgent, please call us.';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null; // dev: no SMTP → log instead
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Best-effort — a failure is logged, never thrown (the cancellation still stands). */
export async function sendCancellationEmail(to: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email → ${to}] Appointment cancelled: ${CANCELLATION_BODY}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_USER ?? 'clinic@example.com',
      to,
      subject: 'Your appointment has been cancelled',
      text: CANCELLATION_BODY,
    });
  } catch (err) {
    console.error(`Cancellation email to ${to} failed:`, (err as Error).message);
  }
}

/** CR-1: forgot-password sends a freshly generated password, not a reset link. */
export async function sendNewPasswordEmail(to: string, newPassword: string): Promise<void> {
  const body =
    `Your password has been reset. Your new temporary password is: ${newPassword}\n\n` +
    `Please sign in with it, then change it from the profile menu on your dashboard.`;
  const t = getTransporter();
  if (!t) {
    console.log(`[email → ${to}] ${body}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_USER ?? 'clinic@example.com',
      to,
      subject: 'Your new password',
      text: body,
    });
  } catch (err) {
    console.error(`New-password email to ${to} failed:`, (err as Error).message);
  }
}
