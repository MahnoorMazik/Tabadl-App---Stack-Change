using System.ComponentModel.DataAnnotations;

namespace Tabadl.Api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "CLIENT";

    [MaxLength(100)]
    public string? CompanyName { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;

    public DateTime? EmailVerified { get; set; }

    [MaxLength(255)]
    public string? EmailVerificationToken { get; set; }

    public DateTime? EmailVerificationExpiry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}