import { prisma } from '../prismaClient';
import { Round } from '../../types';

export class RoundRepository {
  async create(leagueId: number, roundNumber: number): Promise<Round> {
    return prisma.round.create({
      data: {
        leagueId,
        roundNumber,
      },
    });
  }

  async findByLeagueAndRound(leagueId: number, roundNumber: number): Promise<Round | null> {
    return prisma.round.findUnique({
      where: {
        leagueId_roundNumber: {
          leagueId,
          roundNumber,
        },
      },
    });
  }

  async findByLeague(leagueId: number): Promise<Round[]> {
    return prisma.round.findMany({
      where: { leagueId },
      orderBy: { roundNumber: 'asc' },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.round.delete({
      where: { id },
    });
  }

  async findById(id: number): Promise<Round | null> {
    return prisma.round.findUnique({
      where: { id },
    });
  }

  async update(leagueId: number, roundNumber: number, data: any): Promise<Round> {
    return prisma.round.update({
      where: {
        leagueId_roundNumber: {
          leagueId,
          roundNumber,
        },
      },
      data,
    });
  }
}
