using System.Net;
using System.Net.Mail;
using System.Text;

namespace Tabadl.Api.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string name, string token)
    {
        var frontendUrl = _config["App:FrontendUrl"] ?? "http://localhost:3000";
        var verifyUrl = $"{frontendUrl}/verify-email/{token}";

        var subject = "Verify your email — Tabadl Alkon";
        var html = BuildVerificationEmail(name, verifyUrl);

        await SendEmailAsync(toEmail, subject, html);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            var host = _config["Email:SmtpHost"] ?? throw new InvalidOperationException("SMTP host missing");
            var port = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var user = _config["Email:SmtpUser"] ?? throw new InvalidOperationException("SMTP user missing");
            var password = _config["Email:SmtpPassword"] ?? throw new InvalidOperationException("SMTP password missing");
            var fromAddress = _config["Email:FromAddress"] ?? user;
            var fromName = _config["Email:FromName"] ?? "Tabadl Alkon";
            var enableSsl = bool.Parse(_config["Email:EnableSsl"] ?? "true");

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(user, password),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000
            };

            using var mail = new MailMessage
            {
                From = new MailAddress(fromAddress, fromName, Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                Body = htmlBody,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true
            };

            mail.To.Add(new MailAddress(toEmail));

            await client.SendMailAsync(mail);

            _logger.LogInformation("✅ Email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to send email to {Email}", toEmail);
            throw;
        }
    }

    private static string BuildVerificationEmail(string name, string verifyUrl)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(name) ? "there" : name);
        var safeUrl = System.Net.WebUtility.HtmlEncode(verifyUrl);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Verify your email</title>
</head>
<body style=""margin:0;padding:0;background-color:#f5f5f5;font-family:Helvetica, Arial, sans-serif;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f5f5f5;padding:20px 10px;"">
        <tr>
            <td align=""center"">
                <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);"">
                    
                    <tr>
                        <td style=""background:linear-gradient(180deg,#0B6B37 0%,#14532D 100%);padding:32px 24px;text-align:center;"">
                            <h1 style=""margin:0;color:#ffffff;font-size:22px;font-weight:700;"">
                                Tabadl Alkon
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style=""padding:36px 28px 20px;background-color:#ffffff;"">
                            <h2 style=""margin:0 0 16px;color:#0B6B37;font-size:22px;font-weight:700;text-align:center;"">
                                Verify your email
                            </h2>
                            <p style=""margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;"">
                                Hi <strong>{safeName}</strong>,
                            </p>
                            <p style=""margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;"">
                                Thank you for signing up with Tabadl Alkon. Please click the button below to verify your email address and activate your account.
                            </p>

                            <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin:24px 0;"">
                                <tr>
                                    <td align=""center"">
                                        <a href=""{safeUrl}"" style=""display:inline-block;background:#0B6B37;color:#ffffff;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;"">
                                            Verify Email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style=""margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;"">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style=""margin:0 0 20px;font-size:12px;color:#0B6B37;line-height:1.6;word-break:break-all;"">
                                {safeUrl}
                            </p>

                            <p style=""margin:20px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;"">
                                This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style=""background:#f8f9fa;padding:18px 24px;text-align:center;border-top:1px solid #e4ecf1;"">
                            <p style=""margin:0 0 4px;font-size:12px;color:#64748b;"">
                                <a href=""https://tk.sa"" style=""color:#0B6B37;text-decoration:none;"">www.tabadlalkon.com</a>
                            </p>
                            <p style=""margin:0;font-size:11px;color:#94a3b8;"">
                                © {DateTime.UtcNow.Year} Tabadl Alkon. All Rights Reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
}