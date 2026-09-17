namespace Tabadl.Api.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    public string RequestId { get; set; } = Guid.NewGuid().ToString();
    public string? Message { get; set; }
}

public class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public ApiError Error { get; set; } = new();
}

public class ApiError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    public string RequestId { get; set; } = Guid.NewGuid().ToString();
    public string? Suggestion { get; set; }
}