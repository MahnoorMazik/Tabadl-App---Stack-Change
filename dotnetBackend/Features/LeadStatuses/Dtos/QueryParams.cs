namespace Tabadl.Api.Features.LeadStatuses.Dtos;

public class LeadStatusQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
}