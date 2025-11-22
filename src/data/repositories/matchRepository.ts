import { prisma } from '../prismaClient';
import { Match } from '../../types';

export class MatchRepository {
  async create(
    leagueId: number,
    roundId: number,
    player1Id: number,
    player2Id: number | null,
    tableNumber: number,
    isBye: boolean = false,
    bracketPosition?: string,
    isLosersBracket?: boolean,
    isGrandFinals?: boolean,
    isBracketReset?: boolean
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

    if (bracketPosition) {
      data.bracketPosition = bracketPosition;
    }

    if (isLosersBracket !== undefined) {
      data.isLosersBracket = isLosersBracket;
    }

    if (isGrandFinals !== undefined) {
      data.isGrandFinals = isGrandFinals;
    }

    if (isBracketReset !== undefined) {
      data.isBracketReset = isBracketReset;
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
    console.log(`[DEBUG MatchRepository] reportResult called with:`, { id, player1Wins, player2Wins, draws });
    
    const result = await prisma.match.update({
      where: { id },
      data: {
        player1Wins,
        player2Wins,
        draws,
        isCompleted: true,
      },
    });
    
    console.log(`[DEBUG MatchRepository] Match updated successfully:`, {
      id: result.id,
      player1Wins: result.player1Wins,
      player2Wins: result.player2Wins,
      draws: result.draws,
      isCompleted: result.isCompleted,
    });
    
    return result;
  }

  async deleteByRound(roundId: number): Promise<void> {
    await prisma.match.deleteMany({
      where: { roundId },
    });
  }

  async deleteByLeague(leagueId: number): Promise<void> {
    await prisma.match.deleteMany({
      where: { leagueId },
    });
  }

  async findAll(): Promise<Match[]> {
    return prisma.match.findMany({
      include: {
        player1: true,
        player2: true,
        league: true,
      },
    });
  }
}
