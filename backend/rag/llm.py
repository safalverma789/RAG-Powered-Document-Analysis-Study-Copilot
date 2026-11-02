import json
import logging
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError
from config import GEMINI_API_KEY, GEMINI_MODEL, is_gemini_configured
from schemas import QuizQuestion

logger = logging.getLogger(__name__)


class GeminiAPIException(Exception):
    """Base exception for Gemini LLM errors."""
    pass


class GeminiConfigurationError(GeminiAPIException):
    """Raised when Gemini API key is missing or not configured."""
    pass


class LLMService:
    """Service wrapping Google Gemini API via google-genai SDK for RAG tasks."""

    def __init__(self):
        self.model_name = GEMINI_MODEL or "gemini-2.5-flash"
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """Retrieves or initializes the google-genai client."""
        if not is_gemini_configured():
            raise GeminiConfigurationError(
                "GEMINI_API_KEY is not configured. Please set a valid Google Gemini API key in backend/.env"
            )
        if self._client is None:
            self._client = genai.Client(api_key=GEMINI_API_KEY)
        return self._client

    def _generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Executes a text generation call to Gemini."""
        client = self._get_client()
        try:
            config = None
            if system_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2
                )
            else:
                config = types.GenerateContentConfig(temperature=0.2)

            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            return response.text.strip() if response.text else ""
        except APIError as e:
            logger.error(f"Gemini API error: {e}")
            raise GeminiAPIException(f"Gemini API call failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected generation error: {e}")
            raise GeminiAPIException(f"Failed to generate AI response: {str(e)}")

    def answer_question(self, question: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Answers a user question based strictly on retrieved chunks.
        Rule: If not in context, responds with: "I couldn't find this in your document."
        """
        if not retrieved_chunks:
            return "I couldn't find this in your document."

        # Assemble context blocks
        context_blocks = []
        for idx, chunk in enumerate(retrieved_chunks):
            fname = chunk.get("filename", "Doc")
            page = chunk.get("page", 1)
            text = chunk.get("text", "")
            context_blocks.append(f"[Source {idx+1}: {fname} (Page {page})]\n{text}")

        context_str = "\n\n---\n\n".join(context_blocks)

        system_instruction = (
            "You are an expert RAG-Powered Study Copilot. Your mission is to provide accurate answers "
            "based ONLY on the uploaded document context provided. "
            "CRITICAL RULE: If the answer is not directly mentioned or cannot be inferred with certainty "
            "from the context, you MUST answer exactly: 'I couldn't find this in your document.' "
            "Do NOT use external knowledge, do NOT invent facts, and do NOT speculate."
        )

        prompt = (
            f"DOCUMENT CONTEXT:\n{context_str}\n\n"
            f"QUESTION:\n{question}\n\n"
            "ANSWER (remember to state 'I couldn't find this in your document.' if not in context):"
        )

        answer = self._generate_text(prompt, system_instruction=system_instruction)
        return answer or "I couldn't find this in your document."

    def summarize_document(self, chunks: List[Dict[str, Any]], style: str = "short") -> str:
        """
        Summarizes an entire document using a Map-Reduce approach.
        - Map phase: Summarizes groups of chunks into intermediate summaries.
        - Reduce phase: Synthesizes intermediate summaries into final summary of requested style.
        """
        if not chunks:
            return "No content available to summarize."

        # If document is small (<= 4 chunks), summarize in a single step
        if len(chunks) <= 4:
            combined_text = "\n\n".join([c["text"] for c in chunks])
            system_instruction = (
                "You are an expert document summarizer. Base your summary ONLY on the provided document text."
            )
            style_instruction = (
                "Provide a concise, high-level summary highlighting the central theme and 3-5 core takeaways."
                if style == "short"
                else "Provide a detailed, structured summary covering key concepts, sections, and conclusions."
            )
            prompt = (
                f"DOCUMENT CONTENT:\n{combined_text}\n\n"
                f"INSTRUCTIONS:\n{style_instruction}\n\n"
                "SUMMARY:"
            )
            return self._generate_text(prompt, system_instruction=system_instruction)

        # Map phase: Group chunks into batches of 4
        batch_size = 4
        chunk_batches = [chunks[i:i + batch_size] for i in range(0, len(chunks), batch_size)]
        intermediate_summaries = []

        system_instruction_map = (
            "Summarize the following document excerpt objectively and concisely, capturing only factual content."
        )

        for b_idx, batch in enumerate(chunk_batches):
            batch_text = "\n\n".join([f"Page {c.get('page', 1)}: {c['text']}" for c in batch])
            prompt_map = f"EXCERPT PART {b_idx+1}:\n{batch_text}\n\nCONCISE SUMMARY:"
            part_summary = self._generate_text(prompt_map, system_instruction=system_instruction_map)
            if part_summary:
                intermediate_summaries.append(f"Section {b_idx+1} Summary:\n{part_summary}")

        # Reduce phase: Combine intermediate summaries into final output
        combined_summaries = "\n\n".join(intermediate_summaries)
        system_instruction_reduce = (
            "You are an expert study copilot. Synthesize the provided section summaries into a final cohesive document summary. "
            "Rely strictly on the provided section summaries without adding outside information."
        )

        style_instruction = (
            "Produce a clear, coherent 'short' summary with an executive overview and core bullet takeaways."
            if style == "short"
            else "Produce a comprehensive 'detailed' summary with sections, in-depth explanations, and synthesized findings."
        )

        prompt_reduce = (
            f"INTERMEDIATE SECTION SUMMARIES:\n{combined_summaries}\n\n"
            f"FINAL SUMMARY GOAL ({style}):\n{style_instruction}\n\n"
            "FINAL SYNTHESIZED SUMMARY:"
        )

        return self._generate_text(prompt_reduce, system_instruction=system_instruction_reduce)

    def extract_keypoints(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """
        Extracts key points as a bulleted list from document chunks.
        """
        if not chunks:
            return ["No document content available."]

        combined_text = "\n\n".join([f"Page {c.get('page', 1)}: {c['text']}" for c in chunks[:12]])

        system_instruction = (
            "You are an expert study copilot. Extract the most important key points from the provided text. "
            "Base every point ONLY on the text. Return each key point on a new line beginning with a hyphen '- '."
        )

        prompt = (
            f"DOCUMENT CONTEXT:\n{combined_text}\n\n"
            "Extract 5 to 10 prominent key points from the text above:\nKEY POINTS:"
        )

        response = self._generate_text(prompt, system_instruction=system_instruction)
        points: List[str] = []
        for line in response.splitlines():
            line_str = line.strip()
            # Remove leading bullets, numbers or hyphens
            cleaned = re.sub(r"^[-*•\d\.\)]+\s*", "", line_str).strip()
            if cleaned:
                points.append(cleaned)

        return points if points else [response]

    def generate_quiz(
        self,
        chunks: List[Dict[str, Any]],
        num_questions: int = 5,
        difficulty: str = "medium"
    ) -> List[QuizQuestion]:
        """
        Generates multiple-choice quiz questions based ONLY on document context.
        Forces JSON output, validates with Pydantic, and retries once if invalid.
        """
        if not chunks:
            raise ValueError("No document chunks available to generate quiz.")

        combined_text = "\n\n".join([f"Page {c.get('page', 1)}: {c['text']}" for c in chunks[:12]])

        base_prompt = (
            f"Generate exactly {num_questions} multiple-choice questions with difficulty '{difficulty}' "
            "based strictly on the document context below.\n\n"
            f"DOCUMENT CONTEXT:\n{combined_text}\n\n"
            "RULES:\n"
            "1. Answer, questions, and explanations MUST be derived purely from the context.\n"
            "2. Provide exactly 4 options labeled ['A) ...', 'B) ...', 'C) ...', 'D) ...'].\n"
            "3. 'correct_answer' must be the letter (e.g. 'A', 'B', 'C', or 'D').\n"
            "4. Return ONLY a valid JSON array of objects with the exact keys:\n"
            "   'question': string\n"
            "   'options': array of 4 strings\n"
            "   'correct_answer': string\n"
            "   'explanation': string\n"
            "DO NOT add any markdown formatting, preamble, or code ticks."
        )

        client = self._get_client()

        def _call_model(prompt_text: str) -> str:
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
            resp = client.models.generate_content(
                model=self.model_name,
                contents=prompt_text,
                config=config
            )
            return resp.text.strip() if resp.text else ""

        # Attempt 1
        raw_json = _call_model(base_prompt)
        parsed_questions = self._parse_and_validate_quiz(raw_json)

        # Retry once if attempt 1 failed
        if parsed_questions is None:
            logger.warning("Quiz JSON generation failed validation on attempt 1. Retrying with explicit prompt...")
            retry_prompt = (
                f"{base_prompt}\n\n"
                "ATTENTION: Your previous attempt was NOT valid JSON matching the requested schema. "
                "Ensure valid JSON syntax with no trailing commas, no explanatory text, and valid QuizQuestion objects."
            )
            raw_json_retry = _call_model(retry_prompt)
            parsed_questions = self._parse_and_validate_quiz(raw_json_retry)

        if parsed_questions is None or len(parsed_questions) == 0:
            raise GeminiAPIException(
                "Failed to parse valid quiz questions from AI response after retry."
            )

        return parsed_questions

    def _parse_and_validate_quiz(self, raw_text: str) -> Optional[List[QuizQuestion]]:
        """Parses and validates quiz JSON string into QuizQuestion list."""
        if not raw_text:
            return None

        # Clean any accidental code block markers
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
            clean_text = re.sub(r"\n?```$", "", clean_text).strip()

        try:
            data = json.loads(clean_text)
            if isinstance(data, dict) and "questions" in data:
                data = data["questions"]

            if not isinstance(data, list):
                return None

            validated_questions: List[QuizQuestion] = []
            for item in data:
                # Normalize options if they are dicts or missing
                options = item.get("options", [])
                if isinstance(options, dict):
                    options = [f"{k}) {v}" for k, v in options.items()]

                question_obj = QuizQuestion(
                    question=str(item.get("question", "")),
                    options=[str(opt) for opt in options],
                    correct_answer=str(item.get("correct_answer", "")),
                    explanation=str(item.get("explanation", ""))
                )
                validated_questions.append(question_obj)

            return validated_questions
        except Exception as e:
            logger.warning(f"Quiz validation error: {e}")
            return None

    def explain_topic(self, topic: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Explains a topic like a friendly tutor based ONLY on the document context.
        Rule: If not found, returns "I couldn't find this in your document."
        """
        if not chunks:
            return "I couldn't find this in your document."

        context_text = "\n\n".join([f"Page {c.get('page', 1)}: {c['text']}" for c in chunks])

        system_instruction = (
            "You are an encouraging, expert tutor explaining a subject to a student. "
            "CRITICAL RULE: Base your explanation ONLY on the provided context below. "
            "If the topic is not covered in the context, respond strictly: "
            "'I couldn't find this in your document.' "
            "Never invent facts or use outside knowledge."
        )

        prompt = (
            f"DOCUMENT CONTEXT:\n{context_text}\n\n"
            f"TOPIC TO EXPLAIN: {topic}\n\n"
            "TUTOR EXPLANATION (or 'I couldn't find this in your document.' if not in context):"
        )

        answer = self._generate_text(prompt, system_instruction=system_instruction)
        return answer or "I couldn't find this in your document."


# Singleton LLM service
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Returns singleton instance of LLMService."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
