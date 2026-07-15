use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

pub struct Database {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    pub id: i64,
    pub amount: f64,
    pub category_l1: String,
    pub category_l2: String,
    pub date: String,
    pub note: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddExpenseData {
    pub amount: f64,
    pub category_l1: String,
    pub category_l2: String,
    pub date: String,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateExpenseData {
    pub amount: Option<f64>,
    pub category_l1: Option<String>,
    pub category_l2: Option<String>,
    pub date: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryStat {
    pub category_l1: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyStat {
    pub date: String,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyStats {
    pub total: f64,
    pub by_category: Vec<CategoryStat>,
    pub by_day: Vec<DailyStat>,
}

impl Database {
    pub fn new(app: &AppHandle) -> Self {
        let db_dir = app.path().app_data_dir().unwrap();
        std::fs::create_dir_all(&db_dir).ok();
        let db_path: PathBuf = db_dir.join("jizhang.db");

        let conn = Connection::open(db_path).expect("无法打开数据库");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category_l1 TEXT NOT NULL,
                category_l2 TEXT NOT NULL,
                date TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )",
            [],
        )
        .expect("无法创建表");

        Database {
            conn: Mutex::new(conn),
        }
    }

    pub fn add_expense(&self, data: AddExpenseData) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let created_at = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        conn.execute(
            "INSERT INTO expenses (amount, category_l1, category_l2, date, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                data.amount,
                data.category_l1,
                data.category_l2,
                data.date,
                data.note.unwrap_or_default(),
                created_at
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_expenses(&self, year: i32, month: u32) -> Result<Vec<Expense>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let prefix = format!("{}-{:02}", year, month);
        let mut stmt = conn
            .prepare(
                "SELECT id, amount, category_l1, category_l2, date, note, created_at
                 FROM expenses WHERE date LIKE ?1
                 ORDER BY date DESC, id DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![format!("{}%", prefix)], |row| {
                Ok(Expense {
                    id: row.get(0)?,
                    amount: row.get(1)?,
                    category_l1: row.get(2)?,
                    category_l2: row.get(3)?,
                    date: row.get(4)?,
                    note: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut expenses = Vec::new();
        for row in rows {
            expenses.push(row.map_err(|e| e.to_string())?);
        }
        Ok(expenses)
    }

    pub fn update_expense(&self, id: i64, data: UpdateExpenseData) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut fields = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(v) = data.amount {
            fields.push("amount = ?");
            values.push(Box::new(v));
        }
        if let Some(v) = data.category_l1 {
            fields.push("category_l1 = ?");
            values.push(Box::new(v));
        }
        if let Some(v) = data.category_l2 {
            fields.push("category_l2 = ?");
            values.push(Box::new(v));
        }
        if let Some(v) = data.date {
            fields.push("date = ?");
            values.push(Box::new(v));
        }
        if let Some(v) = data.note {
            fields.push("note = ?");
            values.push(Box::new(v));
        }

        if fields.is_empty() {
            return Ok(());
        }

        let sql = format!(
            "UPDATE expenses SET {} WHERE id = ?",
            fields.join(", ")
        );

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        let mut all_params: Vec<&dyn rusqlite::types::ToSql> = params_refs;
        let id_box: Box<dyn rusqlite::types::ToSql> = Box::new(id);
        all_params.push(id_box.as_ref());

        stmt.execute(rusqlite::params_from_iter(all_params))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_expense(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_monthly_stats(&self, year: i32, month: u32) -> Result<MonthlyStats, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let prefix = format!("{}-{:02}", year, month);

        // 总额
        let total: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date LIKE ?1",
                params![format!("{}%", prefix)],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        // 按分类统计
        let mut stmt = conn
            .prepare(
                "SELECT category_l1, SUM(amount), COUNT(*)
                 FROM expenses WHERE date LIKE ?1
                 GROUP BY category_l1 ORDER BY SUM(amount) DESC",
            )
            .map_err(|e| e.to_string())?;

        let cat_rows = stmt
            .query_map(params![format!("{}%", prefix)], |row| {
                Ok(CategoryStat {
                    category_l1: row.get(0)?,
                    total: row.get(1)?,
                    count: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut by_category = Vec::new();
        for row in cat_rows {
            by_category.push(row.map_err(|e| e.to_string())?);
        }

        // 按日统计
        let mut stmt = conn
            .prepare(
                "SELECT date, SUM(amount)
                 FROM expenses WHERE date LIKE ?1
                 GROUP BY date ORDER BY date ASC",
            )
            .map_err(|e| e.to_string())?;

        let day_rows = stmt
            .query_map(params![format!("{}%", prefix)], |row| {
                Ok(DailyStat {
                    date: row.get(0)?,
                    total: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut by_day = Vec::new();
        for row in day_rows {
            by_day.push(row.map_err(|e| e.to_string())?);
        }

        Ok(MonthlyStats {
            total,
            by_category,
            by_day,
        })
    }

    pub fn export_csv(&self, year: i32, month: u32) -> Result<String, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let prefix = format!("{}-{:02}", year, month);

        let mut stmt = conn
            .prepare(
                "SELECT date, category_l1, category_l2, amount, note
                 FROM expenses WHERE date LIKE ?1
                 ORDER BY date DESC, id DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![format!("{}%", prefix)], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let mut csv = "﻿日期,一级分类,二级分类,金额(元),备注\n".to_string();
        for row in rows {
            let (date, cat1, cat2, amount, note) = row.map_err(|e| e.to_string())?;
            let note_escaped = if note.contains(',') || note.contains('"') {
                format!("\"{}\"", note.replace('"', "\"\""))
            } else {
                note
            };
            csv.push_str(&format!(
                "{},{},{},{:.2},{}\n",
                date, cat1, cat2, amount, note_escaped
            ));
        }
        Ok(csv)
    }
}
