namespace Tabadl.Api.Services;

public class LoggingEmailService : IEmailService
{
    private readonly ILogger<LoggingEmailService> _logger;

    public LoggingEmailService(ILogger<LoggingEmailService> logger)
        => _logger = logger;

    public Task SendVerificationEmailAsync(string toEmail, string name, string token)
    {
        var verifyUrl = $"http://localhost:3000/verify-email/{token}";

        _logger.LogInformation("========== VERIFICATION EMAIL (STUB) ==========");
        _logger.LogInformation("To:         {Email}", toEmail);
        _logger.LogInformation("Name:       {Name}", name);
        _logger.LogInformation("Verify URL: {Url}", verifyUrl);
        _logger.LogInformation("===============================================");

        return Task.CompletedTask;
    }
}