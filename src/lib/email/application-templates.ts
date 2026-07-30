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
  statusType?: "SUBMITTED" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
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
            Our team is currently conducting a thorough review of your application. We appreciate your patience during this process.
          </p>
        `;
        break;

      case "APPROVED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We are pleased to inform you that your application has been approved!
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            Congratulations on this milestone. Our team will now proceed with the next steps to move your request forward.
          </p>
        `;
        break;

      case "REJECTED":
        openingLines = `
          <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">
            We regret to inform you that your application was not approved at this time.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            We understand this may be disappointing, and we encourage you to reach out to our support team for detailed feedback and guidance.
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
      const capitalizedValue =
        displayValue.charAt(0).toUpperCase() + displayValue.slice(1);
      const statusColor = displayValue.includes("approved")
        ? "#0B6B37"
        : displayValue.includes("rejected")
          ? "#dc2626"
          : displayValue.includes("progress")
            ? "#f59e0b"
            : "#0B6B37";

      valueDisplay = `<span style="display:inline-block;background:${statusColor};color:#ffffff;padding:6px 18px;border-radius:999px;font-size:13px;font-weight:700;">${capitalizedValue}</span>`;
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
            <li>Our team is actively reviewing your application</li>
            <li>You will be notified once the review is complete</li>
            <li>Additional information may be requested if needed</li>
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
        /* CRITICAL: Reset all margins and prevent scroll */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
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
        
        /* Hide all quoted text */
        blockquote, 
        .gmail_quote, 
        .yahoo_quoted, 
        .quote, 
        .quoted,
        .gmail_extra,
        .gmail_extra *,
        .gmail_quote *,
        blockquote *,
        .moz-cite-prefix,
        .moz-email-headers,
        [style*="border-left:"] *,
        [style*="border-left-color:"] *,
        [style*="border-left-width:"] * {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          font-size: 0 !important;
          line-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          color: transparent !important;
        }
        
        /* Hide any element with quote-like attributes */
        [class*="quote"],
        [class*="quoted"],
        [id*="quote"],
        [id*="quoted"],
        [class*="gmail"],
        [class*="yahoo"] {
          display: none !important;
        }
        
        /* Hide Gmail's quote wrapper */
        div[style*="border-left:"] {
          display: none !important;
        }
        
        /* Reset everything */
        body, table, td, p, div, span, h1, h2, h3, h4, h5, h6 {
          margin: 0;
          padding: 0;
          border: 0;
        }
        
        /* Force light grey background for the whole email */
        body, .email-wrapper, .main-container {
          background-color: #f5f5f5 !important;
        }
        
        /* Ensure our content is visible */
        .email-content, .email-content * {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* Hide everything before our email content */
        body > *:not(table):not(.email-content) {
          display: none !important;
        }
        
        /* Style the outer wrapper - LIGHT GREY background */
        .email-wrapper {
          background-color: #f5f5f5 !important;
          padding: 20px 10px !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* Style the card container - WHITE card on light grey background */
        .card-container {
          background-color: #ffffff !important;
          border-radius: 30px !important;
          max-width: 600px !important;
          width: 100% !important;
          margin: 0 auto !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.08) !important;
          overflow: hidden !important;
        }

        /* Make all boxes more rounded */
        .rounded-box {
          border-radius: 16px !important;
          overflow: hidden !important;
        }

        /* Responsive fixes for mobile */
        @media only screen and (max-width: 600px) {
          table[class="main-table"] {
            width: 100% !important;
            padding: 10px !important;
          }
          td[class="content-padding"] {
            padding: 20px 16px !important;
          }
          td[class="header-padding"] {
            padding: 30px 16px 20px !important;
          }
          img[class="logo-img"] {
            width: 140px !important;
            height: auto !important;
          }
          h1[class="heading"] {
            font-size: 22px !important;
          }
          div[class="card-container"] {
            border-radius: 20px !important;
          }
        }

        @media only screen and (max-width: 480px) {
          td[class="content-padding"] {
            padding: 16px 12px !important;
          }
          td[class="header-padding"] {
            padding: 24px 12px 16px !important;
          }
          img[class="logo-img"] {
            width: 120px !important;
          }
          h1[class="heading"] {
            font-size: 20px !important;
          }
          p[class="intro-text"] {
            font-size: 14px !important;
          }
          div[class="card-container"] {
            border-radius: 16px !important;
          }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Helvetica, Arial, sans-serif;width:100%;max-width:100%;min-height:100%;overflow-x:hidden;-webkit-font-smoothing:antialiased;">
      <!-- Hidden separator to break Gmail threading (no dots) -->
      <div style="display:none;font-size:0;line-height:0;max-height:0;mso-hide:all;color:#f5f5f5;background:#f5f5f5;opacity:0;visibility:hidden;overflow:hidden;height:0;width:0;">
        NEW EMAIL THREAD - ${threadId}
      </div>
      
      <!-- Main email content with LIGHT GREY background -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 10px;width:100%;max-width:100%;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
        <tr>
          <td align="center" style="background-color:#f5f5f5;padding:10px;">
            <!-- Main Container - White card on light grey -->
            <table class="main-table" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:30px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);margin:0 auto;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
              
              <!-- Header - Green gradient -->
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
                  <!-- GREETING SECTION -->
                  ${greetingHtml}

                  <!-- Heading -->
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

                  <!-- What happens next - Like Fast Response -->
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

                  <!-- Need help - Like Fast Response -->
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

                  <!-- CTA Button - Explore More Services -->
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

export const APPLICATION_EMAILS = {
  SUBMITTED: {
    subject: "Application Submitted",
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
    subject: "Application In Progress",
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
          "Your application is currently under review. Our team is working on it and will update you shortly.",
        detailRows,
        footerNote:
          "We will keep you informed as soon as there is an update or any action needed from your side.",
        clientName,
        isNewThread: true,
        statusType: "IN_PROGRESS",
      }),
  },

  APPROVED: {
    subject: "Application Approved",
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
    subject: "Application Update",
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
} as const;