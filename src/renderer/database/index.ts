import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
// Vite 会把 WASM 文件复制到输出目录
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let db: SqlJsDatabase | null = null

// 从 localStorage 加载数据库
async function loadDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })

  const saved = localStorage.getItem('jizhang_db')
  if (saved) {
    // 将 base64 字符串转回二进制
    const binary = Uint8Array.from(atob(saved), (c: string) => c.charCodeAt(0))
    db = new SQL.Database(binary)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '📌',
      parent_l1 TEXT,
      created_at TEXT NOT NULL
    )
  `)

  // 兼容旧数据库：给已有的 user_categories 表补上 emoji 列
  try {
    db.run(`ALTER TABLE user_categories ADD COLUMN emoji TEXT NOT NULL DEFAULT '📌'`)
  } catch {
    // 列已存在则忽略
  }

  // 兼容旧数据库：给 expenses 表补上 type 列（支出/收入）
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'`)
  } catch {
    // 列已存在则忽略
  }

  // 兼容旧数据库：给 user_categories 表补上 category_type 列
  try {
    db.run(`ALTER TABLE user_categories ADD COLUMN category_type TEXT NOT NULL DEFAULT 'expense'`)
  } catch {
    // 列已存在则忽略
  }

  return db
}

// 保存数据库到 localStorage
function saveDb(): void {
  if (!db) return
  const data = db.export()
  const binary = Array.from(data)
  const base64 = btoa(String.fromCharCode(...binary))
  localStorage.setItem('jizhang_db', base64)
}

// --- 对外接口 ---

export async function addExpense(data: {
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note?: string
  type: 'expense' | 'income'
}): Promise<number> {
  const database = await loadDb()
  const createdAt = new Date().toISOString()
  database.run(
    `INSERT INTO expenses (amount, category_l1, category_l2, date, note, created_at, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.amount, data.category_l1, data.category_l2, data.date, data.note || '', createdAt, data.type]
  )
  saveDb()
  const result = database.exec("SELECT last_insert_rowid()")
  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export async function getExpenses(year: number, month: number, type?: 'expense' | 'income'): Promise<Expense[]> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  const typeFilter = type ? 'AND type = ?' : ''
  const params: any[] = [`${prefix}%`]
  if (type) params.push(type)
  const result = database.exec(
    `SELECT * FROM expenses WHERE date LIKE ? ${typeFilter} ORDER BY date DESC, id DESC`,
    params
  )
  if (!result.length) return []
  const cols = result[0].columns
  return result[0].values.map((row: any[]) => {
    const obj: any = {}
    cols.forEach((c: string, i: number) => { obj[c] = row[i] })
    return obj as Expense
  })
}

export async function updateExpense(id: number, data: Partial<{
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note: string
}>): Promise<void> {
  const database = await loadDb()
  const fields: string[] = []
  const values: any[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (!fields.length) return
  values.push(id)
  database.run(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDb()
}

export async function deleteExpense(id: number): Promise<void> {
  const database = await loadDb()
  database.run('DELETE FROM expenses WHERE id = ?', [id])
  saveDb()
}

// 内部辅助：查询某类型的分类统计
function queryCategoryStats(database: SqlJsDatabase, prefix: string, type: 'expense' | 'income'): CategoryStat[] {
  const result = database.exec(
    `SELECT category_l1, SUM(amount) as total, COUNT(*) as count
     FROM expenses WHERE date LIKE ? AND type = ?
     GROUP BY category_l1 ORDER BY total DESC`,
    [`${prefix}%`, type]
  )
  const stats: CategoryStat[] = []
  if (result.length) {
    const cols = result[0].columns
    for (const row of result[0].values) {
      const item: any = {}
      cols.forEach((c: string, i: number) => { item[c] = row[i] })
      stats.push(item)
    }
  }
  return stats
}

// 内部辅助：查询某类型的每日统计
function queryDailyStats(database: SqlJsDatabase, prefix: string, type: 'expense' | 'income'): DailyStat[] {
  const result = database.exec(
    `SELECT date, SUM(amount) as total
     FROM expenses WHERE date LIKE ? AND type = ?
     GROUP BY date ORDER BY date ASC`,
    [`${prefix}%`, type]
  )
  const stats: DailyStat[] = []
  if (result.length) {
    const cols = result[0].columns
    for (const row of result[0].values) {
      const item: any = {}
      cols.forEach((c: string, i: number) => { item[c] = row[i] })
      stats.push(item)
    }
  }
  return stats
}

export async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`

  // 支出总额
  const expenseTotalResult = database.exec(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ? AND type = 'expense'`,
    [`${prefix}%`]
  )
  const expense_total = (expenseTotalResult[0]?.values[0]?.[0] as number) ?? 0

  // 收入总额
  const incomeTotalResult = database.exec(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ? AND type = 'income'`,
    [`${prefix}%`]
  )
  const income_total = (incomeTotalResult[0]?.values[0]?.[0] as number) ?? 0

  const expense_by_category = queryCategoryStats(database, prefix, 'expense')
  const income_by_category = queryCategoryStats(database, prefix, 'income')
  const expense_by_day = queryDailyStats(database, prefix, 'expense')
  const income_by_day = queryDailyStats(database, prefix, 'income')

  return { expense_total, income_total, expense_by_category, income_by_category, expense_by_day, income_by_day }
}

// ========== 用户自定义分类操作 ==========

export async function getUserCategories(category_type?: 'expense' | 'income'): Promise<UserCategory[]> {
  const database = await loadDb()
  const typeFilter = category_type ? 'WHERE category_type = ?' : ''
  const params: any[] = category_type ? [category_type] : []
  const result = database.exec(`SELECT * FROM user_categories ${typeFilter} ORDER BY parent_l1, id`, params)
  if (!result.length) return []
  const cols = result[0].columns
  return result[0].values.map((row: any[]) => {
    const obj: any = {}
    cols.forEach((c: string, i: number) => { obj[c] = row[i] })
    return obj as UserCategory
  })
}

export async function addUserCategory(name: string, parent_l1: string | null, emoji: string = '📌', category_type: 'expense' | 'income' = 'expense'): Promise<number> {
  const database = await loadDb()

  // 检查是否已存在同名同类型分类
  const existing = parent_l1 === null
    ? database.exec('SELECT id FROM user_categories WHERE name = ? AND parent_l1 IS NULL AND category_type = ?', [name, category_type])
    : database.exec('SELECT id FROM user_categories WHERE name = ? AND parent_l1 = ? AND category_type = ?', [name, parent_l1, category_type])
  if (existing.length && existing[0].values.length) {
    throw new Error('该分类名称已存在')
  }

  const createdAt = new Date().toISOString()
  database.run(
    'INSERT INTO user_categories (name, emoji, parent_l1, created_at, category_type) VALUES (?, ?, ?, ?, ?)',
    [name, emoji, parent_l1, createdAt, category_type]
  )
  saveDb()
  const result = database.exec("SELECT last_insert_rowid()")
  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export async function updateUserCategory(id: number, newName: string, newEmoji?: string): Promise<void> {
  const database = await loadDb()

  // 查找旧分类信息（含 category_type）
  const catResult = database.exec('SELECT name, parent_l1, category_type FROM user_categories WHERE id = ?', [id])
  if (!catResult.length || !catResult[0].values.length) throw new Error('分类不存在')

  const oldName = catResult[0].values[0][0] as string
  const parentL1 = catResult[0].values[0][1] as string | null
  const catType = catResult[0].values[0][2] as 'expense' | 'income'

  // 检查新名称是否与已有同类型分类重复
  const dup = parentL1 === null
    ? database.exec('SELECT id FROM user_categories WHERE name = ? AND parent_l1 IS NULL AND category_type = ? AND id != ?', [newName, catType, id])
    : database.exec('SELECT id FROM user_categories WHERE name = ? AND parent_l1 = ? AND category_type = ? AND id != ?', [newName, parentL1, catType, id])
  if (dup.length && dup[0].values.length) throw new Error('该分类名称已存在')

  // 更新分类名称（和 emoji）
  if (newEmoji) {
    database.run('UPDATE user_categories SET name = ?, emoji = ? WHERE id = ?', [newName, newEmoji, id])
  } else {
    database.run('UPDATE user_categories SET name = ? WHERE id = ?', [newName, id])
  }

  if (parentL1 === null) {
    // 一级分类：同步更新所有账单和子分类（仅同类型）
    database.run('UPDATE user_categories SET parent_l1 = ? WHERE parent_l1 = ? AND category_type = ?', [newName, oldName, catType])
    database.run('UPDATE expenses SET category_l1 = ? WHERE category_l1 = ? AND type = ?', [newName, oldName, catType])
  } else {
    // 二级分类：同步更新账单（仅同类型）
    database.run(
      'UPDATE expenses SET category_l2 = ? WHERE category_l1 = ? AND category_l2 = ? AND type = ?',
      [newName, parentL1, oldName, catType]
    )
  }

  saveDb()
}

export async function deleteUserCategory(id: number): Promise<void> {
  const database = await loadDb()

  const catResult = database.exec('SELECT name, parent_l1, category_type FROM user_categories WHERE id = ?', [id])
  if (!catResult.length || !catResult[0].values.length) throw new Error('分类不存在')

  const name = catResult[0].values[0][0] as string
  const parentL1 = catResult[0].values[0][1] as string | null
  const catType = catResult[0].values[0][2] as 'expense' | 'income'

  // 按类型选择兜底分类
  const fallbackL1 = catType === 'expense' ? '其他支出' : '其他收入'
  const fallbackL2 = catType === 'expense' ? '其他杂项' : '其他收入'

  if (parentL1 === null) {
    // 删除一级分类：把所有同类型账单归到兜底分类
    database.run(
      'UPDATE expenses SET category_l1 = ?, category_l2 = ? WHERE category_l1 = ? AND type = ?',
      [fallbackL1, fallbackL2, name, catType]
    )
    // 删除它下面的所有同类型二级分类
    database.run('DELETE FROM user_categories WHERE parent_l1 = ? AND category_type = ?', [name, catType])
  } else {
    // 删除二级分类：把同类型账单归到兜底分类
    database.run(
      'UPDATE expenses SET category_l1 = ?, category_l2 = ? WHERE category_l1 = ? AND category_l2 = ? AND type = ?',
      [fallbackL1, fallbackL2, parentL1, name, catType]
    )
  }

  // 删除分类本身
  database.run('DELETE FROM user_categories WHERE id = ?', [id])
  saveDb()
}

// ========== CSV 导出 ==========

export async function exportCSV(year: number, month: number, type?: 'expense' | 'income'): Promise<string> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  const typeFilter = type ? 'AND type = ?' : ''
  const params: any[] = [`${prefix}%`]
  if (type) params.push(type)
  const result = database.exec(
    `SELECT date, category_l1, category_l2, amount, note, type
     FROM expenses WHERE date LIKE ? ${typeFilter}
     ORDER BY date DESC, id DESC`,
    params
  )

  let csv = '﻿日期,类型,一级分类,二级分类,金额(元),备注\n'
  if (result.length) {
    for (const row of result[0].values) {
      csv += row.map((v: any) => {
        const str = String(v ?? '')
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',') + '\n'
    }
  }
  return csv
}
