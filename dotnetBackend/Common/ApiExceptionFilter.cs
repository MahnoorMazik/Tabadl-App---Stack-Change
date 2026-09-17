using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Tabadl.Api.Common;

public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        _logger.LogError(context.Exception, "Unhandled exception");

        var error = new ApiErrorResponse
        {
            Error = new ApiError
            {
                Code = "INTERNAL_ERROR",
                Message = "An unexpected error occurred."
            }
        };

        context.Result = new ObjectResult(error) { StatusCode = 500 };
        context.ExceptionHandled = true;
    }
}