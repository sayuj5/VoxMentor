"""
Agora Conversation AI service.

Key design decisions:
- Timeouts are split (connect/write short, read longer) because Agora's join
  API can take up to ~20s to respond when initialising the agent pipeline.
- A ReadTimeout is treated as INDETERMINATE — the agent may or may not have
  been created. We return {"status": "timeout"} rather than raising so the
  caller can persist RECOVERING state instead of crashing.
- HTTP 409 TaskConflict is treated as CONFLICT, not an error — the caller
  can inspect whether the conflict is for the same channel and recover.
- Secrets (App Certificate, credential) are never logged.
"""

import time
import httpx
from app.core.config import settings
from app.core.logging import logger
from agora_token_builder import RtcTokenBuilder

# ── Timeout configuration ─────────────────────────────────────────────────────
# connect/write: short — if Agora is unreachable we want to fail fast
# read: generous — the agent pipeline startup can legitimately take 20-25s
# pool: short — we don't hold connections
_AGORA_TIMEOUT = httpx.Timeout(connect=5.0, write=5.0, read=30.0, pool=5.0)


# ── Token generation ──────────────────────────────────────────────────────────

def generate_rtc_token(channel_name: str, uid: int, expire_seconds: int = 3600) -> str:
    """
    Generate a temporary Agora RTC token using the official agora-token-builder.
    Safe diagnostics only — never logs the full token or App Certificate.
    """
    app_id = settings.AGORA_APP_ID
    app_certificate = settings.AGORA_APP_CERTIFICATE

    if not app_id or not app_certificate:
        logger.warning("[RTC_TOKEN] Agora credentials not configured — returning placeholder")
        return "AGORA_NOT_CONFIGURED"

    expire_timestamp = int(time.time()) + expire_seconds
    role = 1  # Role_Publisher

    try:
        token = RtcTokenBuilder.buildTokenWithUid(
            appId=app_id,
            appCertificate=app_certificate,
            channelName=channel_name,
            uid=uid,
            role=role,
            privilegeExpiredTs=expire_timestamp,
        )

        logger.info(
            "[BACKEND_TOKEN_DIAGNOSTICS] "
            f"tokenExists={bool(token)}, "
            f"tokenLength={len(token)}, "
            f"prefix={token[:3] if token else ''}, "
            f"suffix={token[-6:] if token else ''}, "
            f"channel={channel_name}, "
            f"uid={uid}, "
            f"expirationTs={expire_timestamp}"
        )
        return token
    except Exception as e:
        logger.error(f"[RTC_TOKEN] Failed to generate Agora token: {e}")
        raise


# ── System prompts ────────────────────────────────────────────────────────────

def get_system_prompt(mode: str, topic: str, difficulty: str) -> str:
    """Return the appropriate system prompt for the given session mode."""
    prompts = {
        "technical_interview": f"""You are a senior technical interviewer conducting a {difficulty} level technical interview on the topic: {topic}.

Your role:
- Ask clear, relevant technical questions one at a time.
- Listen carefully to the candidate's answer.
- Ask thoughtful follow-up questions based on their response.
- If they answer well, increase the difficulty.
- If they struggle, ask a clarifying or simpler question.
- Stay focused on {topic}.
- Evaluate: technical knowledge, problem solving, communication, answer relevance.
- Be professional, encouraging, and constructive.
- Do NOT repeat questions.
- Keep your responses concise — one question or comment at a time.

Start by greeting the candidate and asking your first question.""",

        "hr_interview": f"""You are an experienced HR interviewer conducting a {difficulty} level behavioral interview.

Your role:
- Ask behavioral and situational interview questions one at a time.
- Listen to their responses and ask natural follow-up questions.
- Evaluate: communication clarity, professionalism, confidence, relevance.
- Keep conversations natural and engaging.
- Be warm, professional, and supportive.
- Do NOT repeat questions.
- Keep your responses concise.

Start by introducing yourself and asking your first question.""",

        "learning_mentor": f"""You are a supportive AI learning mentor helping someone understand: {topic}.

Your role:
- Explain concepts clearly and check for understanding.
- Ask questions to gauge comprehension.
- Adapt your explanations based on their responses.
- If they understand well, explore deeper concepts.
- If they struggle, simplify and use examples.
- Evaluate: understanding, reasoning, concept accuracy, engagement.
- Keep explanations and questions concise.

Start by asking what they already know about {topic}.""",

        "communication_coach": f"""You are a professional communication coach helping someone improve their spoken communication skills.

Your role:
- Give the candidate speaking prompts and topics to discuss.
- Listen to their response and provide brief, actionable feedback.
- Focus on: clarity, structure, fluency, and conciseness.
- Ask them to try again if they struggle.
- Be encouraging and specific in your feedback.
- Keep interactions focused and paced well.

Start by introducing yourself and giving them their first speaking prompt.""",
    }
    return prompts.get(mode, prompts["technical_interview"])


# ── Agora Conversation AI agent lifecycle ─────────────────────────────────────

def start_conversation_ai_agent(
    channel_name: str,
    mode: str,
    topic: str,
    difficulty: str,
    agent_rtc_uid: str,
    user_rtc_uid: int,
) -> dict:
    """
    Start the Agora Conversation AI agent.

    Returns a dict with a 'status' key:
      - 'success'  → agent started; 'agent_id' key contains the agent instance ID
      - 'timeout'  → HTTP read timed out; agent may or may not have been created
      - 'conflict' → HTTP 409; agent with this channel name may already be running
      - 'skipped'  → credentials not configured (dev/test)
      - raises     → any other unexpected error (caller should mark FAILED)
    """
    app_id = settings.AGORA_APP_ID
    pipeline_id = settings.AGORA_PIPELINE_ID
    base_url = settings.AGORA_CONVERSATION_API_BASE_URL
    credential = settings.AGORA_CONVERSATION_API_CREDENTIAL

    if not all([app_id, pipeline_id, base_url, credential]):
        logger.warning("[AGORA_JOIN] Credentials not fully configured — skipping real API call")
        return {"status": "skipped", "reason": "missing_credentials"}

    url = f"{base_url.rstrip('/')}/api/conversational-ai-agent/v2/projects/{app_id}/join"
    system_prompt = get_system_prompt(mode, topic, difficulty)
    agent_token = generate_rtc_token(channel_name, int(agent_rtc_uid))

    payload = {
        "name": channel_name,
        "pipeline_id": pipeline_id,
        "properties": {
            "channel": channel_name,
            "token": agent_token,
            "agent_rtc_uid": str(agent_rtc_uid),
            "remote_rtc_uids": [str(user_rtc_uid)],
            "llm": {
                "system_messages": [{"role": "system", "content": system_prompt}]
            },
        },
    }
    headers = {
        "Authorization": f"Basic {credential}",
        "Content-Type": "application/json",
    }

    # Safe structure log (no secrets)
    props = payload["properties"]
    logger.info(
        "[AGORA_JOIN] request_started "
        f"channel={channel_name} "
        f"agent_uid={agent_rtc_uid} "
        f"user_uid={user_rtc_uid} "
        f"pipeline_id={pipeline_id} "
        f"payload_keys={sorted(props.keys())}"
    )

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, headers=headers, timeout=_AGORA_TIMEOUT)

        if response.status_code == 409:
            body: dict = {}
            try:
                body = response.json()
            except Exception:
                pass
            reason = body.get("reason", "TaskConflict")
            agent_id = body.get("agent_id", "")
            logger.warning(
                f"[AGORA_JOIN_CONFLICT] channel={channel_name} reason={reason} agent_id={agent_id}"
            )
            return {"status": "conflict", "reason": reason, "agent_id": agent_id, "body": body}

        response.raise_for_status()

        body = response.json()
        agent_id = body.get("agent_id", "")
        logger.info(f"[AGORA_JOIN_SUCCESS] channel={channel_name} agent_id={agent_id}")
        return {"status": "success", "agent_id": agent_id, "body": body}

    except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
        logger.warning(
            f"[AGORA_JOIN_TIMEOUT] channel={channel_name} "
            f"error_type={type(e).__name__} "
            "operation_state=UNKNOWN — agent may or may not have been created"
        )
        return {"status": "timeout", "reason": str(type(e).__name__)}

    except httpx.HTTPStatusError as e:
        logger.error(
            f"[AGORA_JOIN] HTTP error {e.response.status_code} "
            f"channel={channel_name} body={e.response.text[:300]}"
        )
        raise

    except httpx.RequestError as e:
        logger.error(f"[AGORA_JOIN] Network error channel={channel_name}: {e}")
        raise


def stop_conversation_ai_agent(agent_id: str) -> dict:
    """
    Stop an active Agora Conversation AI agent using the official DELETE endpoint.
    Official API: DELETE /api/conversational-ai-agent/v2/projects/{app_id}/agents/{agent_id}

    Returns a dict with 'status':
      - 'success'  → agent stopped
      - 'not_found'→ agent was already gone (404)
      - 'skipped'  → credentials not configured
      - raises     → unexpected error (caller should log and continue)
    """
    if not agent_id:
        logger.warning("[AGORA_LEAVE] No agent_id provided — skipping stop call")
        return {"status": "skipped", "reason": "no_agent_id"}

    app_id = settings.AGORA_APP_ID
    base_url = settings.AGORA_CONVERSATION_API_BASE_URL
    credential = settings.AGORA_CONVERSATION_API_CREDENTIAL

    if not all([app_id, base_url, credential]):
        logger.warning("[AGORA_LEAVE] Credentials not configured — skipping agent stop")
        return {"status": "skipped", "reason": "missing_credentials"}

    url = f"{base_url.rstrip('/')}/api/conversational-ai-agent/v2/projects/{app_id}/agents/{agent_id}"
    headers = {
        "Authorization": f"Basic {credential}",
        "Content-Type": "application/json",
    }

    logger.info(f"[AGORA_LEAVE] Stopping agent agent_id={agent_id}")

    try:
        with httpx.Client() as client:
            response = client.delete(url, headers=headers, timeout=_AGORA_TIMEOUT)

        if response.status_code == 404:
            logger.info(f"[AGORA_LEAVE] Agent already gone (404) agent_id={agent_id}")
            return {"status": "not_found"}

        response.raise_for_status()
        logger.info(f"[AGORA_LEAVE] Agent stopped successfully agent_id={agent_id}")
        return {"status": "success"}

    except (httpx.ReadTimeout, httpx.ConnectTimeout):
        logger.warning(f"[AGORA_LEAVE] Timeout while stopping agent agent_id={agent_id} — proceeding anyway")
        return {"status": "timeout"}

    except httpx.HTTPStatusError as e:
        logger.error(
            f"[AGORA_LEAVE] HTTP error {e.response.status_code} "
            f"agent_id={agent_id} body={e.response.text[:200]}"
        )
        raise

    except httpx.RequestError as e:
        logger.error(f"[AGORA_LEAVE] Network error agent_id={agent_id}: {e}")
        raise
