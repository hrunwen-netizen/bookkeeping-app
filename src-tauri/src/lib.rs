mod database;

use database::{AddExpenseData, Database, UpdateExpenseData};
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn add_expense(db: State<Database>, data: AddExpenseData) -> Result<i64, String> {
    db.add_expense(data)
}

#[tauri::command]
fn get_expenses(db: State<Database>, year: i32, month: u32) -> Result<Vec<database::Expense>, String> {
    db.get_expenses(year, month)
}

#[tauri::command]
fn update_expense(db: State<Database>, id: i64, data: UpdateExpenseData) -> Result<(), String> {
    db.update_expense(id, data)
}

#[tauri::command]
fn delete_expense(db: State<Database>, id: i64) -> Result<(), String> {
    db.delete_expense(id)
}

#[tauri::command]
fn get_monthly_stats(db: State<Database>, year: i32, month: u32) -> Result<database::MonthlyStats, String> {
    db.get_monthly_stats(year, month)
}

#[tauri::command]
async fn export_csv(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    year: i32,
    month: u32,
) -> Result<Option<String>, String> {
    let csv = db.export_csv(year, month)?;

    let file_path = app
        .dialog()
        .file()
        .add_filter("CSV 文件", &["csv"])
        .set_file_name(format!("支出记录_{}年{}月.csv", year, month))
        .blocking_save_file();

    match file_path {
        Some(path) => {
            std::fs::write(&path, csv).map_err(|e| e.to_string())?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let database = Database::new(&app.handle());
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_expense,
            get_expenses,
            update_expense,
            delete_expense,
            get_monthly_stats,
            export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
