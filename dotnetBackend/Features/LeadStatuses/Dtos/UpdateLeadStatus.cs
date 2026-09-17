namespace Tabadl.Api.Features.LeadStatuses.Dtos;

public class UpdateLeadStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
}