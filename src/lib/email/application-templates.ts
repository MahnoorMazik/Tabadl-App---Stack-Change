import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "public", "logo-horizontal.png");

const logoBuffer = fs.readFileSync(logoPath);
const logoBase64 = logoBuffer.toString("base64");
const logoContentType = "image/png";
const logoCID = "logo@tabadlalkon.com";

const logoSrc = `cid:${logoCID}`;

export const LOGO_ATTACHMENT = {
  filename: "logo-horizontal.png",
  content: logoBuffer,
  cid: logoCID,
  contentType: logoContentType,
};

const brandPrimaryColor = "#0B6B37";
const brandSecondaryColor = "#14532d";

const formatDateTime = (date: Date) => {
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} at ${timePart}`;
};

// ✅ UPDATED: Support all status types
type StatusType = "SUBMITTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "HARD_COPY_REQUIRED" | "APPROVED" | "REJECTED" | "COMPLETED";

const createApplicationEmail = ({
  heading,
  intro,
  detailRows,
  footerNote,
  clientName,
  isNewThread = true,
  statusType = "SUBMITTED",
}: {
  heading: string;
  intro: string;
  detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
  footerNote: string;
  clientName?: string;
  isNewThread?: boolean;
  statusType?: StatusType;
}) => {
  let detailRowsHtml = "";

  // Build greeting based on status
  const getGreetingAndOpening = () => {
    const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";

    let openingLines = "";

    switch (statusType) {
      case "SUBMITTED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            Thank you for choosing Tabadl Alkon. We are delighted to confirm that we have received your application.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            Our team has begun the initial review process and we will keep you updated on the progress.
          </p>
        `;
        break;

      case "IN_PROGRESS":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We are writing to provide you with an update on your application status.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            Our team is currently working on your application and we appreciate your patience during this process.
          </p>
        `;
        break;

      case "UNDER_REVIEW":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            Your application is now under review by our specialized team.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            We are carefully evaluating all submitted documents and will notify you once the review is complete.
          </p>
        `;
        break;

      case "HARD_COPY_REQUIRED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We require physical copies of certain documents to proceed with your application.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            Please submit the required hard copies to our office at your earliest convenience.
          </p>
        `;
        break;

      case "APPROVED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We are pleased to inform you that your application has been approved!
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            Congratulations on this milestone. Our team will now proceed with the next steps.
          </p>
        `;
        break;

      case "REJECTED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We regret to inform you that your application was not approved at this time.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            We understand this may be disappointing, and we encourage you to reach out to our support team for detailed feedback.
          </p>
        `;
        break;

      case "COMPLETED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            Congratulations! Your application has been successfully completed.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            We are happy to have been able to assist you with your request. Thank you for choosing Tabadl Alkon.
          </p>
        `;
        break;

      default:
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            ${intro}
          </p>
        `;
    }

    return { greeting, openingLines };
  };

  const { greeting, openingLines } = getGreetingAndOpening();

  // Build greeting HTML
  const greetingHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;font-weight:600;">
            ${greeting}
          </p>
          ${openingLines}
        </td>
      </tr>
    </table>
  `;

  // Build detail rows with proper padding
  if (clientName) {
    detailRowsHtml += `
      <tr>
        <td style="padding:16px 12px;color:#334155;font-weight:600;width:40%;border-bottom:1px solid #e9f1f7;border-top-left-radius:12px;font-size:14px;">Client</td>
        <td style="padding:16px 12px;color:#0f172a;font-weight:700;text-align:right;width:60%;border-bottom:1px solid #e9f1f7;border-top-right-radius:12px;font-size:14px;">${clientName}</td>
      </tr>
    `;
  }

  detailRows.forEach((row, index) => {
    const isLastRow = index === detailRows.length - 1;
    const borderStyle = isLastRow ? "" : "border-bottom:1px solid #e9f1f7;";

    const bottomRadius = isLastRow ? "border-bottom-left-radius:12px;" : "";
    const bottomRadiusRight = isLastRow
      ? "border-bottom-right-radius:12px;"
      : "";

    let valueDisplay = row.value;
    if (row.label === "Current Status") {
      const displayValue = row.value.toLowerCase();
      
      // Determine color based on status
      let statusColor = "#0B6B37"; // default green
      if (displayValue.includes('approved') || displayValue.includes('completed')) {
        statusColor = "#0B6B37"; // green
      } else if (displayValue.includes('rejected')) {
        statusColor = "#dc2626"; // red
      } else if (displayValue.includes('progress') || displayValue.includes('review')) {
        statusColor = "#f59e0b"; // yellow/amber
      } else if (displayValue.includes('pending') || displayValue.includes('submitted')) {
        statusColor = "#3b82f6"; // blue
      } else if (displayValue.includes('hard copy')) {
        statusColor = "#8b5cf6"; // purple
      }

      valueDisplay = `<span style="display:inline-block;background:${statusColor};color:#ffffff;padding:6px 18px;border-radius:999px;font-size:13px;font-weight:700;">${row.value}</span>`;
    }

    detailRowsHtml += `
      <tr>
        <td style="padding:16px 12px;color:#334155;font-weight:600;width:40%;${borderStyle}${bottomRadius}font-size:14px;">${row.label}</td>
        <td style="padding:16px 12px;color:#0f172a;font-weight:700;text-align:right;width:60%;${borderStyle}${bottomRadiusRight}font-size:14px;">${valueDisplay}</td>
      </tr>
    `;
  });

  const threadId = isNewThread
    ? `new-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    : "";

  // Get dynamic "What happens next" content based on status
  const getNextSteps = () => {
    switch (statusType) {
      case "SUBMITTED":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Our team will review your application</li>
            <li>You will receive a status update within 2-3 business days</li>
            <li>Check your email for further instructions</li>
          </ul>
        `;
      case "IN_PROGRESS":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Our team is actively working on your application</li>
            <li>You will be notified once the review is complete</li>
            <li>Additional information may be requested if needed</li>
          </ul>
        `;
      case "UNDER_REVIEW":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Your application is being thoroughly reviewed</li>
            <li>We will contact you if any additional documents are needed</li>
            <li>You will receive the final decision within 5-7 business days</li>
          </ul>
        `;
      case "HARD_COPY_REQUIRED":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Submit hard copies to our office address</li>
            <li>Once received, we will continue the processing</li>
            <li>Contact us for office address and timings</li>
          </ul>
        `;
      case "APPROVED":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Our team will initiate the next steps</li>
            <li>You will receive further instructions via email</li>
            <li>Contact us if you need any clarification</li>
          </ul>
        `;
      case "REJECTED":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Contact our support team for detailed feedback</li>
            <li>Review the requirements and reapply if needed</li>
            <li>We're here to help you with your next application</li>
          </ul>
        `;
      case "COMPLETED":
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Your application process is now complete</li>
            <li>Check your email for final documentation</li>
            <li>We look forward to serving you again in the future</li>
          </ul>
        `;
      default:
        return `
          <ul style="margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:2;">
            <li>Review the latest status</li>
            <li>Wait for the next notification</li>
          </ul>
        `;
    }
  };

  const nextSteps = getNextSteps();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Application Status Update</title>
      <meta name="format-detection" content="telephone=no">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <style>
        /* All your existing CSS styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          background-color: #f5f5f5 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: 100% !important;
          overflow-x: hidden !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
        }
        /* ... rest of your CSS ... */
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Helvetica, Arial, sans-serif;width:100%;max-width:100%;min-height:100%;overflow-x:hidden;-webkit-font-smoothing:antialiased;">
      <!-- Hidden separator -->
      <div style="display:none;font-size:0;line-height:0;max-height:0;mso-hide:all;color:#f5f5f5;background:#f5f5f5;opacity:0;visibility:hidden;overflow:hidden;height:0;width:0;">
        NEW EMAIL THREAD - ${threadId}
      </div>
      
      <!-- Main email content -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 10px;width:100%;max-width:100%;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
        <tr>
          <td align="center" style="background-color:#f5f5f5;padding:10px;">
            <table class="main-table" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:30px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);margin:0 auto;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" style="background:linear-gradient(180deg,#0B6B37 0%,#14532D 100%);padding:35px 24px 25px;text-align:center;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td align="center">
                        <div style="display:inline-block;background:#ffffff;padding:12px 24px;border-radius:16px;margin-bottom:12px;">
                          <img class="logo-img" src="${logoSrc}" alt="Tabadl Alkon" width="160" style="display:block;height:auto;border:0;max-width:100%;" />
                        </div>
                        <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.95);max-width:400px;margin-left:auto;margin-right:auto;padding:0 10px;">
                          Your trusted partner for business setup in Saudi Arabia — keeping you informed at every step.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td class="content-padding" style="padding:28px 18px 20px;background-color:#ffffff;">
                  ${greetingHtml}

                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td style="text-align:center;padding-bottom:16px;">
                        <h1 class="heading" style="margin:0 0 6px;color:#0B6B37;font-size:24px;font-weight:700;line-height:1.2;">
                          ${heading}
                        </h1>
                      </td>
                    </tr>
                  </table>

                  <!-- Fast response -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4fbf6;border:1px solid #d4ead8;border-radius:16px;overflow:hidden;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                          <tr>
                            <td style="padding:16px 18px;">
                              <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fast response</p>
                              <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">Your application was received and routed to the right team instantly.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Clear updates -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f9ff;border:1px solid #d8e6fb;border-radius:16px;overflow:hidden;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                          <tr>
                            <td style="padding:16px 18px;">
                              <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Clear updates</p>
                              <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">You'll receive timely progress notifications with every key milestone.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;border:1px solid #d8e6ef;border-radius:16px;overflow:hidden;margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td style="padding:0;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                          ${detailRowsHtml}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- What happens next -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9e7;border:1px solid #fdebd0;border-radius:16px;overflow:hidden;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                          <tr>
                            <td style="padding:16px 18px;">
                              <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
                              ${nextSteps}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Need help -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9e7;border:1px solid #fdebd0;border-radius:16px;overflow:hidden;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                          <tr>
                            <td style="padding:16px 18px;">
                              <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Need help?</p>
                              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Contact our support team if you have questions or want to discuss your application.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td align="center">
                        <a href="https://tk.sa" style="display:inline-block;background:#0B6B37;color:#ffffff;padding:12px 36px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #0B6B37;">
                          Explore More Services
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;text-align:center;">
                          ${footerNote}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Signature -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4ecf1;padding-top:18px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;font-size:14px;color:#334155;padding-top:4px;">Thank you,</p>
                        <p style="margin:0;color:#0B6B37;font-weight:700;font-size:18px;">Tabadl Alkon Team</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8f9fa;padding:14px 20px 16px;text-align:center;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;font-size:12px;color:#64748b;">
                          <a href="https://tk.sa" style="color:#0B6B37;text-decoration:none;">www.tabadlalkon.com</a>
                        </p>
                        <p style="margin:0 0 4px;font-size:12px;color:#64748b;">
                          <a href="mailto:info@tabadlalkon.com" style="color:#0B6B37;text-decoration:none;">info@tabadlalkon.com</a>
                        </p>
                        <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Tabadl Alkon. All Rights Reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// ✅ UPDATED: All status email templates
export const APPLICATION_EMAILS = {
  SUBMITTED: {
    subject: "✅ Application Submitted Successfully",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application Submitted Successfully!",
        intro:
          "Thank you for choosing Tabadl Alkon. Your application has been successfully submitted and our team has received your request for review.",
        detailRows,
        footerNote:
          "You will receive an email notification once there is an update on your application.",
        clientName,
        isNewThread: true,
        statusType: "SUBMITTED",
      }),
  },

  IN_PROGRESS: {
    subject: "🔄 Application In Progress",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application In Progress",
        intro:
          "Your application is currently in progress. Our team is working on it and will update you shortly.",
        detailRows,
        footerNote:
          "We will keep you informed as soon as there is an update or any action needed from your side.",
        clientName,
        isNewThread: true,
        statusType: "IN_PROGRESS",
      }),
  },

  UNDER_REVIEW: {
    subject: "📋 Application Under Review",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application Under Review",
        intro:
          "Your application is now under review by our specialized team.",
        detailRows,
        footerNote:
          "We will notify you as soon as the review is complete.",
        clientName,
        isNewThread: true,
        statusType: "UNDER_REVIEW",
      }),
  },

  HARD_COPY_REQUIRED: {
    subject: "📄 Hard Copy Required",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Hard Copy Required",
        intro:
          "We require physical copies of certain documents to proceed with your application.",
        detailRows,
        footerNote:
          "Please submit the required hard copies to our office at your earliest convenience.",
        clientName,
        isNewThread: true,
        statusType: "HARD_COPY_REQUIRED",
      }),
  },

  APPROVED: {
    subject: "🎉 Application Approved!",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Congratulations! Application Approved",
        intro:
          "Congratulations! Your application has been approved and your request is now moving forward.",
        detailRows,
        footerNote:
          "Please keep an eye on your email for the next steps and any further instructions.",
        clientName,
        isNewThread: true,
        statusType: "APPROVED",
      }),
  },

  REJECTED: {
    subject: "📌 Application Status Update",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application Status Update",
        intro:
          "We regret to inform you that your application was not approved. Please contact our support team for details.",
        detailRows,
        footerNote:
          "If you would like to discuss the outcome or submit another request, please reach out to us.",
        clientName,
        isNewThread: true,
        statusType: "REJECTED",
      }),
  },

  COMPLETED: {
    subject: "✅ Application Completed",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application Completed Successfully!",
        intro:
          "Congratulations! Your application has been successfully completed.",
        detailRows,
        footerNote:
          "Thank you for choosing Tabadl Alkon. We look forward to serving you again.",
        clientName,
        isNewThread: true,
        statusType: "COMPLETED",
      }),
  },
} as const;