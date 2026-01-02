import { PrismaClient } from '@prisma/client'

/**
 * Database Configuration
 * Prisma client'ı yönetir ve singleton olarak sunar
 */

let prismaInstance: PrismaClient | null = null

/**
 * Prisma instance'ını ayarla
 */
export function setPrisma(prisma: PrismaClient): void {
  prismaInstance = prisma
}

/**
 * Prisma instance'ını al
 */
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    throw new Error('Prisma henüz başlatılmamış. setPrisma() ile ayarlayın.')
  }
  return prismaInstance
}

/**
 * Prisma'nın başlatılıp başlatılmadığını kontrol et
 */
export function isPrismaInitialized(): boolean {
  return prismaInstance !== null
}

export default {
  setPrisma,
  getPrisma,
  isPrismaInitialized
}
