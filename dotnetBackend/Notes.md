## Nayi entity banani ho
1. Domain/Entities/Xyz.cs
2. AppDbContext me DbSet
3. Data/Configurations/XyzConfiguration.cs
4. dotnet ef migrations add AddXyz
5. dotnet ef database update

## Configuration ka template
builder.ToTable("xyz");
builder.Property(x => x.Id).HasMaxLength(36);
builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
builder.HasIndex(x => x.Name).IsUnique();