import json
import logging
from typing import Any

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

REVIEW_ANALYSIS_PROMPT = """You are a restaurant review analyst. For each venue, analyze the provided reviews and extract:

1. SENTIMENT: Calculate approximate percentages of positive/neutral/negative sentiment (must sum to 1.0)
2. STANDOUT DISHES: Identify specific dishes, drinks, or menu items mentioned multiple times or praised highly (be specific - include exact names, max 5 items)
3. REVIEW SUMMARY: Write 2-3 sentences summarizing what customers love or dislike
4. HIGHLIGHTS: Extract 3-5 key themes (e.g., "Great for dates", "Fast service", "Can be noisy")

Return ONLY valid JSON array with structure:
[
  {
    "venueName": "...",
    "sentiment": {"positive": 0.7, "neutral": 0.2, "negative": 0.1},
    "standoutDishes": ["Dish 1", "Dish 2"],
    "reviewSummary": "...",
    "highlights": ["Theme 1", "Theme 2"]
  }
]

If a venue has no reviews, omit it from the array entirely. Return ONLY the JSON array, no markdown formatting or code blocks."""


def _build_review_message(venues_with_reviews: list[dict[str, Any]]) -> str:
    """Build user message with venue reviews (top 5 per venue)."""
    simplified = []
    for venue in venues_with_reviews:
        reviews = venue.get("reviews", [])
        if not reviews:
            continue

        # Take top 5 most recent reviews
        top_reviews = reviews[:5]
        review_texts = []
        for review in top_reviews:
            rating = review.get("rating", 0)
            text = review.get("text", {}).get("text", "")
            if text:
                review_texts.append(f"Rating: {rating}/5\n{text}")

        if review_texts:
            simplified.append(
                {
                    "name": venue.get("displayName", {}).get("text", ""),
                    "reviews": review_texts,
                }
            )

    return json.dumps(simplified, indent=2)


async def analyze_reviews_with_ai(
    venues_with_reviews: list[dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    """
    Batch analyze reviews for multiple venues using Claude.

    Returns dict keyed by venue name with:
    {
        "sentiment": {"positive": 0.7, "neutral": 0.2, "negative": 0.1},
        "standoutDishes": ["Truffle Pasta", "Tiramisu"],
        "reviewSummary": "Customers rave about...",
        "highlights": ["Romantic ambiance", "Attentive service"]
    }
    """
    analysis_map: dict[str, dict[str, Any]] = {}

    # Filter venues that actually have reviews
    venues_with_content = [v for v in venues_with_reviews if v.get("reviews")]
    if not venues_with_content:
        logger.info("No venues with reviews to analyze")
        return analysis_map

    api_key = settings.anthropic_api_key
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping review analysis")
        return analysis_map

    client = anthropic.AsyncAnthropic(api_key=api_key)

    for attempt in range(2):
        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2048,
                system=REVIEW_ANALYSIS_PROMPT,
                messages=[{"role": "user", "content": _build_review_message(venues_with_content)}],
            )

            text_block = next((c for c in message.content if c.type == "text"), None)
            if not text_block:
                raise ValueError("No text content in response")

            raw_text = text_block.text.strip()
            # Strip markdown code blocks if present
            if raw_text.startswith("```"):
                raw_text = raw_text.lstrip("`").removeprefix("json").strip()
                raw_text = raw_text.rstrip("`").strip()

            analyses: list[dict[str, Any]] = json.loads(raw_text)

            for analysis in analyses:
                venue_name = analysis.get("venueName")
                if venue_name:
                    analysis_map[venue_name] = {
                        "sentiment": analysis.get("sentiment", {}),
                        "standoutDishes": analysis.get("standoutDishes", []),
                        "reviewSummary": analysis.get("reviewSummary"),
                        "highlights": analysis.get("highlights", []),
                    }

            logger.info(f"Successfully analyzed reviews for {len(analysis_map)} venues")
            return analysis_map

        except Exception as e:
            if attempt == 0:
                logger.warning("Review analysis attempt 1 failed, retrying: %s", e)
                continue
            logger.error("Review analysis failed after 2 attempts: %s", e)

    return analysis_map
