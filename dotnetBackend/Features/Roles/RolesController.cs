using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Data;
using Tabadl.Api.Domain.Entities;
using Tabadl.Api.Features.Roles.Dtos;
using Tabadl.Api.Common;
using Tabadl.Api.Common.Auth;
namespace Tabadl.Api.Features.Roles;

[ApiController]
[Route("api/roles")]
public class RolesController : ApiControllerBase    
{
    private readonly RoleService _service;   
    public RolesController(RoleService service)
    {
        _service = service;
    }

    // [HttpGet]
    // public async Task<IActionResult> GetAll()
    // {
    //     var roles = await _service.GetAllAsync();
    //     return ApiOk(roles, "Roles retrieved successfully");
    // }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var role = await _service.GetByIdAsync(id);

        if (role == null)
            return ApiNotFound("Role not found");

        return ApiOk(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        var role = await _service.CreateAsync(request);
        return ApiOk(role, "Role created successfully");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateRoleRequest request)
    {
        var role = await _service.UpdateAsync(id, request);

        if (role == null)
            return ApiNotFound("Role not found");

        return ApiOk(role, "Role updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _service.DeleteAsync(id);

        if (!result)
            return ApiNotFound("Role not found");
        return ApiOk("Role deleted successfully");
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(string id)
    {
        var restored = await _service.RestoreAsync(id);

        if (!restored)
            return ApiNotFound("Role not found");

        return ApiOk<object>(null, "Role restored successfully");
    }
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] RoleQueryParams query)
    {
        var result = await _service.GetAllAsync(query);
        return ApiOk(result, "Roles retrieved successfully");
    }

    [HttpGet("test-hash")]
    public IActionResult TestHash([FromServices] PasswordService passwords)
    {
        var hash = passwords.Hash("mypassword123");
        var ok = passwords.Verify("mypassword123", hash);
        var bad = passwords.Verify("wrongpassword", hash);

        return Ok(new { hash, ok, bad });
    }
}