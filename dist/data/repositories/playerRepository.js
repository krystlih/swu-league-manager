"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class PlayerRepository {
    async create(discordId, username) {
        return prismaClient_1.prisma.player.create({
            data: {
                discordId,
                username,
            },
        });
    }
    async findByDiscordId(discordId) {
        return prismaClient_1.prisma.player.findUnique({
            where: { discordId },
        });
    }
    async findOrCreate(discordId, username) {
        const existing = await this.findByDiscordId(discordId);
        if (existing) {
            return existing;
        }
        return this.create(discordId, username);
    }
    async update(discordId, username) {
        return prismaClient_1.prisma.player.update({
            where: { discordId },
            data: { username },
        });
    }
}
exports.PlayerRepository = PlayerRepository;
