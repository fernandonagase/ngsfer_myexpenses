import { type FindManyOptions, type Repository } from 'typeorm'

import { RecurringRule } from 'src/domain/RecurringRule'
import type {
  Operation,
  RecurringRule as RecurringRuleEntity,
} from 'src/databases/entities/expenses'
import type { IRecurringRuleService } from './types/IRecurringRuleService'
import type { IServiceResult } from './types/IServiceResult'
import { getRecurringRuleRepository } from 'src/databases/repositories/recurring-rule-repository'
import type { IServiceListFilters, IServiceListOptions, WithRequiredId } from './types/IService'
import { ServiceResult } from './service-result'
import { getOperationRepository } from 'src/databases/repositories/operation-repository'

export class TypeOrmRecurringRuleService implements IRecurringRuleService {
  repository: Repository<RecurringRuleEntity>

  constructor() {
    this.repository = getRecurringRuleRepository()
  }

  static modelFromEntity(entity: RecurringRuleEntity) {
    const model = new RecurringRule(entity)
    return model as WithRequiredId<RecurringRule>
  }

  async list(
    { relations = [], filters }: IServiceListOptions = { relations: [] },
  ): Promise<IServiceResult<WithRequiredId<RecurringRule>[]>> {
    try {
      const findOptions: FindManyOptions = {
        relations: Object.fromEntries(relations.map((relation) => [relation, true])),
      }
      const whereOptions = {} as IServiceListFilters
      if (filters?.isActive) {
        whereOptions.isActive = true
      }
      if (Object.keys(whereOptions).length !== 0) {
        findOptions.where = whereOptions
      }
      const recurringRules = (await this.repository.find(findOptions)).map((recurringRule) =>
        TypeOrmRecurringRuleService.modelFromEntity(recurringRule),
      )
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

  async generateRecurringOperationsForCurrentWindow(): Promise<void> {
    const ret = await this.list({
      filters: { isActive: true },
      relations: ['center', 'category'],
    })
    const operations = [] as Operation[]
    if (ret.ok) {
      ret.payload.forEach((recurringRule) => {
        operations.push(...recurringRule.generateCurrentWindowOperations())
      })
    }
    const operationRepository = getOperationRepository()
    for (const operation of operations) {
      try {
        await operationRepository.save(operation)
      } catch (error) {
        console.error(error)
      }
    }
  }
}
