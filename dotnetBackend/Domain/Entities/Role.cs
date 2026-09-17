namespace Tabadl.Api.Domain.Entities;

public class Role
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public string? Permissions { get; set; }
    public bool IsDefault { get; set; }
    public bool IsProtected { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<User> Users { get; set; } = new();
}

public class Client
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public string? Permissions { get; set; }
    public bool IsDefault { get; set; }
    public bool IsProtected { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}



