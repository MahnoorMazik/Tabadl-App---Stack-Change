namespace Tabadl.Api.Features.LeadStatuses.Dtos;

public class CreateLeadStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public bool IsActive { get; set; }
}