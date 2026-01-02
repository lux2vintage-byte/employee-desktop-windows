/**
 * Base Entity - Tüm entity'ler için temel sınıf
 */
export class BaseEntity {
  id: number | null
  createdAt: Date | null
  updatedAt: Date | null

  constructor(data: any = {}) {
    this.id = data.id || null
    this.createdAt = data.createdAt || null
    this.updatedAt = data.updatedAt || null
  }

  /**
   * Entity'nin yeni olup olmadığını kontrol et
   */
  isNew(): boolean {
    return !this.id
  }

  /**
   * Entity'yi JSON'a çevir (IPC için serializable)
   */
  toJSON(): any {
    return {
      ...this,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: this.updatedAt instanceof Date ? this.updatedAt.toISOString() : this.updatedAt
    }
  }

  /**
   * Validasyon - Alt sınıflar override etmeli
   */
  validate(): string[] {
    return []
  }
}

export default BaseEntity
