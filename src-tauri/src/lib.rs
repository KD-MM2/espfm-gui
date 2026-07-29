mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
