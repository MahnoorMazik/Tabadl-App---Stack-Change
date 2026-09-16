using System.ComponentModel.DataAnnotations;

namespace Tabadl.Api.DTOs;

public class SignupRequest
{
    [Required, MinLength(2)]
    public string Name { get; set; } = string.Empty;

    public string? NameAr { get; set; }

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? CompanyName { get; set; }
    public string? Phone { get; set; }
}