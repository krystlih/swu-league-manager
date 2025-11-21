"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class LeagueRepository {
    async create(options) {
        return prismaClient_1.prisma.league.create({
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
        });
    }
    async findById(id) {
        return prismaClient_1.prisma.league.findUnique({
            where: { id },
        });
    }
    async findByGuildId(guildId) {
        return prismaClient_1.prisma.league.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findActiveByGuildId(guildId) {
        return prismaClient_1.prisma.league.findMany({
            where: {
                guildId,
                status: {
                    in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'],
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, data) {
        return prismaClient_1.prisma.league.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        await prismaClient_1.prisma.league.delete({
            where: { id },
        });
    }
    async findAll() {
        return prismaClient_1.prisma.league.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.LeagueRepository = LeagueRepository;
