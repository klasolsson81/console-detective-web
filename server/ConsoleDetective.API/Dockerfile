# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["ConsoleDetective.API.csproj", "./"]
RUN dotnet restore "ConsoleDetective.API.csproj"

# Copy everything else and build
COPY . .
RUN dotnet publish "ConsoleDetective.API.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Install Python and edge-tts for free TTS fallback
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install edge-tts --break-system-packages && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Railway uses PORT environment variable
ENV ASPNETCORE_URLS=http://+:$PORT

EXPOSE $PORT

ENTRYPOINT ["dotnet", "ConsoleDetective.API.dll"]
