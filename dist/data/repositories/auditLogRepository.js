"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const prismaClient_1 = require("../prismaClient");
class AuditLogRepository {
    async create(options) {
        return prismaClient_1.prisma.auditLog.create({
            data: options,
        });
    }
    async findByLeague(leagueId) {
        return prismaClient_1.prisma.auditLog.findMany({
            where: { leagueId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByUser(userId) {
        return prismaClient_1.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findRecent(leagueId, limit = 50) {
        return prismaClient_1.prisma.auditLog.findMany({
            where: { leagueId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
exports.AuditLogRepository = AuditLogRepository;
