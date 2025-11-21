"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class RegistrationRepository {
    async create(leagueId, playerId) {
        return prismaClient_1.prisma.registration.create({
            data: {
                leagueId,
                playerId,
            },
        });
    }
    async findByLeagueAndPlayer(leagueId, playerId) {
        return prismaClient_1.prisma.registration.findUnique({
            where: {
                leagueId_playerId: {
                    leagueId,
                    playerId,
                },
            },
        });
    }
    async findByLeague(leagueId) {
        return prismaClient_1.prisma.registration.findMany({
            where: { leagueId },
            include: { player: true },
        });
    }
    async update(id, data) {
        return prismaClient_1.prisma.registration.update({
            where: { id },
            data,
        });
    }
    async getStandings(leagueId) {
        const registrations = await prismaClient_1.prisma.registration.findMany({
            where: { leagueId, isActive: true },
            include: { player: true },
            orderBy: [
                { matchPoints: 'desc' },
                { omwPercent: 'desc' },
                { gwPercent: 'desc' },
                { ogwPercent: 'desc' },
            ],
        });
        return registrations.map((reg, index) => ({
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
    async drop(leagueId, playerId) {
        const registration = await this.findByLeagueAndPlayer(leagueId, playerId);
        if (!registration) {
            throw new Error('Registration not found');
        }
        return prismaClient_1.prisma.registration.update({
            where: { id: registration.id },
            data: { isActive: false },
        });
    }
    async findAll() {
        return prismaClient_1.prisma.registration.findMany({
            include: { player: true, league: true },
        });
    }
}
exports.RegistrationRepository = RegistrationRepository;
