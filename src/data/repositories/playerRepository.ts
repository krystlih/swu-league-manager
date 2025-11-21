import { prisma } from '../prismaClient';
import { Player } from '../../types';

export class PlayerRepository {
  async create(discordId: string, username: string): Promise<Player> {
    return prisma.player.create({
      data: {
        discordId,
        username,
      },
    });
  }

  async findByDiscordId(discordId: string): Promise<Player | null> {
    return prisma.player.findUnique({
      where: { discordId },
    });
  }

  async findOrCreate(discordId: string, username: string): Promise<Player> {
    const existing = await this.findByDiscordId(discordId);
    if (existing) {
      return existing;
    }
    return this.create(discordId, username);
  }

  async update(discordId: string, username: string): Promise<Player> {
    return prisma.player.update({
      where: { discordId },
      data: { username },
    });
  }

  async findById(id: number): Promise<Player | null> {
    return prisma.player.findUnique({
      where: { id },
    });
  }
}
