/**
 * Base Service - Tüm service'ler için temel sınıf
 */
export class BaseService<T = any> {
  protected repository: any

  constructor(repository: any) {
    this.repository = repository
  }

  /**
   * Tüm kayıtları getir
   */
  async findAll(options: any = {}): Promise<any> {
    return await this.repository.findAll(options)
  }

  /**
   * ID ile kayıt bul
   */
  async findById(id: number): Promise<T | null> {
    return await this.repository.findById(id)
  }

  /**
   * Kayıt oluştur
   */
  async create(data: any): Promise<T> {
    return await this.repository.create(data)
  }

  /**
   * Kayıt güncelle
   */
  async update(id: number, data: any): Promise<T> {
    return await this.repository.update(id, data)
  }

  /**
   * Kayıt sil
   */
  async delete(id: number): Promise<T> {
    return await this.repository.delete(id)
  }
}

export default BaseService
