using ConsoleDetective.API.Data;
using ConsoleDetective.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// === Configuration ===
var configuration = builder.Configuration;

// Railway använder PORT environment variable
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// === Database Setup ===
// Railway: PostgreSQL med DATABASE_URL
// Lokal utveckling: SQLite
if (builder.Environment.IsProduction())
{
    // Railway sätter DATABASE_URL automatiskt när Postgres är länkad
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

    if (!string.IsNullOrEmpty(databaseUrl))
    {
        // Konvertera Railway's postgres:// URL till Npgsql connection string
        var connectionString = ConvertRailwayDatabaseUrl(databaseUrl);
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        Console.WriteLine("✅ Använder PostgreSQL (Railway)");
    }
    else
    {
        throw new InvalidOperationException("DATABASE_URL saknas i produktion. Länka en PostgreSQL-databas i Railway.");
    }
}
else
{
    // Lokal utveckling med SQLite
    var connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=consoledetective.db";

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));

    Console.WriteLine("✅ Använder SQLite (Utveckling)");
}

// === JWT Authentication ===
var jwtSecret = configuration["Jwt:Secret"] 
    ?? throw new InvalidOperationException("JWT Secret saknas");
var jwtIssuer = configuration["Jwt:Issuer"] ?? "ConsoleDetectiveAPI";
var jwtAudience = configuration["Jwt:Audience"] ?? "ConsoleDetectiveClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// === CORS Policy ===
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // I utveckling: tillåt alla localhost-portar
            policy.SetIsOriginAllowed(origin =>
                origin.StartsWith("http://localhost:") ||
                origin.StartsWith("https://localhost:"))
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        }
        else
        {
            // I produktion: specifika origins
            policy.WithOrigins(
                "https://*.vercel.app",
                "https://*.railway.app",
                "https://consoledetective.klasolsson.se" // Din custom domain
            )
            .SetIsOriginAllowedToAllowWildcardSubdomains()
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        }
    });
});

// === Services Registration ===
builder.Services.AddScoped<AIService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CaseService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<EmailService>();

// === Controllers ===
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for JSON properties (sessionId instead of SessionId)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// === Swagger/OpenAPI ===
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "Console Detective API", 
        Version = "v1",
        Description = "AI-powered detective game API"
    });
    
    // JWT Bearer Authentication i Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new()
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// === Build App ===
var app = builder.Build();

// === Middleware Pipeline ===

// CORS måste vara tidigt i pipelinen
app.UseCors("AllowFrontend");

// Swagger i ALLA miljöer (även production för testing)
app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Console Detective API v1");
    c.RoutePrefix = "swagger"; // Tillgänglig på /swagger
});

// --- MODIFIERAD FELHANTERING FÖR FELSÖKNING ---
// Vi tvingar fram detaljerade fel även i produktion just nu.
// Detta hjälper oss se varför servern kraschar istället för att bara visa 404.
app.UseDeveloperExceptionPage(); 

/* SPARA FÖR SENARE (När allt fungerar):
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/error");
    // HSTS borttaget för Railway compatibility
}
*/
// ----------------------------------------------

// HTTPS Redirection - BORTTAGET för Railway
// app.UseHttpsRedirection();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// === Database Migration (auto-update i development) ===
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();

        // Vi kör migration även i produktion för att säkerställa att tabeller finns
        // OBS: Detta är riskabelt med SQLite på Railway då filen kan skrivas över
        // men nödvändigt för att det ska funka initialt.
        context.Database.Migrate();
        Console.WriteLine("✅ Databas migrerad");

        // Skapa guest user om den inte finns
        var guestUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var guestUser = context.Users.Find(guestUserId);

        if (guestUser == null)
        {
            guestUser = new ConsoleDetective.API.Models.Domain.User
            {
                Id = guestUserId,
                Username = "Guest User",
                Email = "guest@consoledetective.local",
                PasswordHash = "", // Inget lösenord för guest
                IsVerified = true,
                Points = 0,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(guestUser);
            context.SaveChanges();
            Console.WriteLine("✅ Guest user skapad");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ett fel uppstod vid databasmigrering");
    }
}

// === HEALTH CHECK ===
// Lägg till denna så du kan se att servern lever genom att gå till startsidan
app.MapGet("/", () => "Console Detective API is running! 🕵️‍♂️");

// === Start Application ===
app.Run();

// === Helper Functions ===
static string ConvertRailwayDatabaseUrl(string databaseUrl)
{
    // Railway URL format: postgres://user:password@host:port/database
    // Vi behöver konvertera till Npgsql format
    try
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');

        var builder = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port,
            Username = userInfo[0],
            Password = userInfo.Length > 1 ? userInfo[1] : "",
            Database = uri.LocalPath.TrimStart('/')
        };

        return builder.ToString();
    }
    catch (Exception ex)
    {
        throw new InvalidOperationException($"Kunde inte parsa DATABASE_URL: {ex.Message}");
    }
}