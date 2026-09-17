using Microsoft.EntityFrameworkCore;
using Tabadl.Api.Domain.Entities;

namespace Tabadl.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<ClientGroup> ClientGroups { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;

    public DbSet<LeadStatus> LeadStatuses { get; set; } = null!; 

    protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    modelBuilder.Entity<Role>().HasQueryFilter(r => !r.IsDeleted);  
}
}