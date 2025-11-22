import { Collection } from 'discord.js';
import { registrationCommand } from './registration';
import { manualRegisterCommand } from './manualRegister';
import { tournamentCommand } from './tournament';
import { standingsCommand } from './standings';
import { historyCommand } from './history';
import { statsCommand } from './stats';

export const commands = new Collection();

commands.set(registrationCommand.data.name, registrationCommand);
commands.set(manualRegisterCommand.data.name, manualRegisterCommand);
commands.set(tournamentCommand.data.name, tournamentCommand);
commands.set(standingsCommand.data.name, standingsCommand);
commands.set(historyCommand.data.name, historyCommand);
commands.set(statsCommand.data.name, statsCommand);
