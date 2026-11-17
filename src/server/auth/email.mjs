import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
export function mailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM;
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('SMTP configuration is required');
  const local = process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost'].includes(host);
  if (!local && (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD))
    throw new Error('SMTP credentials are required');
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: !local,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}
export async function sendStaffCode(email, code) {
  const message = {
    from: process.env.SMTP_FROM || process.env.SES_FROM,
    to: email,
    subject: 'Moretti Forni · Marketing Studio access code',
    text: `Il tuo codice di accesso / Your access code: ${code}\n\nValido per 10 minuti, utilizzabile una sola volta. Non condividere questo codice.\nValid for 10 minutes, single use. Do not share this code.\n\nSe non hai richiesto l’accesso, ignora questa email.\nIf you did not request access, ignore this email.`,
  };
  if (process.env.RTSM_MAIL_PROVIDER === 'ses') {
    if (!process.env.SES_FROM || !(process.env.RTSM_AWS_REGION || process.env.AWS_REGION))
      throw new Error('SES_FROM and AWS_REGION are required');
    const client = new SESv2Client({
      region: process.env.RTSM_AWS_REGION || process.env.AWS_REGION,
    });
    try {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: process.env.SES_FROM,
          Destination: { ToAddresses: [email] },
          Content: {
            Simple: {
              Subject: { Data: message.subject, Charset: 'UTF-8' },
              Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
            },
          },
        }),
      );
      return;
    } finally {
      client.destroy();
    }
  }
  const result = await mailTransport().sendMail({
    ...message,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  if (!result.accepted?.length) throw new Error('Email delivery not accepted');
}
