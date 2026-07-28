import nodemailer from "nodemailer";
import { APPLICATION_EMAILS } from "./application-templates";

export type ApplicationEmailType =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendApplicationStatusEmail(
  email: string,
  type: ApplicationEmailType
) {
  const template = APPLICATION_EMAILS[type];

  if (!template) {
    return {
      success: false,
      error: `Invalid status: ${type}`,
    };
  }

  try {
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("SMTP_PORT:", process.env.SMTP_PORT);
    console.log("SMTP_USER:", process.env.SMTP_USER);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: template.subject,
      html: template.html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send email",
    };
  }
}