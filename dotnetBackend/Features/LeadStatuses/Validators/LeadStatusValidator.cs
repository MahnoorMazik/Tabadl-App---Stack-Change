using FluentValidation;
using Tabadl.Api.Features.LeadStatuses.Dtos;

namespace Tabadl.Api.Features.LeadStatuses.Validators;

public class CreateLeadStatusValidator : AbstractValidator<CreateLeadStatusRequest>
{
    public CreateLeadStatusValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters")
            .MaximumLength(100);

        RuleFor(x => x.Color)
            .MaximumLength(20);
    }
}