use keyring::Entry;

#[tauri::command]
fn set_credential(service: &str, username: &str, password: &str) -> Result<(), String> {
    let entry = Entry::new(service, username).map_err(|e| e.to_string())?;
    entry.set_password(password).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_credential(service: &str, username: &str) -> Result<String, String> {
    let entry = Entry::new(service, username).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_credential(service: &str, username: &str) -> Result<(), String> {
    let entry = Entry::new(service, username).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_credential,
            get_credential,
            delete_credential
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
