import type { RecurringRule } from 'src/domain/RecurringRule'
import type { IService } from './IService'

export interface IRecurringRuleService extends IService<RecurringRule> {
  generateRecurringOperationsForCurrentWindow(): Promise<void>
}
