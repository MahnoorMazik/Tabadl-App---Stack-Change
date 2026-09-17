
public class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public ApiError Error { get; set; } = new();
}

public class ApiError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public List<ErrorDetail>? Details { get; set; }    
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    public string RequestId { get; set; } = Guid.NewGuid().ToString();
    public string? Suggestion { get; set; }
}

public class ErrorDetail                             
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}