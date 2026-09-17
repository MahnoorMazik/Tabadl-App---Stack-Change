using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Tabadl.Api.Common;
using Tabadl.Api.Common.Auth;
using Tabadl.Api.Data;
using Tabadl.Api.Features.Auth;
using Tabadl.Api.Features.LeadStatuses;
using Tabadl.Api.Features.Roles;

static string ToCamelCase(string s) =>
    string.IsNullOrEmpty(s) ? s : char.ToLowerInvariant(s[0]) + s[1..];

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var secret = builder.Configuration["Jwt:Secret"] ?? "this-is-a-very-long-development-secret-key-12345";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiExceptionFilter>();
});

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<LeadStatusService>();
builder.Services.AddSingleton<PasswordService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<AuthService>();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(e => e.Value!.Errors.Select(err => new ErrorDetail
            {
                Field = ToCamelCase(e.Key),
                Message = err.ErrorMessage
            }))
            .ToList();

        var error = new ApiErrorResponse
        {
            Error = new ApiError
            {
                Code = "VALIDATION_ERROR",
                Message = "Validation failed.",
                Details = details
            }
        };

        return new BadRequestObjectResult(error);
    };
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();