using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tabadl.Api.Common;
using Tabadl.Api.Features.Auth.Dtos;

namespace Tabadl.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly AuthService _service;

    public AuthController(AuthService service)
    {
        _service = service;
        
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _service.LoginAsync(request);

        if (result == null)
            return ApiUnauthorized("Invalid email or password");

        return ApiOk(result, "Login successful");
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _service.RegisterAsync(request);

        if (result == null)
            return ApiBadRequest("Registration failed");

        return ApiOk(result, "Registration successful");
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId))
            return ApiUnauthorized("User not authenticated");

        var result = await _service.GetCurrentUserAsync(userId);
        if (result == null)
            return ApiNotFound("User not found");

        return ApiOk(result, "User profile retrieved successfully");
    }
}