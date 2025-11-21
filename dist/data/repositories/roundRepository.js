"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class RoundRepository {
    async create(leagueId, roundNumber) {
        return prismaClient_1.prisma.round.create({
            data: {
                leagueId,
                roundNumber,
            },
        });
    }
    async findByLeagueAndRound(leagueId, roundNumber) {
        return prismaClient_1.prisma.round.findUnique({
            where: {
                leagueId_roundNumber: {
                    leagueId,
                    roundNumber,
                },
            },
        });
    }
    async findByLeague(leagueId) {
        return prismaClient_1.prisma.round.findMany({
            where: { leagueId },
            orderBy: { roundNumber: 'asc' },
        });
    }
    async delete(id) {
        await prismaClient_1.prisma.round.delete({
            where: { id },
        });
    }
    async findById(id) {
        return prismaClient_1.prisma.round.findUnique({
            where: { id },
        });
    }
}
exports.RoundRepository = RoundRepository;
