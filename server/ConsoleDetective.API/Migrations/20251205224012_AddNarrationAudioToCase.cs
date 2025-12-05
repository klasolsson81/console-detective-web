using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsoleDetective.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNarrationAudioToCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "NarrationAudio",
                table: "Cases",
                type: "bytea",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NarrationAudio",
                table: "Cases");
        }
    }
}
