using System.ComponentModel.DataAnnotations;

namespace Tabadl.Api.DTOs;

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>"client" or "staff"</summary>
    public string Audience { get; set; } = "client";
}