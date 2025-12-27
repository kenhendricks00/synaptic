use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;

// State management for the AI model and in-memory vector store
pub struct AppState {
    pub model: Mutex<Option<TextEmbedding>>,
    pub embeddings: Mutex<HashMap<String, Vec<f32>>>,
}

/// Note metadata for search results
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteMetadata {
    pub id: String,
    pub title: String,
    pub path: String,
    pub preview: String,
    pub tags: Vec<String>,
}

#[derive(Serialize)]
pub struct SemanticResult {
    pub id: String,
    pub score: f32,
}

// --- Ollama Types ---

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Debug)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<OllamaMessage>,
    pub stream: bool,
}

#[derive(Deserialize, Debug)]
pub struct OllamaChatResponse {
    pub model: String,
    pub created_at: String,
    pub message: Option<OllamaMessage>,
    pub done: bool,
}

#[derive(Deserialize, Debug)]
pub struct OllamaTagResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaModel {
    pub name: String,
}

// --- Ollama Commands ---

/// Check if Ollama is running
#[tauri::command]
async fn check_ollama_status() -> Result<bool, String> {
    let client = Client::new();
    let res = client
        .get("http://localhost:11434/")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(res.status().is_success())
}

/// Get available Ollama models
#[tauri::command]
async fn get_ollama_models() -> Result<Vec<String>, String> {
    let client = Client::new();
    let res = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Failed to get tags: status {}", res.status()));
    }

    let tag_res: OllamaTagResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(tag_res.models.into_iter().map(|m| m.name).collect())
}

/// Stream chat response from Ollama
#[tauri::command]
async fn unstreamed_chat(model: String, messages: Vec<OllamaMessage>) -> Result<String, String> {
    let client = Client::new();
    let req = OllamaChatRequest {
        model,
        messages,
        stream: false,
    };

    let res = client
        .post("http://localhost:11434/api/chat")
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Ollama API error: {}", res.status()));
    }

    let chat_res: OllamaChatResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(chat_res.message.map(|m| m.content).unwrap_or_default())
}

/// Initialize the AI model (downloads if needed)
#[tauri::command]
async fn init_model(state: State<'_, AppState>) -> Result<String, String> {
    let mut model_guard = state.model.lock().map_err(|e| e.to_string())?;

    if model_guard.is_some() {
        return Ok("Model already loaded".to_string());
    }

    let mut options = InitOptions::default();
    options.model_name = EmbeddingModel::BGESmallENV15;

    let model =
        TextEmbedding::try_new(options).map_err(|e| format!("Failed to load model: {}", e))?;

    *model_guard = Some(model);
    Ok("Model loaded successfully".to_string())
}

/// Generate embeddings for a batch of notes and store them
#[tauri::command]
async fn index_notes(
    state: State<'_, AppState>,
    notes: Vec<NoteMetadata>,
) -> Result<usize, String> {
    let model_guard = state.model.lock().map_err(|e| e.to_string())?;
    let model = model_guard
        .as_ref()
        .ok_or("Model not initialized. Call init_model first.")?;

    let mut texts = Vec::new();
    let mut ids = Vec::new();

    for note in &notes {
        let text = format!(
            "Title: {}\nTags: {}\nContent: {}",
            note.title,
            note.tags.join(", "),
            note.preview
        );
        texts.push(text);
        ids.push(note.id.clone());
    }

    if texts.is_empty() {
        return Ok(0);
    }

    let embeddings = model
        .embed(texts, None)
        .map_err(|e| format!("Embedding failed: {}", e))?;

    let mut store = state.embeddings.lock().map_err(|e| e.to_string())?;
    let count = embeddings.len();

    for (i, embedding) in embeddings.into_iter().enumerate() {
        if i < ids.len() {
            store.insert(ids[i].clone(), embedding);
        }
    }

    Ok(count)
}

/// Perform semantic search using cosine similarity
#[tauri::command]
async fn semantic_search(
    state: State<'_, AppState>,
    query: String,
    limit: usize,
) -> Result<Vec<SemanticResult>, String> {
    let model_guard = state.model.lock().map_err(|e| e.to_string())?;
    let model = model_guard.as_ref().ok_or("Model not initialized")?;

    // Embed query
    let query_embeddings = model
        .embed(vec![query], None)
        .map_err(|e| format!("Query embedding failed: {}", e))?;

    let query_vec = query_embeddings.first().ok_or("No embedding generated")?;

    // specific cosine similarity implementation
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot_product: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm_a == 0.0 || norm_b == 0.0 {
            0.0
        } else {
            dot_product / (norm_a * norm_b)
        }
    }

    let store = state.embeddings.lock().map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    for (id, embedding) in store.iter() {
        let score = cosine_similarity(query_vec, embedding);
        if score > 0.4 {
            // minimal threshold
            results.push(SemanticResult {
                id: id.clone(),
                score,
            });
        }
    }

    // Sort by score desc
    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit);

    Ok(results)
}

/// Search notes in a vault using simple text matching
#[tauri::command]
fn search_notes(vault_path: String, query: String) -> Result<Vec<NoteMetadata>, String> {
    let query_lower = query.to_lowercase();
    let mut results: Vec<NoteMetadata> = Vec::new();

    let root = Path::new(&vault_path);
    if !root.exists() {
        return Err(format!("Vault path does not exist: {}", vault_path));
    }

    fn scan_dir(dir: &Path, query: &str, results: &mut Vec<NoteMetadata>) -> Result<(), String> {
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return Ok(()), // Skip folders we can't read
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Ignore hidden folders and system folders
                if path
                    .file_name()
                    .map(|n| n.to_string_lossy().starts_with('.'))
                    .unwrap_or(false)
                {
                    continue;
                }
                let _ = scan_dir(&path, query, results); // Ignore errors in subfolders
            } else if path.extension().map_or(false, |ext| ext == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    let content_lower = content.to_lowercase();
                    // If query is empty, it matches all files
                    if query.is_empty() || content_lower.contains(query) {
                        let title = extract_title(&content);
                        let preview = extract_preview(&content);
                        let tags = extract_tags(&content);

                        results.push(NoteMetadata {
                            id: path.to_string_lossy().to_string().replace("\\", "/"),
                            title,
                            path: path.to_string_lossy().to_string().replace("\\", "/"),
                            preview,
                            tags,
                        });
                    }
                }
            }
        }
        Ok(())
    }

    scan_dir(root, &query_lower, &mut results)?;

    results.sort_by(|a, b| {
        let a_title_match = a.title.to_lowercase().contains(&query_lower);
        let b_title_match = b.title.to_lowercase().contains(&query_lower);
        b_title_match.cmp(&a_title_match)
    });

    if !query_lower.is_empty() {
        results.truncate(50);
    }
    Ok(results)
}

/// Get vault metadata (name, count, etc)
#[tauri::command]
fn get_vault_metadata(path: String) -> Result<NoteMetadata, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err(format!("Vault path does not exist: {}", path));
    }

    let name = root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Vault".to_string());

    let mut count = 0;
    fn count_md(dir: &Path, count: &mut usize) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    // Ignore hidden folders
                    if p.file_name()
                        .map(|n| n.to_string_lossy().starts_with('.'))
                        .unwrap_or(false)
                    {
                        continue;
                    }
                    count_md(&p, count);
                } else if p.extension().map_or(false, |ext| ext == "md") {
                    *count += 1;
                }
            }
        }
    }
    count_md(root, &mut count);

    Ok(NoteMetadata {
        id: count.to_string(), // Reusing struct for count
        title: name,
        path: path.replace("\\", "/"),
        preview: count.to_string(),
        tags: vec![],
    })
}

/// Get note content by path
#[tauri::command]
fn get_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read note: {}", e))
}

/// Save note content
#[tauri::command]
fn save_note(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to save note: {}", e))
}

/// Create a new note
#[tauri::command]
fn create_note(vault_path: String, title: String, content: String) -> Result<String, String> {
    let safe_title = title.replace(['<', '>', ':', '"', '/', '\\', '|', '?', '*'], "");
    let file_path = format!("{}/{}.md", vault_path, safe_title);

    if Path::new(&file_path).exists() {
        return Err(format!("Note '{}' already exists", title));
    }

    let note_content = if content.is_empty() {
        format!("# {}\n\n", title)
    } else {
        content
    };

    fs::write(&file_path, note_content).map_err(|e| format!("Failed to create note: {}", e))?;

    Ok(file_path)
}

/// Delete a note
#[tauri::command]
fn delete_note(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete note: {}", e))
}

/// Extract title from markdown content
fn extract_title(content: &str) -> String {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return trimmed[2..].trim().to_string();
        }
    }
    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            return trimmed.chars().take(100).collect();
        }
    }
    "Untitled".to_string()
}

/// Extract preview text from content
fn extract_preview(content: &str) -> String {
    let mut preview = String::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let cleaned: String = trimmed
            .replace("**", "")
            .replace("*", "")
            .replace("`", "")
            .chars()
            .take(150)
            .collect();
        preview = cleaned;
        break;
    }
    if preview.len() >= 150 {
        preview.push_str("...");
    }
    preview
}

/// Extract tags from content (looks for #tags)
fn extract_tags(content: &str) -> Vec<String> {
    let mut tags = Vec::new();
    let mut in_code = false;
    for line in content.lines() {
        if line.contains("```") {
            in_code = !in_code;
            continue;
        }
        if in_code {
            continue;
        }

        let words: Vec<&str> = line.split_whitespace().collect();
        for (i, word) in words.iter().enumerate() {
            if word.starts_with('#') && (i > 0 || !line.trim().starts_with('#')) {
                let tag = word.trim_start_matches('#').to_lowercase();
                if !tag.is_empty() && !tags.contains(&tag) {
                    tags.push(tag);
                }
            }
        }
    }
    tags
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Synaptic.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            model: Mutex::new(None),
            embeddings: Mutex::new(HashMap::new()),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            search_notes,
            get_note,
            save_note,
            create_note,
            delete_note,
            init_model,
            index_notes,
            semantic_search,
            check_ollama_status,
            get_ollama_models,
            unstreamed_chat,
            get_vault_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
