namespace Tabadl.Api.DTOs;

public class SignupResponse
{
    public bool RequiresEmailVerification { get; set; } = true;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}