import { getPrisma } from '../database/config'
import { PrismaClient } from '@prisma/client'

export interface UserFindAllOptions {
  search?: string
  isVerified?: string
  role?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  page?: number
}

export interface UserFindAllResult {
  users: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Kullanıcı Repository
 */
export class UserRepository {
  private modelName: string = 'user'

  get prisma(): PrismaClient {
    return getPrisma()
  }

  get model() {
    return this.prisma.user
  }

  /**
   * Kullanıcı oluştur
   */
  async create(data: any): Promise<any> {
    const result = await this.model.create({
      data: {
        ...data,
        profilePic: data.profilePic ? JSON.stringify(data.profilePic) : null
      },
      select: this.getSelectFields()
    })
    return JSON.parse(JSON.stringify(result))
  }

  /**
   * ID ile kullanıcı bul
   */
  async findById(id: number): Promise<any | null> {
    const user = await this.model.findUnique({
      where: { id },
      select: this.getSelectFields()
    })

    if (!user) return null
    
    const plainUser = JSON.parse(JSON.stringify(user))
    if (plainUser.profilePic) {
      plainUser.profilePic = JSON.parse(plainUser.profilePic)
    }
    return plainUser
  }

  /**
   * Email ile kullanıcı bul
   */
  async findByEmail(email: string): Promise<any | null> {
    const user = await this.model.findUnique({
      where: { email },
      select: this.getSelectFields()
    })

    if (!user) return null
    
    const plainUser = JSON.parse(JSON.stringify(user))
    if (plainUser.profilePic) {
      plainUser.profilePic = JSON.parse(plainUser.profilePic)
    }
    return plainUser
  }

  /**
   * Email ile kullanıcı bul (şifre dahil)
   */
  async findByEmailWithPassword(email: string): Promise<any | null> {
    const result = await this.model.findUnique({
      where: { email }
    })
    return result ? JSON.parse(JSON.stringify(result)) : null
  }

  /**
   * Kullanıcıları getir
   */
  async findAll(options: UserFindAllOptions = {}): Promise<UserFindAllResult> {
    const {
      search,
      isVerified,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 25,
      page = 1
    } = options

    const skip = (page - 1) * limit
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { lastname: { contains: search } },
        { email: { contains: search } },
        { companyname: { contains: search } }
      ]
    }

    if (isVerified !== undefined && isVerified !== '') {
      where.isVerified = isVerified === 'true'
    }

    if (role) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      this.model.findMany({
        where,
        select: this.getSelectFields(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      this.model.count({ where })
    ])

    // Prisma objelerini plain object'e çevir
    const parsedUsers = JSON.parse(JSON.stringify(users)).map((user: any) => ({
      ...user,
      profilePic: user.profilePic ? JSON.parse(user.profilePic) : null
    }))

    return {
      users: parsedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Kullanıcı güncelle
   */
  async update(id: number, data: any): Promise<any> {
    const updateData = { ...data }

    if (updateData.profilePic) {
      updateData.profilePic = JSON.stringify(updateData.profilePic)
    }

    const user = await this.model.update({
      where: { id },
      data: updateData,
      select: this.getSelectFields()
    })

    const plainUser = JSON.parse(JSON.stringify(user))
    if (plainUser.profilePic) {
      plainUser.profilePic = JSON.parse(plainUser.profilePic)
    }
    return plainUser
  }

  /**
   * Kullanıcı sil
   */
  async delete(id: number): Promise<any> {
    const result = await this.model.delete({ where: { id } })
    return JSON.parse(JSON.stringify(result))
  }

  /**
   * Şifre güncelle
   */
  async updatePassword(id: number, hashedPassword: string): Promise<any> {
    const result = await this.model.update({
      where: { id },
      data: { password: hashedPassword }
    })
    return JSON.parse(JSON.stringify(result))
  }

  /**
   * İlk admin kullanıcıyı bul
   */
  async findFirstAdmin(): Promise<any | null> {
    const admin = await this.model.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: this.getSelectFields()
    })

    if (!admin) return null
    
    const plainAdmin = JSON.parse(JSON.stringify(admin))
    if (plainAdmin.profilePic) {
      plainAdmin.profilePic = JSON.parse(plainAdmin.profilePic)
    }
    return plainAdmin
  }

  /**
   * Müşteri istatistikleri
   */
  async getCustomerStats(): Promise<{ total: number; active: number; pending: number }> {
    const [total, active, pending] = await Promise.all([
      this.model.count({ where: { role: 'USER' } }),
      this.model.count({ where: { role: 'USER', isVerified: true } }),
      this.model.count({ where: { role: 'USER', isVerified: false } })
    ])

    return { total, active, pending }
  }

  /**
   * Select alanları (şifre hariç)
   */
  private getSelectFields() {
    return {
      id: true,
      companyname: true,
      name: true,
      lastname: true,
      taxoffice: true,
      taxnumber: true,
      type: true,
      email: true,
      phone: true,
      discountRate: true,
      role: true,
      profilePic: true,
      isVerified: true,
      verified: true,
      createdAt: true,
      updatedAt: true
    }
  }
}

export default UserRepository
