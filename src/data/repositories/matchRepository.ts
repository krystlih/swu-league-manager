import { prisma } from '../prismaClient';
import { Match } from '../../types';

export class MatchRepository {
  async create(
    leagueId: number,
    roundId: number,
    player1Id: number,
    player2Id: number | null,
    tableNumber: number,
    isBye: boolean = false
  ): Promise<Match> {
    const data: any = {
      leagueId,
      roundId,
      player1Id,
      tableNumber,
      isBye,
    };
    
    if (player2Id !== null) {
      data.player2Id = player2Id;
    }
    
    return prisma.match.create({ data });
  }

  async findById(id: number): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { id },
      include: {
        player1: true,
        player2: true,
      },
    });
  }

  async findByRound(roundId: number): Promise<Match[]> {
    return prisma.match.findMany({
      where: { roundId },
      include: {
        player1: true,
        player2: true,
      },
      orderBy: { tableNumber: 'asc' },
    });
  }

  async findByLeague(leagueId: number): Promise<Match[]> {
    return prisma.match.findMany({
      where: { leagueId },
      include: {
        player1: true,
        player2: true,
        round: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: number, data: any): Promise<Match> {
    return prisma.match.update({
      where: { id },
      data,
    }) as any;
  }

  async reportResult(
    id: number,
    player1Wins: number,
    player2Wins: number,
    draws: number
  ): Promise<Match> {
    return prisma.match.update({
      where: { id },
      data: {
        player1Wins,
        player2Wins,
        draws,
        isCompleted: true,
      },
    });
  }

  async deleteByRound(roundId: number): Promise<void> {
    await prisma.match.deleteMany({
      where: { roundId },
    });
  }
}
