using Microsoft.AspNetCore.Mvc;

namespace Tabadl.Api.Common;

public class ApiControllerBase : ControllerBase
{
    protected IActionResult ApiOk<T>(T data, string? message = null)
    {
        return Ok(new ApiResponse<T>
        {
            Data = data,
            Message = message
        });
    }

    protected IActionResult ApiNotFound(string message)
    {
        return NotFound(new ApiErrorResponse
        {
            Error = new ApiError
            {
                Code = "NOT_FOUND",
                Message = message
            }
        });
    }
    protected IActionResult ApiUnauthorized(string message)
    {
        return Unauthorized(new ApiErrorResponse
        {
            Error = new ApiError
            {
                Code = "UNAUTHORIZED",
                Message = message
            }
        });
    }

    protected IActionResult ApiBadRequest(string message)
    {
        return BadRequest(new ApiErrorResponse
        {
            Error = new ApiError
            {
                Code = "BAD_REQUEST",
                Message = message
            }
        });
    }
}