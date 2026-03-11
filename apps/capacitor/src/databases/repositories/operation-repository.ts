import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Operation } from '../entities/expenses'

export function getOperationRepository() {
  return expensesDataSource.dataSource.getRepository(Operation)
}
