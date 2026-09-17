namespace Tabadl.Api.Services;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string name, string token);
}