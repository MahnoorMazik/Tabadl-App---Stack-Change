public class LeadStatus
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string? Color { get; set; }
    public bool IsDefault { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}