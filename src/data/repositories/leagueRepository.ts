import { prisma } from '../prismaClient';
import { League, CreateLeagueOptions } from '../../types';

export class LeagueRepository {
  async create(options: CreateLeagueOptions): Promise<League> {
    return prisma.league.create({
      data: {
        guildId: options.guildId,
        createdBy: options.createdBy,
        name: options.name,
        format: options.format,
        competitionType: options.competitionType,
        status: 'REGISTRATION',
        currentRound: 0,
        totalRounds: options.totalRounds,
      },
    }) as any;
  }

  async findById(id: number): Promise<League | null> {
    return prisma.league.findUnique({
      where: { id },
    }) as any;
  }

  async findByGuildId(guildId: string): Promise<League[]> {
    return prisma.league.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async findActiveByGuildId(guildId: string): Promise<League[]> {
    return prisma.league.findMany({
      where: {
        guildId,
        status: {
          in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'],
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async update(id: number, data: any): Promise<League> {
    return prisma.league.update({
      where: { id },
      data,
    }) as any;
  }

  async delete(id: number): Promise<void> {
    await prisma.league.delete({
      where: { id },
    });
  }

  async findAll(): Promise<League[]> {
    return prisma.league.findMany({
      orderBy: { createdAt: 'desc' },
    }) as any;
  }
}
