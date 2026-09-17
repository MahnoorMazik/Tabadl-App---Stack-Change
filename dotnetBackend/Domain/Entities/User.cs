namespace Tabadl.Api.Domain.Entities;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }

    public string? PasswordHash { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Foreign key — asal column database me
    public string? CustomRoleId { get; set; }

    // Navigation property — sirf C# me, koi column nahi
    public Role? CustomRole { get; set; }
}