import { Events, Interaction } from 'discord.js';
import { commands } from '../commands';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      console.log(`[AUTOCOMPLETE] ${interaction.user.tag} (${interaction.user.id}) - /${interaction.commandName} - Guild: ${interaction.guildId}`);
      
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

    // Log incoming command
    const options = interaction.options.data.map(opt => `${opt.name}=${opt.value}`).join(', ');
    console.log(`[COMMAND] ${interaction.user.tag} (${interaction.user.id}) - /${interaction.commandName}${options ? ` ${options}` : ''} - Guild: ${interaction.guildId}`);

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
