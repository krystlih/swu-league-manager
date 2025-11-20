import { prisma } from '../prismaClient';
import { Registration, StandingsEntry } from '../../types';

export class RegistrationRepository {
  async create(leagueId: number, playerId: number): Promise<Registration> {
    return prisma.registration.create({
      data: {
        leagueId,
        playerId,
      },
    });
  }

  async findByLeagueAndPlayer(leagueId: number, playerId: number): Promise<Registration | null> {
    return prisma.registration.findUnique({
      where: {
        leagueId_playerId: {
          leagueId,
          playerId,
        },
      },
    });
  }

  async findByLeague(leagueId: number): Promise<Registration[]> {
    return prisma.registration.findMany({
      where: { leagueId },
      include: { player: true },
    });
  }

  async update(id: number, data: any): Promise<Registration> {
    return prisma.registration.update({
      where: { id },
      data,
    }) as any;
  }

  async getStandings(leagueId: number): Promise<StandingsEntry[]> {
    const registrations = await prisma.registration.findMany({
      where: { leagueId, isActive: true },
      include: { player: true },
      orderBy: [
        { matchPoints: 'desc' },
        { omwPercent: 'desc' },
        { gwPercent: 'desc' },
        { ogwPercent: 'desc' },
      ],
    });

    return registrations.map((reg: any, index: number) => ({
      rank: index + 1,
      playerId: reg.playerId.toString(),
      playerName: reg.player.username,
      wins: reg.wins,
      losses: reg.losses,
      draws: reg.draws,
      matchPoints: reg.matchPoints,
      omwPercent: reg.omwPercent,
      gwPercent: reg.gwPercent,
      ogwPercent: reg.ogwPercent,
    }));
  }

  async drop(leagueId: number, playerId: number): Promise<Registration> {
    const registration = await this.findByLeagueAndPlayer(leagueId, playerId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    return prisma.registration.update({
      where: { id: registration.id },
      data: { isActive: false },
    });
  }
}
