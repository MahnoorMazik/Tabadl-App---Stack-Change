using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Common.Auth;
using Tabadl.Api.Data;
using Tabadl.Api.Domain.Entities;
using Tabadl.Api.Features.Auth.Dtos;

namespace Tabadl.Api.Features.Auth;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly PasswordService _passwords;
    private readonly JwtTokenService _tokens;

    public AuthService(AppDbContext db, PasswordService passwords, JwtTokenService tokens)
    {
        _db = db;
        _passwords = passwords;
        _tokens = tokens;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted);

        if (user == null)
            return null;

        if (!user.IsActive)
            return null;

        if (string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwords.Verify(request.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            AccessToken = _tokens.CreateAccessToken(user),
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role
            }
        };
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
            return null;

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Email = request.Email,
            Role = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role,
            PasswordHash = _passwords.Hash(request.Password),
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastLoginAt = null
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            AccessToken = _tokens.CreateAccessToken(user),
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role
            }
        };
    }

    public async Task<UserInfo?> GetCurrentUserAsync(string userId)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return null;

        return new UserInfo
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role
        };
    }
}