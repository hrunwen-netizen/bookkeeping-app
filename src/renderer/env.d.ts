/// <reference types="vite/client" />

declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryExecResult[]
    export(): Uint8Array
    close(): void
  }
  interface QueryExecResult {
    columns: string[]
    values: any[][]
  }
  export default function initSqlJs(config: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}

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

declare interface UserCategory {
  id: number
  name: string
  emoji: string
  parent_l1: string | null
  created_at: string
}
