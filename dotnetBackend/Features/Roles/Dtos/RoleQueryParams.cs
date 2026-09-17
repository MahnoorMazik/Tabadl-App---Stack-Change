namespace Tabadl.Api.Features.Roles.Dtos;

public class RoleQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
}