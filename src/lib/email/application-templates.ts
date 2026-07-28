export const APPLICATION_EMAILS = {
  SUBMITTED: {
    subject: "Application Submitted Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
        <h2 style="color:#2563eb;">Application Submitted</h2>

        <p>Thank you for your submission.</p>

        <div style="padding:15px; background:#f3f4f6; border-radius:8px;">
          <strong>Status:</strong> Submitted
        </div>

        <p>You will receive further updates as your application progresses.</p>

        <p>Regards,<br/>Tabadl Team</p>
      </div>
    `,
  },

  IN_PROGRESS: {
    subject: "Application Status Updated",
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
        <h2 style="color:#f59e0b;">Application In Progress</h2>

        <div style="padding:15px; background:#fffbeb; border-radius:8px;">
          <strong>Status:</strong> In Progress
        </div>

        <p>Your application is under review.</p>

        <p>Regards,<br/>Tabadl Team</p>
      </div>
    `,
  },

  APPROVED: {
    subject: "Application Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
        <h2 style="color:#10b981;">Application Approved</h2>

        <div style="padding:15px; background:#ecfdf5; border-radius:8px;">
          <strong>Status:</strong> Approved
        </div>

        <p>Your application has been approved.</p>

        <p>Regards,<br/>Tabadl Team</p>
      </div>
    `,
  },

  REJECTED: {
    subject: "Application Status Updated",
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
        <h2 style="color:#ef4444;">Application Rejected</h2>

        <div style="padding:15px; background:#fef2f2; border-radius:8px;">
          <strong>Status:</strong> Rejected
        </div>

        <p>Your application was not approved.</p>

        <p>Regards,<br/>Tabadl Team</p>
      </div>
    `,
  },
} as const;