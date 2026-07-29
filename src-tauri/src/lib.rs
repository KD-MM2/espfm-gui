mod commands;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            let db_path = app_data_dir.join("espfm.db");
            let db = espfm_store::Database::open(&db_path).expect("failed to open database");
            app.manage(AppState::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::discover_devices,
            commands::connect_device,
            commands::disconnect_device,
            commands::get_fans,
            commands::create_fan,
            commands::update_fan,
            commands::delete_fan,
            commands::get_sources,
            commands::create_source,
            commands::delete_source,
            commands::scan_ds18b20,
            commands::config_ds18b20,
            commands::update_manual_temp,
            commands::get_curves,
            commands::create_curve,
            commands::update_curve,
            commands::delete_curve,
            commands::get_schedules,
            commands::create_schedule,
            commands::update_schedule,
            commands::delete_schedule,
            commands::get_system_info,
            commands::set_hostname,
            commands::reboot_device,
            commands::export_config,
            commands::import_config,
            commands::wifi_scan,
            commands::wifi_connect,
            commands::wifi_status,
            commands::save_fan_sample,
            commands::save_temp_sample,
            commands::save_log,
            commands::get_logs,
            commands::clear_logs,
            commands::save_app_state,
            commands::get_app_state,
            commands::save_device_info,
            commands::get_saved_devices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
