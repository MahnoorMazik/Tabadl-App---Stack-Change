using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Data;
using Tabadl.Api.DTOs;
using Tabadl.Api.Models;
using Tabadl.Api.Services;

namespace Tabadl.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IEmailService _email;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext db,
        IPasswordHasher hasher,
        IEmailService email,
        ILogger<AuthController> logger)
    {
        _db = db;
        _hasher = hasher;
        _email = email;
        _logger = logger;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] SignupRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = "Validation failed" });

        var email = req.Email.Trim().ToLowerInvariant();

        var existing = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (existing is not null)
        {
            if (existing.EmailVerified is null && existing.Role == "CLIENT")
            {
                return Conflict(new
                {
                    error = "An account with this email already exists but is not verified. Please check your email.",
                    code = "EMAIL_NOT_VERIFIED"
                });
            }
            return Conflict(new { error = "User already exists" });
        }

        var verificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = _hasher.Hash(req.Password),
            Role = "CLIENT",
            CompanyName = req.CompanyName?.Trim(),
            Phone = req.Phone?.Trim(),
            EmailVerified = null,
            EmailVerificationToken = verificationToken,
            EmailVerificationExpiry = DateTime.UtcNow.AddHours(24)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        try
        {
            await _email.SendVerificationEmailAsync(user.Email, user.Name, verificationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email");
        }

        return Ok(new SignupResponse
        {
            RequiresEmailVerification = true,
            Email = user.Email,
            Message = "Registration successful. Please verify your email before signing in."
        });
    }

    // POST /api/auth/verify-email
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { error = "Verification token is required" });

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.EmailVerificationToken == req.Token && !u.IsDeleted);

        if (user is null)
            return BadRequest(new { error = "Invalid or expired verification link." });

        if (user.EmailVerified is not null)
            return Ok(new { message = "Email is already verified. You can sign in.", alreadyVerified = true });

        if (user.EmailVerificationExpiry is null || user.EmailVerificationExpiry < DateTime.UtcNow)
            return BadRequest(new { error = "This verification link has expired.", code = "TOKEN_EXPIRED" });

        user.EmailVerified = DateTime.UtcNow;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Email verified successfully. You can now sign in.", email = user.Email });
    }

    // POST /api/auth/resend-verification
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var genericResponse = new
        {
            message = "If an unverified account exists for this email, a verification link has been sent."
        };

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted && u.Role == "CLIENT");

        if (user is null || user.EmailVerified is not null)
            return Ok(genericResponse);

        var verificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationExpiry = DateTime.UtcNow.AddHours(24);
        await _db.SaveChangesAsync();

        try
        {
            await _email.SendVerificationEmailAsync(user.Email, user.Name, verificationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend verification email");
        }

        return Ok(genericResponse);
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user is null)
            return Ok(new LoginResponse { Success = false, Error = "No account found with this email" });

        if (!user.IsActive)
            return Ok(new LoginResponse { Success = false, Error = "Account is inactive. Contact an administrator." });

        if (req.Audience == "client")
        {
            if (user.Role != "CLIENT")
                return Ok(new LoginResponse { Success = false, Error = "Invalid credentials" });

            if (user.EmailVerified is null)
                return Ok(new LoginResponse { Success = false, Error = "EMAIL_NOT_VERIFIED" });
        }
        else if (req.Audience == "staff")
        {
            if (user.Role != "STAFF" && user.Role != "ADMIN")
                return Ok(new LoginResponse { Success = false, Error = "Invalid credentials" });
        }

        if (!_hasher.Verify(req.Password, user.PasswordHash))
            return Ok(new LoginResponse { Success = false, Error = "Incorrect password" });

        return Ok(new LoginResponse
        {
            Success = true,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                EmailVerified = user.EmailVerified is not null
            }
        });
    }
}

public class VerifyEmailRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationRequest
{
    public string Email { get; set; } = string.Empty;
}