using ConsoleDetective.API.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace ConsoleDetective.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSets (tabeller)
        public DbSet<User> Users { get; set; }
        public DbSet<Case> Cases { get; set; }
        public DbSet<Clue> Clues { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<InterrogationSession> InterrogationSessions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // === User Configuration ===
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Username).IsUnique();
                
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PasswordHash).IsRequired();
                
                // En användare har många fall
                entity.HasMany(e => e.Cases)
                    .WithOne(e => e.User)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // === Case Configuration ===
            modelBuilder.Entity<Case>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).IsRequired();
                entity.Property(e => e.Guilty).IsRequired().HasMaxLength(100);
                
                // Ett fall har många ledtrådar
                entity.HasMany(e => e.Clues)
                    .WithOne(e => e.Case)
                    .HasForeignKey(e => e.CaseId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // Ett fall har många förhörssessioner
                entity.HasMany(e => e.InterrogationSessions)
                    .WithOne(e => e.Case)
                    .HasForeignKey(e => e.CaseId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // JSON-konvertering för PossibleSuspects-listan
                entity.Property(e => e.PossibleSuspects)
                    .HasConversion(
                        v => string.Join(',', v),
                        v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    );
            });

            // === Clue Configuration ===
            modelBuilder.Entity<Clue>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Text).IsRequired();
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            });

            // === InterrogationSession Configuration ===
            modelBuilder.Entity<InterrogationSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.SuspectName).IsRequired().HasMaxLength(100);
                
                // En session har många meddelanden
                entity.HasMany(e => e.Messages)
                    .WithOne(e => e.Session)
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // === ChatMessage Configuration ===
            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Role).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.EmotionalTone).HasMaxLength(50);
            });
        }
    }
}