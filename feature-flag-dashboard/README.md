# Feature Flag Dashboard — Automated Removal with Devin API

A developer dashboard for the Spring Boot Microservices Banking Application that displays all 13 feature flags in the codebase and enables **one-click automated removal** using the [Devin API](https://docs.devin.ai). When you click "Remove" on a flag, the dashboard creates a Devin session that:

1. Removes the flag check from the controller/component
2. Removes the flag from configuration files
3. Updates or removes related unit tests
4. Runs all tests to verify nothing breaks
5. Creates a PR with the changes documented, including **full test output as proof**

This is inspired by [how Ramp uses Devin](https://www.cognition.ai/blog/ramp-feature-flags) to remove hundreds of feature flags at scale — saving thousands of engineering hours per month.

---

## Architecture

```
┌─────────────────────┐       ┌──────────────────────┐       ┌─────────────┐
│   React Frontend    │──────▶│   FastAPI Backend     │──────▶│  Devin API  │
│   (Vite + Tailwind  │       │   (Python, httpx)     │       │             │
│    + shadcn/ui)     │       │                       │       │  Creates a  │
│                     │       │  - Flag registry      │       │  session to │
│  - Displays flags   │       │  - Devin API proxy    │       │  remove the │
│  - Search/filter    │       │  - Session tracking   │       │  flag & PR  │
│  - Remove button    │       │                       │       └─────────────┘
└─────────────────────┘       └──────────────────────┘
```

- **Frontend** (`feature-flag-frontend/`): React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** (`feature-flag-backend/`): FastAPI + httpx for Devin API calls

The backend holds the Devin API token securely and acts as a proxy — the frontend never touches the token directly.

---

## Feature Flags Tracked

| # | Flag | Type | Service | Property |
|---|------|------|---------|----------|
| 1 | User Registration | Backend | User Service | `feature.user-registration.enabled` |
| 2 | User Read | Backend | User Service | `feature.user-read.enabled` |
| 3 | User Update Profile | Backend | User Service | `feature.user-update-profile.enabled` |
| 4 | User Update Status | Backend | User Service | `feature.user-update-status.enabled` |
| 5 | Account Creation | Backend | Account Service | `feature.account-creation.enabled` |
| 6 | Account Read | Backend | Account Service | `feature.account-read.enabled` |
| 7 | Account Update Status | Backend | Account Service | `feature.account-update-status.enabled` |
| 8 | Transaction Create | Backend | Transaction Service | `feature.transaction-create.enabled` |
| 9 | Transaction Read | Backend | Transaction Service | `feature.transaction-read.enabled` |
| 10 | Sequence Generation | Backend | Sequence Generator | `feature.sequence-generation.enabled` |
| 11 | Fund Transfer | Backend | Fund Transfer | `feature.fund-transfer.enabled` |
| 12 | Demo Tab | Frontend | Frontend | `ENABLE_DEMO_TAB` |
| 13 | Send Money | Frontend | Frontend | `ENABLE_SEND_MONEY` |

---

## How It Works

### 1. Flag Registry (Backend)

All 13 flags are registered in the backend with metadata including file locations, config paths, and field names. This gives Devin the exact context needed to remove each flag:

```python
# feature-flag-backend/app/main.py

FEATURE_FLAGS = [
    {
        "id": "fund-transfer",
        "name": "Fund Transfer",
        "description": "Controls the POST /fund-transfers endpoint",
        "type": "backend",
        "service": "Fund Transfer",
        "location": "Fund-Transfer/src/main/java/.../FundTransferController.java",
        "config_location": "Fund-Transfer/src/main/resources/application.yml",
        "property": "feature.fund-transfer.enabled",
        "field_name": "fundTransferEnabled",
        "status": "enabled",
    },
    # ... 12 more flags
]
```

### 2. Devin API Integration (Backend)

When the frontend calls `POST /api/flags/{flag_id}/remove`, the backend builds a detailed prompt and creates a Devin session via the API:

```python
# feature-flag-backend/app/main.py

@app.post("/api/flags/{flag_id}/remove")
async def remove_flag(flag_id: str):
    # Build a detailed removal prompt based on flag type
    if flag["type"] == "backend":
        prompt = _build_backend_removal_prompt(flag)
    else:
        prompt = _build_frontend_removal_prompt(flag)

    # Call Devin API to create a session
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DEVIN_API_URL}/sessions",
            headers={
                "Authorization": f"Bearer {DEVIN_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": prompt,
                "title": f"Remove feature flag: {flag['name']} ({flag['id']})",
                "tags": ["feature-flag-removal", flag_id],
            },
            timeout=30.0,
        )

    data = response.json()
    # Track the session and return the Devin session URL
    return {
        "message": f"Devin session created to remove '{flag['name']}'",
        "session": {
            "session_id": data["session_id"],
            "session_url": data["url"],
            "status": "in_progress",
        },
    }
```

### 3. Removal Prompts

Each removal prompt tells Devin exactly what to do — including running tests and including the output as proof in the PR description. Here's an abbreviated example for a backend flag:

```python
def _build_backend_removal_prompt(flag):
    return f"""
    You are tasked with removing a backend feature flag from the codebase.

    **Feature Flag:** `{flag['property']}`
    **Controller File:** {flag['location']}
    **Config File:** {flag['config_location']}

    ## Instructions
    1. Create a new branch from `main`
    2. Remove the @Value annotation and boolean field from the controller
    3. Remove the if-check and 503 response block (keep the business logic)
    4. Remove the flag from application.yml
    5. Update/remove the feature flag unit tests
    6. Run `mvn test` and capture the full terminal output
    7. Take a screenshot of the test results
    8. Create a PR with a "Test Results" section containing:
       - Full terminal output in a code block
       - Screenshot of test results
       - "All X tests passed" statement
    """
```

### 4. Frontend Trigger

The React frontend displays all flags and triggers removal with a single click:

```typescript
// feature-flag-frontend/src/App.tsx

const handleRemoveFlag = async (flag: FeatureFlag) => {
  const res = await fetch(`${API_BASE}/api/flags/${flag.id}/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (res.ok) {
    // Show the Devin session URL so the user can track progress
    setRemovalResult({
      success: true,
      message: data.message,
      session_url: data.session?.session_url,
    })
  }
}
```

---

## Running the Dashboard

### Prerequisites

- **Python 3.11+** and **Poetry** (for the backend)
- **Node.js 18+** and **npm** (for the frontend)
- A **Devin API token** (get one from [Devin Settings > API Keys](https://app.devin.ai/settings))

### 1. Start the Backend

```bash
cd feature-flag-dashboard/feature-flag-backend

# Install dependencies
poetry install

# Create .env file with your Devin API token
echo "DEVIN_API_TOKEN=your_token_here" > .env

# Start the server (runs on port 8090)
poetry run fastapi dev app/main.py --port 8090
```

### 2. Start the Frontend

```bash
cd feature-flag-dashboard/feature-flag-frontend

# Install dependencies
npm install

# (Optional) Point to a deployed backend instead of localhost
# echo "VITE_API_URL=https://your-backend-url.com" > .env

# Start the dev server (runs on port 5173)
npm run dev
```

Then open **http://localhost:5173** in your browser.

### 3. Use the Dashboard

1. All 13 feature flags are displayed in a table
2. Use the **search bar** to filter by flag name, service, or property
3. Use the **Backend/Frontend** buttons to filter by type
4. **Hover** over any row to reveal the **Remove** button
5. Click **Remove** to open the confirmation dialog
6. Click **Remove Flag** to create a Devin session — you'll get a link to track it
7. Devin will remove the flag, run tests, and create a PR with test output proof

---

## Deployed Version

- **Dashboard UI**: https://spring-boot-banking-app-p0rq5tt9.devinapps.com
- **Backend API**: https://app-jybajljf.fly.dev

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/healthz` | Health check |
| `GET` | `/api/flags` | List all 13 feature flags with metadata |
| `GET` | `/api/flags/{flag_id}` | Get a single flag by ID |
| `POST` | `/api/flags/{flag_id}/remove` | Trigger Devin to remove a flag (creates a session) |
| `GET` | `/api/flags/{flag_id}/removal-status` | Check the status of a removal session |
