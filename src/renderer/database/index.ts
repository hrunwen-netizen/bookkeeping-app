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
    const binary = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0))
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
}): Promise<number> {
  const database = await loadDb()
  const createdAt = new Date().toISOString()
  database.run(
    `INSERT INTO expenses (amount, category_l1, category_l2, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.amount, data.category_l1, data.category_l2, data.date, data.note || '', createdAt]
  )
  saveDb()
  const result = database.exec("SELECT last_insert_rowid()")
  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export async function getExpenses(year: number, month: number): Promise<Expense[]> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  const result = database.exec(
    `SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC, id DESC`,
    [`${prefix}%`]
  )
  if (!result.length) return []
  const cols = result[0].columns
  return result[0].values.map(row => {
    const obj: any = {}
    cols.forEach((c, i) => { obj[c] = row[i] })
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

export async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`

  const totalResult = database.exec(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?`,
    [`${prefix}%`]
  )
  const total = (totalResult[0]?.values[0]?.[0] as number) ?? 0

  const catResult = database.exec(
    `SELECT category_l1, SUM(amount) as total, COUNT(*) as count
     FROM expenses WHERE date LIKE ?
     GROUP BY category_l1 ORDER BY total DESC`,
    [`${prefix}%`]
  )
  const by_category: CategoryStat[] = []
  if (catResult.length) {
    const cols = catResult[0].columns
    for (const row of catResult[0].values) {
      const item: any = {}
      cols.forEach((c, i) => { item[c] = row[i] })
      by_category.push(item)
    }
  }

  const dayResult = database.exec(
    `SELECT date, SUM(amount) as total
     FROM expenses WHERE date LIKE ?
     GROUP BY date ORDER BY date ASC`,
    [`${prefix}%`]
  )
  const by_day: DailyStat[] = []
  if (dayResult.length) {
    const cols = dayResult[0].columns
    for (const row of dayResult[0].values) {
      const item: any = {}
      cols.forEach((c, i) => { item[c] = row[i] })
      by_day.push(item)
    }
  }

  return { total, by_category, by_day }
}

export async function exportCSV(year: number, month: number): Promise<string> {
  const database = await loadDb()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  const result = database.exec(
    `SELECT date, category_l1, category_l2, amount, note
     FROM expenses WHERE date LIKE ?
     ORDER BY date DESC, id DESC`,
    [`${prefix}%`]
  )

  let csv = '﻿日期,一级分类,二级分类,金额(元),备注\n'
  if (result.length) {
    for (const row of result[0].values) {
      csv += row.map(v => {
        const str = String(v ?? '')
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',') + '\n'
    }
  }
  return csv
}
