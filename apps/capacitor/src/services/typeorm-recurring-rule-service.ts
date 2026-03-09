import { type Repository } from 'typeorm'

import { RecurringRule } from 'src/domain/RecurringRule'
import type { RecurringRule as RecurringRuleEntity } from 'src/databases/entities/expenses'
import type { IRecurringRuleService } from './types/IRecurringRuleService'
import type { IServiceResult } from './types/IServiceResult'
import { getRecurringRuleRepository } from 'src/databases/repositories/recurring-rule-repository'
import type { IServiceListOptions } from './types/IService'
import { ServiceResult } from './service-result'

export class TypeOrmRecurringRuleService implements IRecurringRuleService {
  repository: Repository<RecurringRuleEntity>

  constructor() {
    this.repository = getRecurringRuleRepository()
  }

  static modelFromEntity(entity: RecurringRuleEntity) {
    const model = new RecurringRule(entity)
    return model
  }

  async list(
    options: IServiceListOptions = { relations: [] },
  ): Promise<IServiceResult<RecurringRule[]>> {
    try {
      const recurringRules = (
        await this.repository.find({
          relations: Object.fromEntries(options.relations.map((relation) => [relation, true])),
        })
      ).map((recurringRule) => TypeOrmRecurringRuleService.modelFromEntity(recurringRule))
      return ServiceResult.ok(recurringRules)
    } catch (error) {
      return ServiceResult.error(error)
    }
  }
  async findBy(id: number): Promise<IServiceResult<RecurringRule>> {
    try {
      return ServiceResult.ok(
        TypeOrmRecurringRuleService.modelFromEntity(await this.repository.findOneByOrFail({ id })),
      )
    } catch (error) {
      return ServiceResult.error(error)
    }
  }
  async insert(entity: Omit<RecurringRule, 'id'>): Promise<IServiceResult<RecurringRule>> {
    try {
      const recurringRuleToSave = this.repository.create(entity)
      const recurringRule = await this.repository.save(recurringRuleToSave)
      return ServiceResult.ok(TypeOrmRecurringRuleService.modelFromEntity(recurringRule))
    } catch (error) {
      return ServiceResult.error(error)
    }
  }
  async update(entity: RecurringRule): Promise<IServiceResult<RecurringRule>> {
    try {
      const recurringRuleToSave = this.repository.create(entity)
      const recurringRule = await this.repository.save(recurringRuleToSave)
      return ServiceResult.ok(TypeOrmRecurringRuleService.modelFromEntity(recurringRule))
    } catch (error) {
      return ServiceResult.error(error)
    }
  }
  async remove(id: number): Promise<IServiceResult<void>> {
    try {
      await this.repository.delete(id)
      return ServiceResult.ok(undefined)
    } catch (error) {
      return ServiceResult.error(error)
    }
  }
}
