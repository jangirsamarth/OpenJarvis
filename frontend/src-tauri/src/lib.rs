use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_autostart::MacosLauncher;
#[cfg(unix)]
use std::os::unix::process::CommandExt;
use std::process::{Command, Stdio, Child};
use std::io::{BufRead, BufReader};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

struct VoiceSessionState {
    child: Arc<Mutex<Option<Child>>>,
}

/// Fetch health status from the OpenJarvis API server.
#[tauri::command]
async fn check_health(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/health", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch energy monitoring data from the API.
#[tauri::command]
async fn fetch_energy(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/telemetry/energy", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch telemetry statistics from the API.
#[tauri::command]
async fn fetch_telemetry(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/telemetry/stats", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch recent traces from the API.
#[tauri::command]
async fn fetch_traces(api_url: String, limit: u32) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/traces?limit={}", api_url, limit);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch a single trace by ID.
#[tauri::command]
async fn fetch_trace(api_url: String, trace_id: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/traces/{}", api_url, trace_id);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch learning system statistics.
#[tauri::command]
async fn fetch_learning_stats(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/learning/stats", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch learning policy configuration.
#[tauri::command]
async fn fetch_learning_policy(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/learning/policy", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch memory backend statistics.
#[tauri::command]
async fn fetch_memory_stats(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/memory/stats", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Search memory for relevant chunks.
#[tauri::command]
async fn search_memory(
    api_url: String,
    query: String,
    top_k: u32,
) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/memory/search", api_url);
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .json(&serde_json::json!({"query": query, "top_k": top_k}))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

/// Fetch list of available agents.
#[tauri::command]
async fn fetch_agents(api_url: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/agents", api_url);
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;
    Ok(body)
}

#[tauri::command]
async fn ping_bridge(app: tauri::AppHandle) -> Result<(), String> {
    println!("DEBUG: Received ping_bridge, emitting bridge-pong");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("bridge-pong", "pong");
    }
    Ok(())
}

#[tauri::command]
async fn start_voice_session(
    app: tauri::AppHandle,
    state: tauri::State<'_, VoiceSessionState>,
) -> Result<(), String> {
    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
    
    // Stop existing session if any
    if let Some(mut old_child) = child_lock.take() {
        println!("DEBUG: Killing old voice process");
        let _ = old_child.kill();
    }

    println!("DEBUG: Configuring voice command");
    let mut cmd = Command::new("/Users/samarth/.local/bin/uv");
    cmd.args(["run", "jarvis", "voice", "--wake-word", "--headless"])
       .env("PYTHONUNBUFFERED", "1")
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = match cmd.spawn() {
        Ok(c) => {
            println!("DEBUG: Spawned via absolute path, PID: {:?}", c.id());
            c
        },
        Err(e) => {
            println!("DEBUG: Absolute path spawn failed: {}. Falling back to 'uv'.", e);
            let mut fallback = Command::new("uv");
            fallback.args(["run", "jarvis", "voice", "--wake-word", "--headless"])
                .env("PYTHONUNBUFFERED", "1")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            #[cfg(unix)]
            fallback.process_group(0);
            fallback.spawn().map_err(|e2| {
                let err = format!("Failed to spawn: {} (Fallback failed: {})", e, e2);
                println!("DEBUG ERROR: {}", err);
                err
            })?
        }
    };

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    println!("DEBUG: Process active and pipes connected");
    
    *child_lock = Some(child);

    // Spawn a thread to read stdout and emit events
    let app_clone = app.clone();
    let child_arc_for_stdout = Arc::clone(&state.child);
    std::thread::spawn(move || {
        println!("DEBUG: Stdout thread started");
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                if let Some(window) = app_clone.get_webview_window("main") {
                    let _ = window.emit("voice-raw-log", &l);
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&l) {
                        println!("DEBUG JSON: {:?}", json);
                        let _ = window.emit("voice-state-update", json);
                    }
                }
            }
        }
        println!("DEBUG: Stdout thread closed");
        if let Ok(mut lock) = child_arc_for_stdout.lock() {
            *lock = None;
        }
        if let Some(window) = app_clone.get_webview_window("main") {
            let _ = window.emit("voice-state-update", serde_json::json!({"state": "idle"}));
        }
    });

    // Spawn another thread to read stderr
    let app_clone2 = app.clone();
    std::thread::spawn(move || {
        println!("DEBUG: Stderr thread started");
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                println!("DEBUG STDERR: {}", l);
                if let Some(window) = app_clone2.get_webview_window("main") {
                    let _ = window.emit("voice-raw-log", format!("[stderr] {}", l));
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn stop_voice_session(state: tauri::State<'_, VoiceSessionState>) -> Result<(), String> {
    let mut child_lock = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(child) = child_lock.take() {
        let pid = child.id();
        println!("DEBUG: Killing voice session pid {}", pid);
        #[cfg(unix)]
        {
            // Kill the entire process group
            let _ = Command::new("kill")
                .arg("-9")
                .arg(format!("-{}", pid))
                .status();
        }
        #[cfg(not(unix))]
        {
            let _ = child.kill();
        }
    }
    Ok(())
}

/// Launch the `jarvis` CLI command via shell.
#[tauri::command]
async fn run_jarvis_command(args: Vec<String>) -> Result<String, String> {
    let output = tokio::process::Command::new("jarvis")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to launch jarvis: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn get_api_base() -> String {
    "http://127.0.0.1:8000".to_string()
}

#[derive(serde::Serialize)]
struct SetupStatus {
    phase: String,
    detail: String,
    ollama_ready: bool,
    server_ready: bool,
    model_ready: bool,
    error: Option<String>,
}

#[tauri::command]
async fn get_setup_status() -> SetupStatus {
    let mut status = SetupStatus {
        phase: "waiting".to_string(),
        detail: "Checking systems...".to_string(),
        ollama_ready: false,
        server_ready: false,
        model_ready: false,
        error: None,
    };

    // 1. Check Ollama
    match reqwest::get("http://127.0.0.1:11434/api/tags").await {
        Ok(resp) if resp.status().is_success() => {
            status.ollama_ready = true;
        }
        _ => {
            status.detail = "Waiting for Ollama...".to_string();
            return status;
        }
    }

    // 2. Check Jarvis Server
    match reqwest::get("http://127.0.0.1:8000/health").await {
        Ok(resp) if resp.status().is_success() => {
            status.server_ready = true;
        }
        _ => {
            status.detail = "Waiting for Jarvis API...".to_string();
            return status;
        }
    }

    // 3. Check Models
    match reqwest::get("http://127.0.0.1:8000/v1/models").await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(data) = body.get("data").and_then(|d| d.as_array()) {
                    if !data.is_empty() {
                        status.model_ready = true;
                    }
                }
            }
        }
        _ => {}
    }

    if status.ollama_ready && status.server_ready && status.model_ready {
        status.phase = "ready".to_string();
        status.detail = "All systems go!".to_string();
    } else if status.ollama_ready && status.server_ready {
        status.detail = "No models found. Please download a model.".to_string();
    }

    status
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(VoiceSessionState {
            child: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the main window if another instance is launched
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Show / Hide")
                .build(app)?;
            let health = MenuItemBuilder::with_id("health", "Health: checking...")
                .enabled(false)
                .build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit OpenJarvis")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show)
                .separator()
                .item(&health)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("OpenJarvis")
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_api_base,
            get_setup_status,
            check_health,
            fetch_energy,
            fetch_telemetry,
            fetch_traces,
            fetch_trace,
            fetch_learning_stats,
            fetch_learning_policy,
            fetch_memory_stats,
            search_memory,
            fetch_agents,
            run_jarvis_command,
            start_voice_session,
            stop_voice_session,
            ping_bridge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenJarvis Desktop");
}
