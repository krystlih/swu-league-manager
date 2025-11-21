import { prisma } from '../prismaClient';
import { AuditLog } from '../../types';

export interface CreateAuditLogOptions {
  leagueId: number;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId?: number;
  oldValue?: string;
  newValue?: string;
  description: string;
}

export class AuditLogRepository {
  async create(options: CreateAuditLogOptions): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: options,
    });
  }

  async findByLeague(leagueId: number): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { leagueId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecent(leagueId: number, limit: number = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { leagueId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
