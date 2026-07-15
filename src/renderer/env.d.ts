/// <reference types="vite/client" />

declare interface Expense {
  id: number
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note: string
  created_at: string
}

declare interface CategoryStat {
  category_l1: string
  total: number
  count: number
}

declare interface DailyStat {
  date: string
  total: number
}

declare interface MonthlyStats {
  total: number
  by_category: CategoryStat[]
  by_day: DailyStat[]
}
