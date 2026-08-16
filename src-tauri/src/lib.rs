use polars::prelude::*;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct ChartData {
    pub categories: Vec<String>,
    pub values: Vec<f64>,
    pub total: f64,
    pub count: usize,
    pub max: f64,
    pub min: f64,
    pub avg: f64,
}

#[tauri::command]
async fn analyze_csv(path: String) -> Result<ChartData, String> {
    // 使用 Polars 惰性读取 CSV
    let df = CsvReadOptions::default()
        .with_has_header(true)
        .try_into_reader_with_file_path(Some(path.into()))
        .map_err(|e| format!("读取文件失败: {}", e))?
        .finish()
        .map_err(|e| format!("解析CSV失败: {}", e))?;

    // 假设 CSV 有 "category" 和 "value" 两列
    // 按 category 分组求和，并按 value 降序排列
    let result = df
        .lazy()
        .group_by(["category"])
        .agg([col("value").sum().alias("total")])
        .sort(
            ["total"],
            SortMultipleOptions::default().with_order_descending(true),
        )
        .limit(20) // 只取前20条，避免前端渲染过慢
        .collect()
        .map_err(|e| format!("数据处理失败: {}", e))?;

    let categories: Vec<String> = result
        .column("category")
        .map_err(|e| e.to_string())?
        .str()
        .map_err(|e| e.to_string())?
        .into_no_null_iter()
        .map(|s| s.to_string())
        .collect();

    let values: Vec<f64> = result
        .column("total")
        .map_err(|e| e.to_string())?
        .cast(&DataType::Float64)
        .map_err(|e| e.to_string())?
        .f64()
        .map_err(|e| e.to_string())?
        .into_no_null_iter()
        .collect();

    // 汇总统计信息，供前端「数据概览」页展示
    let total: f64 = values.iter().sum();
    let count = values.len();
    let max = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let min = values.iter().copied().fold(f64::INFINITY, f64::min);
    let (max, min) = if count > 0 { (max, min) } else { (0.0, 0.0) };
    let avg = if count > 0 { total / count as f64 } else { 0.0 };

    Ok(ChartData {
        categories,
        values,
        total,
        count,
        max,
        min,
        avg,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![analyze_csv])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
