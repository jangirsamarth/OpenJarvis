---
description: Start the full OpenJarvis desktop environment with all backend services
---

To start OpenJarvis with all necessary backend services (Ollama, API Server):

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Run the orchestrated dev command:
    ```bash
    npm run tauri dev
    ```

This command will automatically:
-   Verify if **Ollama** is running (and attempt to start it on macOS).
-   Start the **OpenJarvis API Server** in the background if it's not already running.
-   Launch the **Vite** dev server.
-   Launch the **Tauri** desktop window.

### Troubleshooting
-   If the API server fails to start, check the logs at `/tmp/jarvis_server.log`.
-   Make sure you have run `uv sync --extra server` in the root directory at least once to install server dependencies.
