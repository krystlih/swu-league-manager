import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import { commands } from './commands';
import readyEvent from './events/ready';
import interactionCreateEvent from './events/interactionCreate';
import { RoundTimerService } from './services/roundTimerService';
import { LeagueService } from './services/leagueService';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables');
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Initialize services with client
const timerService = RoundTimerService.getInstance();
timerService.setClient(client);

const leagueService = LeagueService.getInstance();
leagueService.setClient(client);

// Register event handlers
client.once('ready', (readyClient) => readyEvent.execute(readyClient));
client.on('interactionCreate', (interaction) => interactionCreateEvent.execute(interaction));

// Register slash commands
async function registerCommands() {
  const rest = new REST().setToken(token!);

  const commandsData = Array.from(commands.values()).map((cmd: any) => cmd.data.toJSON());

  try {
    console.log(`Started refreshing ${commandsData.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(clientId!),
      { body: commandsData },
    ) as any[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Start bot
async function start() {
  await registerCommands();
  await client.login(token);
}

start().catch(console.error);
