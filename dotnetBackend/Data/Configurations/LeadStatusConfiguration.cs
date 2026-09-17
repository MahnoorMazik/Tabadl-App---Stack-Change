using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabadl.Api.Domain.Entities;

namespace Tabadl.Api.Data.Configurations;

public class LeadStatusConfiguration : IEntityTypeConfiguration<LeadStatus>
{
    public void Configure(EntityTypeBuilder<LeadStatus> builder)
    {
        builder.ToTable("lead_statuses");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasMaxLength(36);
        builder.Property(r => r.Name).HasMaxLength(100).IsRequired();
        builder.Property(r => r.Color).HasMaxLength(20);

        builder.HasIndex(r => r.Name).IsUnique();
    }
}