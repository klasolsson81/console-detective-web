using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsoleDetective.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAudioToClues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "Audio",
                table: "Clues",
                type: "BLOB",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Audio",
                table: "Clues");
        }
    }
}
