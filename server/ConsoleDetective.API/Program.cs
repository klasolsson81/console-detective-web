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
// SQLite för utveckling, PostgreSQL för produktion
var connectionString = configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=consoledetective.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

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
        policy.WithOrigins(
            "http://localhost:5173",  // Vite dev server
            "http://localhost:3000",  // Alternative React port
            "https://localhost:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// === Services Registration ===
builder.Services.AddScoped<AIService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CaseService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<EmailService>();

// === Controllers ===
builder.Services.AddControllers();

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

// Development-specifik middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => 
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Console Detective API v1");
    });
    
    // Visa detaljerade fel i development
    app.UseDeveloperExceptionPage();
}
else
{
    // Production error handling
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// HTTPS Redirection
app.UseHttpsRedirection();

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
        
        if (app.Environment.IsDevelopment())
        {
            // Auto-migrate i development
            context.Database.Migrate();
            Console.WriteLine("✅ Databas migrerad");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ett fel uppstod vid databasmigrering");
    }
}

// === Start Application ===
app.Run();