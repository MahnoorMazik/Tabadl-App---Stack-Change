namespace Tabadl.Api.Domain.Entities;
public class ClientGroup
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string? Color { get; set; }
    public DateTime IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
}