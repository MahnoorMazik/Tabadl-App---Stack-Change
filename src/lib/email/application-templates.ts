const brandLogoCid = "tk-logo@tabadlalkon";
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
}: {
  heading: string;
  intro: string;
  detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
  footerNote: string;
  clientName?: string;
}) => {
  // Build the detail rows HTML
  let detailRowsHtml = '';
  
  if (clientName) {
    detailRowsHtml += `
      <tr>
        <td style="padding:14px 0;color:#334155;font-weight:600;width:40%;border-bottom:1px solid #e9f1f7;">Client</td>
        <td style="padding:14px 0;color:#0f172a;font-weight:700;text-align:right;width:60%;border-bottom:1px solid #e9f1f7;">${clientName}</td>
      </tr>
    `;
  }

  detailRows.forEach((row, index) => {
    const isLastRow = index === detailRows.length - 1;
    const borderStyle = isLastRow ? '' : 'border-bottom:1px solid #e9f1f7;';
    
    let valueDisplay = row.value;
    if (row.label === "Current Status") {
      valueDisplay = `<span style="display:inline-block;background:#0B6B37;color:#ffffff;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:700;">${row.value}</span>`;
    }

    detailRowsHtml += `
      <tr>
        <td style="padding:14px 0;color:#334155;font-weight:600;width:40%;${borderStyle}">${row.label}</td>
        <td style="padding:14px 0;color:#0f172a;font-weight:700;text-align:right;width:60%;${borderStyle}">${valueDisplay}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Status Update</title>
    </head>
    <body style="margin:0;padding:0;background-color:#eef2f6;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f6;padding:20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#f8fbff;border-radius:36px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(180deg,#0B6B37 0%,#14532D 100%);padding:40px 30px 30px;text-align:center;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <div style="display:inline-block;background:#ffffff;padding:16px 30px;border-radius:20px;margin-bottom:16px;">
                          <img src="cid:${brandLogoCid}" alt="Tabadl Alkon" width="180" style="display:block;height:auto;border:0;max-width:100%;" />
                        </div>
                        <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.9);max-width:480px;margin-left:auto;margin-right:auto;">
                          A polished application update, designed to keep you informed and confident every step of the way.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 30px 30px;background-color:#ffffff;">
                  <!-- Heading -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:center;padding-bottom:24px;">
                        <h1 style="margin:0 0 8px;color:#0B6B37;font-size:28px;font-weight:700;line-height:1.2;">
                          ${heading}
                        </h1>
                        <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
                          ${intro}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Fast response - Full Width -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4fbf6;border:1px solid #d4ead8;border-radius:16px;">
                          <tr>
                            <td style="padding:20px 18px;">
                              <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fast response</p>
                              <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">Your application was received and routed to the right team instantly.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Clear updates - Full Width -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f9ff;border:1px solid #d8e6fb;border-radius:16px;">
                          <tr>
                            <td style="padding:20px 18px;">
                              <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Clear updates</p>
                              <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">You'll receive timely progress notifications with every key milestone.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Details Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;border:1px solid #d8e6ef;border-radius:16px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:20px 22px 16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${detailRowsHtml}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- What happens next - Full Width -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7ebef;border-radius:16px;">
                          <tr>
                            <td style="padding:20px 18px;">
                              <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;">What happens next</p>
                              <ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.8;">
                                <li>Review the latest status</li>
                                <li>Wait for the next notification</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Need help - Full Width -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7ebef;border-radius:16px;">
                          <tr>
                            <td style="padding:20px 18px;">
                              <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;">Need help?</p>
                              <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Contact our support team if you have questions or want to discuss your application.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                    <tr>
                      <td align="center">
                        <a href="https://tk.sa" style="display:inline-block;background:#0B6B37;color:#ffffff;padding:12px 36px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #0B6B37;">
                          View Application
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;text-align:center;">
                          ${footerNote}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Signature -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4ecf1;padding-top:20px;">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;font-size:15px;color:#334155;">Thank you,</p>
                        <p style="margin:0;color:#0B6B37;font-weight:700;font-size:18px;">Tabadl Alkon Team</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f1f7fb;padding:16px 20px 20px;text-align:center;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;font-size:13px;color:#64748b;">
                          <a href="https://tk.sa" style="color:#0B6B37;text-decoration:none;">www.tabadlalkon.com</a>
                        </p>
                        <p style="margin:0 0 4px;font-size:13px;color:#64748b;">
                          <a href="mailto:info@tabadlalkon.com" style="color:#0B6B37;text-decoration:none;">info@tabadlalkon.com</a>
                        </p>
                        <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Tabadl Alkon. All Rights Reserved.</p>
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
    subject: "Application Submitted Successfully",
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
        heading: "Application In Progress",
        intro:
          "Your application is currently under review. Our team is working on it and will update you shortly.",
        detailRows,
        footerNote:
          "We will keep you informed as soon as there is an update or any action needed from your side.",
        clientName,
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
        heading: "Application Approved",
        intro:
          "Congratulations! Your application has been approved and your request is now moving forward.",
        detailRows,
        footerNote:
          "Please keep an eye on your email for the next steps and any further instructions.",
        clientName,
      }),
  },

  REJECTED: {
    subject: "Application Rejected",
    buildHtml: ({
      clientName,
      detailRows,
    }: {
      clientName?: string;
      detailRows: Array<{ label: string; value: string; isLast?: boolean }>;
    }) =>
      createApplicationEmail({
        heading: "Application Rejected",
        intro:
          "We regret to inform you that your application was not approved. Please contact our support team for details.",
        detailRows,
        footerNote:
          "If you would like to discuss the outcome or submit another request, please reach out to us.",
        clientName,
      }),
  },
} as const;