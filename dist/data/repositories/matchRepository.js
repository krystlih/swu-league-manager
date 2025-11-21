"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class MatchRepository {
    async create(leagueId, roundId, player1Id, player2Id, tableNumber, isBye = false) {
        const data = {
            leagueId,
            roundId,
            player1Id,
            tableNumber,
            isBye,
        };
        if (player2Id !== null) {
            data.player2Id = player2Id;
        }
        return prismaClient_1.prisma.match.create({ data });
    }
    async findById(id) {
        return prismaClient_1.prisma.match.findUnique({
            where: { id },
            include: {
                player1: true,
                player2: true,
            },
        });
    }
    async findByRound(roundId) {
        return prismaClient_1.prisma.match.findMany({
            where: { roundId },
            include: {
                player1: true,
                player2: true,
            },
            orderBy: { tableNumber: 'asc' },
        });
    }
    async findByLeague(leagueId) {
        return prismaClient_1.prisma.match.findMany({
            where: { leagueId },
            include: {
                player1: true,
                player2: true,
                round: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async update(id, data) {
        return prismaClient_1.prisma.match.update({
            where: { id },
            data,
        });
    }
    async reportResult(id, player1Wins, player2Wins, draws) {
        console.log(`[DEBUG MatchRepository] reportResult called with:`, { id, player1Wins, player2Wins, draws });
        const result = await prismaClient_1.prisma.match.update({
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
    async deleteByRound(roundId) {
        await prismaClient_1.prisma.match.deleteMany({
            where: { roundId },
        });
    }
    async deleteByLeague(leagueId) {
        await prismaClient_1.prisma.match.deleteMany({
            where: { leagueId },
        });
    }
    async findAll() {
        return prismaClient_1.prisma.match.findMany({
            include: {
                player1: true,
                player2: true,
                league: true,
            },
        });
    }
}
exports.MatchRepository = MatchRepository;
