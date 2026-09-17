using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabadl.Api.Domain.Entities;

namespace Tabadl.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id).HasMaxLength(36);
        builder.Property(u => u.Email).HasMaxLength(255).IsRequired();
        builder.Property(u => u.Name).HasMaxLength(255);
        builder.Property(u => u.PasswordHash).HasMaxLength(60).IsRequired();
        builder.Property(u => u.CustomRoleId).HasMaxLength(36);

        builder.HasIndex(u => u.Email);

        builder.HasOne(u => u.CustomRole)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.CustomRoleId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}