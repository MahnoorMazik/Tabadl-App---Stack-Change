using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Common;
using Tabadl.Api.Data;
using Tabadl.Api.Domain.Entities;
using Tabadl.Api.Features.Roles.Dtos;

namespace Tabadl.Api.Features.Roles;

public class RoleService
{
    private readonly AppDbContext _db;

    public RoleService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Role>> GetAllAsync()
    {
        return await _db.Roles.ToListAsync();
    }

    public async Task<Role?> GetByIdAsync(string id)
    {
        return await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<Role> CreateAsync(CreateRoleRequest request)
    {
        var role = new Role
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Description = request.Description,
            IsDefault = request.IsDefault,
            IsProtected = request.IsProtected,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync();

        return role;
    }

    public async Task<Role?> UpdateAsync(string id, UpdateRoleRequest request)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
            return null;

        role.Name = request.Name;
        role.Description = request.Description;
        role.IsActive = request.IsActive;
        role.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return role;
    }
    public async Task<bool> DeleteAsync(string id)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
            return false;

        role.IsDeleted = true;              
        role.DeletedAt = DateTime.UtcNow;
        role.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return true;
    }
    public async Task<bool> RestoreAsync(string id)
    {
        var role = await _db.Roles
            .IgnoreQueryFilters()                      
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
            return false;

        role.IsDeleted = false;
        role.DeletedAt = null;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<PagedResult<Role>> GetAllAsync(RoleQueryParams query)
    {
        var roles = _db.Roles.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            roles = roles.Where(r => r.Name.Contains(query.Search));
        }

        var totalCount = await roles.CountAsync();

        var items = await roles
            .OrderByDescending(r => r.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .AsNoTracking()
            .ToListAsync();

        return new PagedResult<Role>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize)
        };
    }
    
}

