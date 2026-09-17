namespace Tabadl.Api.Features.Roles.Dtos;

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsProtected { get; set; }
    public bool IsActive { get; set; }
}