using FluentValidation;
using Tabadl.Api.Features.Roles.Dtos;

namespace Tabadl.Api.Features.Roles.Validators;

public class CreateRoleValidator : AbstractValidator<CreateRoleRequest>
{
    public CreateRoleValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters")
            .MaximumLength(100);

        RuleFor(x => x.Description)
            .MaximumLength(500);
    }
}