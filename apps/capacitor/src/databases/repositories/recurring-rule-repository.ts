import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { RecurringRule } from '../entities/expenses'

export function getRecurringRuleRepository() {
  return expensesDataSource.dataSource.getRepository(RecurringRule)
}
