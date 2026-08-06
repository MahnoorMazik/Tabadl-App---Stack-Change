type StatusType = "SUBMITTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "HARD_COPY_REQUIRED" | "APPROVED" | "REJECTED" | "COMPLETED";

export const APPLICATION_WHATSAPP = {
  SUBMITTED: {
    buildMessage: ({ clientName, applicationNumber, serviceName }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

✅ Your application has been successfully submitted!

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Submitted

Our team has begun the initial review process. You will receive updates as your application progresses.

Thank you for choosing Tabadl Alkon.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  IN_PROGRESS: {
    buildMessage: ({ clientName, applicationNumber, serviceName }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

🔄 Your application is currently in progress.

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: In Progress

Our team is actively working on your application. We will notify you once the review is complete.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  UNDER_REVIEW: {
    buildMessage: ({ clientName, applicationNumber, serviceName }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

📋 Your application is now under review.

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Under Review

Our specialized team is carefully evaluating all submitted documents. We will notify you once the review is complete.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  HARD_COPY_REQUIRED: {
    buildMessage: ({ clientName, applicationNumber, serviceName, adminNotes }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

📄 We require hard copies of certain documents to proceed.

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Hard Copy Required

Please submit the required physical documents to our office at your earliest convenience.
${adminNotes ? `\n📝 Notes: ${adminNotes}` : ''}

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  APPROVED: {
    buildMessage: ({ clientName, applicationNumber, serviceName }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

🎉 Congratulations! Your application has been APPROVED!

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Approved

Our team will now proceed with the next steps. You will receive further instructions via email.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  REJECTED: {
    buildMessage: ({ clientName, applicationNumber, serviceName, adminNotes }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

📌 We regret to inform you that your application was not approved.

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Rejected

${adminNotes ? `\n📝 Reason: ${adminNotes}` : ''}

Please contact our support team for detailed feedback and guidance on your next steps.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },

  COMPLETED: {
    buildMessage: ({ clientName, applicationNumber, serviceName }: any) => {
      const greeting = clientName ? `Dear ${clientName},` : "Dear Valued Client,";
      return `
${greeting}

✅ Congratulations! Your application has been successfully COMPLETED!

📋 Application Details:
• Application ID: ${applicationNumber}
• Service Type: ${serviceName}
• Status: Completed

Thank you for choosing Tabadl Alkon. We look forward to serving you again in the future.

---
Tabadl Alkon Team
www.tabadlalkon.com
`;
    },
  },
} as const;