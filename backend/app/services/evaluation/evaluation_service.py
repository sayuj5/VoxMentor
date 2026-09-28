import json
import re
from typing import Optional
from openai import OpenAI, AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.logging import logger
from app.models.models import Session, ConversationMessage
from app.schemas.schemas import EvaluationCreate

MODE_DIMENSIONS = {
    "technical_interview": ["technical_score", "communication_score", "relevance_score", "confidence_score"],
    "hr_interview": ["communication_score", "relevance_score", "confidence_score"],
    "learning_mentor": ["technical_score", "communication_score", "relevance_score"],
    "communication_coach": ["communication_score", "relevance_score", "confidence_score"],
}

EVALUATION_PROMPTS = {
    "technical_interview": "Evaluate this technical interview. Score technical knowledge, problem solving, communication, and answer relevance.",
    "hr_interview": "Evaluate this HR/behavioral interview. Score communication, clarity, relevance, confidence, and professionalism.",
    "learning_mentor": "Evaluate this learning session. Score understanding, reasoning, engagement, and concept accuracy.",
    "communication_coach": "Evaluate this communication coaching session. Score clarity, fluency, structure, and conciseness.",
}


def _build_evaluation_prompt(session: Session, messages: list[ConversationMessage]) -> str:
    mode = session.mode.value
    topic = session.topic
    difficulty = session.difficulty.value
    eval_instructions = EVALUATION_PROMPTS.get(mode, EVALUATION_PROMPTS["technical_interview"])

    transcript = "\n".join(
        f"{msg.role.upper()}: {msg.content}" for msg in messages
    ) or "No conversation recorded."

    return f"""You are an expert evaluator for VoxMentor, an AI voice career mentor platform.

Session Details:
- Mode: {mode}
- Topic: {topic}
- Difficulty: {difficulty}

{eval_instructions}

CONVERSATION TRANSCRIPT:
{transcript}

Evaluate the USER's responses only. Provide a structured JSON evaluation with this EXACT schema:
{{
  "overall_score": <integer 0-100>,
  "technical_score": <integer 0-100 or null if not applicable>,
  "communication_score": <integer 0-100>,
  "relevance_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "summary": "<2-3 sentence summary of the user's overall performance>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}}

Return ONLY valid JSON. No markdown, no explanation, no code blocks."""


def evaluate_session(session: Session, messages: list[ConversationMessage]) -> Optional[EvaluationCreate]:
    """
    Generate a structured evaluation for a completed session using the LLM.
    """
    valid_user_messages = [
        msg for msg in messages 
        if msg.role.lower() == "user" and msg.content and msg.content.strip()
    ]
    
    min_responses = getattr(settings, "MIN_EVALUATION_RESPONSES", 1)
    if len(valid_user_messages) < min_responses:
        logger.info(f"Session {session.id} incomplete: only {len(valid_user_messages)} valid user responses.")
        return EvaluationCreate(
            status="incomplete",
            overall_score=None,
            technical_score=None,
            communication_score=None,
            relevance_score=None,
            confidence_score=None,
            summary="Session ended before enough user responses were recorded.",
            strengths=[],
            weaknesses=[],
            recommendations=[]
        )

    if not settings.AI_API_KEY:
        logger.warning("AI_API_KEY not configured — cannot evaluate session")
        return None

    client_kwargs = {"api_key": settings.AI_API_KEY}
    if settings.AI_PROVIDER == "groq":
        client_kwargs["base_url"] = "https://api.groq.com/openai/v1"

    client = OpenAI(**client_kwargs)
    prompt = _build_evaluation_prompt(session, messages)

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=settings.AI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1000,
            )
            raw = response.choices[0].message.content.strip()

            # Strip any accidental markdown code fences
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

            data = json.loads(raw)
            evaluation = EvaluationCreate(**data)
            return evaluation
            
        except AuthenticationError as e:
            logger.error(f"Evaluation failed: Invalid API key or unauthorized. Error: {e}")
            break # No point retrying auth errors
        except RateLimitError as e:
            logger.error(f"Evaluation failed (attempt {attempt + 1}): Rate limit exceeded or quota exhausted. Error: {e}")
        except (APITimeoutError, APIConnectionError) as e:
            logger.error(f"Evaluation failed (attempt {attempt + 1}): Network error or timeout. Error: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Evaluation JSON parse error (attempt {attempt + 1}): {e}")
            logger.debug(f"Raw response was: {raw}")
        except Exception as e:
            logger.error(f"Evaluation failed (attempt {attempt + 1}): {e}")

    return None
