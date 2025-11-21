"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commands_1 = require("../commands");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    async execute(interaction) {
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            const command = commands_1.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            if (command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                }
                catch (error) {
                    console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
                }
            }
            return;
        }
        // Handle chat input commands
        if (!interaction.isChatInputCommand())
            return;
        const command = commands_1.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            const reply = {
                content: 'There was an error executing this command!',
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            }
            else {
                await interaction.reply(reply);
            }
        }
    },
};
