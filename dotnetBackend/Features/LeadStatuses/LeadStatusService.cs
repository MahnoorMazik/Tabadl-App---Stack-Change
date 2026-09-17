using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Common;
using Tabadl.Api.Data;
using Tabadl.Api.Domain.Entities;
using Tabadl.Api.Features.LeadStatuses.Dtos;

namespace Tabadl.Api.Features.LeadStatuses;

public class LeadStatusService
{
    private readonly AppDbContext _db;

    public LeadStatusService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<LeadStatus>> GetAllAsync()
    {
        return await _db.LeadStatuses.ToListAsync();
    }

    public async Task<LeadStatus?> GetByIdAsync(string id)
    {
        return await _db.LeadStatuses.FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<LeadStatus> CreateAsync(CreateLeadStatusRequest request)
    {
        var leadStatus = new LeadStatus
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Color = request.Color,
            IsDefault = false,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.LeadStatuses.Add(leadStatus);
        await _db.SaveChangesAsync();

        return leadStatus;
    }

    public async Task<LeadStatus?> UpdateAsync(string id, UpdateLeadStatusRequest request)
    {
        var leadStatus = await _db.LeadStatuses.FirstOrDefaultAsync(r => r.Id == id);

        if (leadStatus == null)
            return null;

        leadStatus.Name = request.Name;
        leadStatus.Color = request.Color;
        leadStatus.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return leadStatus;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var leadStatus = await _db.LeadStatuses.FirstOrDefaultAsync(r => r.Id == id);

        if (leadStatus == null)
            return false;

        leadStatus.IsDeleted = true;
        leadStatus.DeletedAt = DateTime.UtcNow;
        leadStatus.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RestoreAsync(string id)
    {
        var leadStatus = await _db.LeadStatuses
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (leadStatus == null)
            return false;

        leadStatus.IsDeleted = false;
        leadStatus.DeletedAt = null;
        leadStatus.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<PagedResult<LeadStatus>> GetAllAsync(LeadStatusQueryParams query)
    {
        var leadStatuses = _db.LeadStatuses.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            leadStatuses = leadStatuses.Where(r => r.Name.Contains(query.Search));
        }

        var totalCount = await leadStatuses.CountAsync();

        var items = await leadStatuses
            .OrderByDescending(r => r.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .AsNoTracking()
            .ToListAsync();

        return new PagedResult<LeadStatus>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize)
        };
    }
}

