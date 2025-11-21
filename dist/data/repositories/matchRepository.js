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
        return prismaClient_1.prisma.match.update({
            where: { id },
            data: {
                player1Wins,
                player2Wins,
                draws,
                isCompleted: true,
            },
        });
    }
    async deleteByRound(roundId) {
        await prismaClient_1.prisma.match.deleteMany({
            where: { roundId },
        });
    }
}
exports.MatchRepository = MatchRepository;
