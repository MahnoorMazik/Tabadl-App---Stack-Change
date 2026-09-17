using Microsoft.AspNetCore.Mvc;
using Tabadl.Api.Common;
using Tabadl.Api.Features.LeadStatuses.Dtos;

namespace Tabadl.Api.Features.LeadStatuses;

[ApiController]
[Route("api/lead-statuses")]
public class LeadStatusesController : ApiControllerBase
{
    private readonly LeadStatusService _service;

    public LeadStatusesController(LeadStatusService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] LeadStatusQueryParams query)
    {
        var result = await _service.GetAllAsync(query);
        return ApiOk(result, "Lead statuses retrieved successfully");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var leadStatus = await _service.GetByIdAsync(id);

        if (leadStatus == null)
            return ApiNotFound("Lead status not found");

        return ApiOk(leadStatus);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeadStatusRequest request)
    {
        var leadStatus = await _service.CreateAsync(request);
        return ApiOk(leadStatus, "Lead status created successfully");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateLeadStatusRequest request)
    {
        var leadStatus = await _service.UpdateAsync(id, request);

        if (leadStatus == null)
            return ApiNotFound("Lead status not found");

        return ApiOk(leadStatus, "Lead status updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _service.DeleteAsync(id);

        if (!result)
            return ApiNotFound("Lead status not found");

        return ApiOk("Lead status deleted successfully");
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(string id)
    {
        var restored = await _service.RestoreAsync(id);

        if (!restored)
            return ApiNotFound("Lead status not found");

        return ApiOk<object>(null, "Lead status restored successfully");
    }
}