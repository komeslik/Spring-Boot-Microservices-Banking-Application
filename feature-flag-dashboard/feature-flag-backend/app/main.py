from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

DEVIN_API_URL = "https://api.devin.ai/v1"
DEVIN_API_TOKEN = os.getenv("DEVIN_API_TOKEN", "")
REPO = "komeslik/Spring-Boot-Microservices-Banking-Application"

# ── Feature Flag Registry ──
FEATURE_FLAGS = [
    {
        "id": "user-registration",
        "name": "User Registration",
        "description": "Controls the POST /api/users/register endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-registration.enabled",
        "field_name": "userRegistrationEnabled",
        "status": "enabled",
    },
    {
        "id": "user-read",
        "name": "User Read",
        "description": "Controls the GET /api/users and GET /api/users/{id} endpoints",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-read.enabled",
        "field_name": "userReadEnabled",
        "status": "enabled",
    },
    {
        "id": "user-update-profile",
        "name": "User Update Profile",
        "description": "Controls the PUT /api/users/{id} endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-update-profile.enabled",
        "field_name": "userUpdateProfileEnabled",
        "status": "enabled",
    },
    {
        "id": "user-update-status",
        "name": "User Update Status",
        "description": "Controls the PATCH /api/users/{id} endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-update-status.enabled",
        "field_name": "userUpdateStatusEnabled",
        "status": "enabled",
    },
    {
        "id": "account-creation",
        "name": "Account Creation",
        "description": "Controls the POST /accounts endpoint",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-creation.enabled",
        "field_name": "accountCreationEnabled",
        "status": "enabled",
    },
    {
        "id": "account-read",
        "name": "Account Read",
        "description": "Controls the GET /accounts and GET /accounts/{id} endpoints",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-read.enabled",
        "field_name": "accountReadEnabled",
        "status": "enabled",
    },
    {
        "id": "account-update-status",
        "name": "Account Update Status",
        "description": "Controls the PATCH /accounts endpoint",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-update-status.enabled",
        "field_name": "accountUpdateStatusEnabled",
        "status": "enabled",
    },
    {
        "id": "transaction-create",
        "name": "Transaction Create",
        "description": "Controls the POST /transactions endpoint (deposits/withdrawals)",
        "type": "backend",
        "service": "Transaction Service",
        "location": "Transaction-Service/src/main/java/org/training/transactions/controller/TransactionController.java",
        "config_location": "Transaction-Service/src/main/resources/application.yml",
        "property": "feature.transaction-create.enabled",
        "field_name": "transactionCreateEnabled",
        "status": "enabled",
    },
    {
        "id": "transaction-read",
        "name": "Transaction Read",
        "description": "Controls the GET /transactions endpoint",
        "type": "backend",
        "service": "Transaction Service",
        "location": "Transaction-Service/src/main/java/org/training/transactions/controller/TransactionController.java",
        "config_location": "Transaction-Service/src/main/resources/application.yml",
        "property": "feature.transaction-read.enabled",
        "field_name": "transactionReadEnabled",
        "status": "enabled",
    },
    {
        "id": "sequence-generation",
        "name": "Sequence Generation",
        "description": "Controls the POST /sequence endpoint",
        "type": "backend",
        "service": "Sequence Generator",
        "location": "Sequence-Generator/src/main/java/org/training/sequence/generator/controller/SequenceController.java",
        "config_location": "Sequence-Generator/src/main/resources/application.yml",
        "property": "feature.sequence-generation.enabled",
        "field_name": "sequenceGenerationEnabled",
        "status": "enabled",
    },
    {
        "id": "fund-transfer",
        "name": "Fund Transfer",
        "description": "Controls the POST /fund-transfers endpoint",
        "type": "backend",
        "service": "Fund Transfer",
        "location": "Fund-Transfer/src/main/java/org/training/fundtransfer/controller/FundTransferController.java",
        "config_location": "Fund-Transfer/src/main/resources/application.yml",
        "property": "feature.fund-transfer.enabled",
        "field_name": "fundTransferEnabled",
        "status": "enabled",
    },
    {
        "id": "enable-demo-tab",
        "name": "Demo Tab",
        "description": "Shows/hides the Demo tab in the frontend sidebar navigation",
        "type": "frontend",
        "service": "Frontend",
        "location": "banking-frontend/src/App.tsx",
        "config_location": "banking-frontend/src/featureFlags.ts",
        "property": "ENABLE_DEMO_TAB",
        "field_name": "ENABLE_DEMO_TAB",
        "status": "enabled",
    },
    {
        "id": "enable-send-money",
        "name": "Send Money",
        "description": "Shows/hides the Send Money component in the Demo tab dashboard",
        "type": "frontend",
        "service": "Frontend",
        "location": "banking-frontend/src/DemoPanel.tsx",
        "config_location": "banking-frontend/src/featureFlags.ts",
        "property": "ENABLE_SEND_MONEY",
        "field_name": "ENABLE_SEND_MONEY",
        "status": "enabled",
    },
]

# In-memory tracking of removal sessions
removal_sessions: dict[str, dict] = {}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/flags")
async def list_flags():
    """Return all feature flags with their metadata and removal status."""
    flags_with_status = []
    for flag in FEATURE_FLAGS:
        flag_copy = dict(flag)
        if flag["id"] in removal_sessions:
            flag_copy["removal"] = removal_sessions[flag["id"]]
        flags_with_status.append(flag_copy)
    return {"flags": flags_with_status}


@app.get("/api/flags/{flag_id}")
async def get_flag(flag_id: str):
    """Return a single feature flag by ID."""
    for flag in FEATURE_FLAGS:
        if flag["id"] == flag_id:
            flag_copy = dict(flag)
            if flag_id in removal_sessions:
                flag_copy["removal"] = removal_sessions[flag_id]
            return flag_copy
    raise HTTPException(status_code=404, detail=f"Feature flag '{flag_id}' not found")


@app.post("/api/flags/{flag_id}/remove")
async def remove_flag(flag_id: str):
    """Trigger a Devin session to remove a feature flag from the codebase."""
    if not DEVIN_API_TOKEN:
        raise HTTPException(status_code=500, detail="DEVIN_API_TOKEN not configured")

    flag = None
    for f in FEATURE_FLAGS:
        if f["id"] == flag_id:
            flag = f
            break
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_id}' not found")

    if flag_id in removal_sessions and removal_sessions[flag_id]["status"] == "in_progress":
        return {
            "message": "Removal already in progress",
            "session": removal_sessions[flag_id],
        }

    if flag["type"] == "backend":
        prompt = _build_backend_removal_prompt(flag)
    else:
        prompt = _build_frontend_removal_prompt(flag)

    try:
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

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Devin API error: {response.text}",
            )

        data = response.json()
        session_info = {
            "flag_id": flag_id,
            "session_id": data["session_id"],
            "session_url": data["url"],
            "status": "in_progress",
        }
        removal_sessions[flag_id] = session_info

        return {
            "message": f"Devin session created to remove feature flag '{flag['name']}'",
            "session": session_info,
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to reach Devin API: {str(e)}")


@app.get("/api/flags/{flag_id}/removal-status")
async def get_removal_status(flag_id: str):
    """Check the status of a feature flag removal session."""
    if flag_id not in removal_sessions:
        return {"status": "not_started"}

    session_info = removal_sessions[flag_id]

    if DEVIN_API_TOKEN and session_info["status"] == "in_progress":
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{DEVIN_API_URL}/session/{session_info['session_id']}",
                    headers={"Authorization": f"Bearer {DEVIN_API_TOKEN}"},
                    timeout=10.0,
                )
            if response.status_code == 200:
                devin_data = response.json()
                devin_status = devin_data.get("status", "unknown")
                if devin_status in ("finished", "stopped"):
                    session_info["status"] = "completed"
                    session_info["pull_request"] = devin_data.get("pull_request")
                elif devin_status == "error":
                    session_info["status"] = "failed"
        except httpx.RequestError:
            pass

    return session_info


def _build_backend_removal_prompt(flag: dict) -> str:
    return f"""You are tasked with removing a backend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}
**Controller File:** {flag['location']}
**Config File:** {flag['config_location']}
**Field Name in Controller:** {flag['field_name']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the feature flag from the controller** (`{flag['location']}`):
   - Remove the `@Value("${{{flag['property']}}}:true")` annotation and the `private boolean {flag['field_name']};` field.
   - Remove the `if (!{flag['field_name']})` check and the 503 response block from the affected endpoint method(s). Keep the actual business logic that was inside the "enabled" branch.
   - Remove any unused imports (e.g., `HttpStatus` if no longer needed).

3. **Remove the feature flag from application.yml** (`{flag['config_location']}`):
   - Remove the `{flag['property']}: true` line and any empty parent `feature:` keys left behind.

4. **Update the unit tests** (look for `*FeatureFlagTest.java` in the same service's test directory):
   - Remove the test methods that tested this specific flag's enabled/disabled behavior.
   - If the entire test class only tested this one flag, delete the test file entirely.
   - If the test class tests multiple flags, only remove the methods for this flag.

5. **Run `mvn test`** in the affected service directory to ensure all remaining tests pass.

6. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description documenting: which flag was removed, which files were changed, that tests pass.

**Important:** The feature flag is currently enabled (true), so removing it means the endpoint should always be available (the "enabled" code path becomes the only path). Do NOT remove the endpoint itself -- only remove the flag gating logic.
"""


def _build_frontend_removal_prompt(flag: dict) -> str:
    if flag["id"] == "enable-demo-tab":
        return f"""You are tasked with removing a frontend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the flag from `banking-frontend/src/featureFlags.ts`**:
   - Remove the `ENABLE_DEMO_TAB: true` entry from the featureFlags object.

3. **Update `banking-frontend/src/App.tsx`**:
   - The Demo tab entry in the `tabs` array is conditionally included with `...(featureFlags.ENABLE_DEMO_TAB ? [...] : [])`.
   - Replace this with always including the Demo tab entry (remove the conditional spread).
   - Remove the `import featureFlags from './featureFlags'` if no other flags are used in App.tsx.

4. **Update the frontend tests** (`banking-frontend/src/test/featureFlags.test.tsx`):
   - Remove the `ENABLE_DEMO_TAB` test cases.
   - If no tests remain, delete the test file.

5. **Run `npm test`** in `banking-frontend/` to ensure tests pass.

6. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description documenting: which flag was removed, which files were changed, that tests pass.

**Important:** The flag is currently enabled (true), so removing it means the Demo tab should always be shown. Do NOT remove the Demo tab itself.
"""
    else:
        return f"""You are tasked with removing a frontend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the flag from `banking-frontend/src/featureFlags.ts`**:
   - Remove the `ENABLE_SEND_MONEY: true` entry from the featureFlags object.

3. **Update `banking-frontend/src/DemoPanel.tsx`**:
   - Find the conditional rendering `featureFlags.ENABLE_SEND_MONEY ? (...) : (...)`.
   - Keep only the "enabled" branch (the actual Send Money component). Remove the "disabled" branch (the grayed-out placeholder).
   - Remove the `import featureFlags from './featureFlags'` if no other flags are used in DemoPanel.tsx.

4. **Update the frontend tests** (`banking-frontend/src/test/featureFlags.test.tsx`):
   - Remove the `ENABLE_SEND_MONEY` test cases.
   - If no tests remain, delete the test file.

5. **Run `npm test`** in `banking-frontend/` to ensure tests pass.

6. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description documenting: which flag was removed, which files were changed, that tests pass.

**Important:** The flag is currently enabled (true), so removing it means the Send Money component should always be shown. Do NOT remove the component itself.
"""
