import { prisma } from '../prismaClient';
import { Match } from '../../types';

export class MatchRepository {
  async create(
    roundId: number,
    player1Id: number,
    player2Id: number | null,
    tableNumber: number
  ): Promise<Match> {
    const data: any = {
      roundId,
      player1Id,
      tableNumber,
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
}
