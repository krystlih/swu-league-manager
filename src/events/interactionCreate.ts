import { Events, Interaction } from 'discord.js';
import { commands } from '../commands';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command: any = commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      if (command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
        }
      }
      return;
    }

    // Handle chat input commands
    if (!interaction.isChatInputCommand()) return;

    const command: any = commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const reply = {
        content: 'There was an error executing this command!',
        flags: 64, // EPHEMERAL flag
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
