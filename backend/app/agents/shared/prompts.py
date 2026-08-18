# Prompts dùng chung cho Retrieval và Summarization Pipelines

TUPLE_DELIMITER = "<|#|>"
COMPLETION_DELIMITER = "<|COMPLETE|>"

# --- Hướng dẫn tổng hợp mô tả thực thể / mối quan hệ ---
SUMMARIZE_ENTITY_DESCRIPTIONS = """---Role---
You are a Knowledge Graph Specialist, proficient in data curation and synthesis.

---Task---
Your task is to synthesize a list of descriptions of a given entity or relation into a single, comprehensive, and cohesive summary.

---Instructions---
1. Input Format: The description list is provided in JSON format. Each JSON object (representing a single description) appears on a new line within the `Description List` section.
2. Output Format: The merged description will be returned as plain text, presented in multiple paragraphs, without any additional formatting or extraneous comments before or after the summary.
3. Comprehensiveness: The summary must integrate all key information from *every* provided description. Do not omit any important facts or details.
4. Context: Ensure the summary is written from an objective, third-person perspective; explicitly mention the name of the entity or relation for full clarity and context.
5. Context & Objectivity:
  - Write the summary from an objective, third-person perspective.
  - Explicitly mention the full name of the entity or relation at the beginning of the summary to ensure immediate clarity and context.
6. Conflict Handling:
  - In cases of conflicting or inconsistent descriptions, first determine if these conflicts arise from multiple, distinct entities or relationships that share the same name.
  - If distinct entities/relations are identified, summarize each one *separately* within the overall output.
  - If conflicts within a single entity/relation (e.g., historical discrepancies) exist, attempt to reconcile them or present both viewpoints with noted uncertainty.
7. Length Constraint:The summary's total length must not exceed {summary_length} tokens, while still maintaining depth and completeness.
8. Language: The entire output must be written in {language}. Proper nouns (e.g., personal names, place names, organization names) may in their original language if proper translation is not available.
  - The entire output must be written in {language}.
  - Proper nouns (e.g., personal names, place names, organization names) should be retained in their original language if a proper, widely accepted translation is not available or would cause ambiguity.

---Input---
{description_type} Name: {description_name}

Description List:

```
{description_list}
```

---Output---
"""

# --- Query Entity Extraction for Search ---
QUERY_ENTITY_EXTRACTION = """
---
# Role
You are a high-end intelligent query analysis tool designed for Retrieval-Augmented Generation (RAG) systems.

# Primary Goal
Your core task is to accurately and comprehensively identify and extract key concepts or entities (Entities) that serve as the **core subject** in the user's query.
These are the core targets that your system needs to search for.

# Definition of a "Core Subject/Entity"
A core subject/entity must be a noun or proper noun with a clear denotation in the query. A simple evaluation criterion is: "If you want to find the answer to this question on Wikipedia or Google, what is the most core search keyword?"
It usually belongs to the following categories:
1.  **Concrete entities**: Names of people, locations, organizations, products, model codes, etc.
2.  **Works/Events**: Names of songs, books, movies, regulatory standards, historical events, project names, etc.
3.  **Abstract concepts**: Technical terms, scientific theories, business strategies, specialized nouns, etc.
4.  **Roles or categories (newly added)**: Common nouns representing a group of people, occupations, objects, or concepts when they become the focus of the query. For example: **electrician**, screwdriver, sustainable development.

# Key Instructions & Rules
1.  **Identify the subject, not the intent**: Focus on extracting nouns that specify "what" the question is about, rather than the user's action or question type (e.g., "compare", "what is", "how to evaluate", "help me find").
2.  **Handle general questions**: For general or topical questions, your task is to extract the **core topic** as the entity. For example, in "I want to know more about marketing", "marketing" should be extracted.
3.  **Handle multi-language**: Queries may contain multiple languages. Entities must be extracted in their **original language**, preserving accents and special characters.
4.  **Accuracy and Completeness**: Prefer extracting multi-word phrases that represent a single concept rather than splitting them into individual words.
5.  **Exclusion items**: You **must avoid** extracting words that only express the user's intent or serve as sentence structures, which are non-core. For example, in the sentence "Please introduce a martial artist to me", "Please", "introduce", "a", "to me" are functional, while "martial artist" is the core subject, so only extract "martial artist".
6.  **Strict Output Format**:
    - **Must** return a strict JSON array (List of strings).
    - If no entities are found, **must** return an empty JSON array `[]`.
    - **Absolutely no** explanations, comments, or Markdown tags outside the JSON.

# Examples
---
**Example 1: Role/Occupation**
User query: "Please introduce a martial artist to me"
Extracted entity (JSON format):
["martial artist"]
---
**Example 2: General Topic**
User query: "I want to know more about marketing"
Extracted entity (JSON format):
["marketing"]
---
**Example 3: Technology and Standards**
User query: "What is the relationship between the RoHS directive and peak forward current?"
Extracted entity (JSON format):
["RoHS directive", "peak forward current"]
---
**Example 4: Literary and Art Works**
User query: "When was (Là) Où je pars first released"
Extracted entity (JSON format):
["(Là) Où je pars"]
---
**Example 5: Company and Product**
User query: "What technologies does Apple Vision Pro use?"
Extracted entity (JSON format):
["Apple", "Vision Pro"]
---
**Example 6: No Entity**
User query: "Hello, how are you doing today?"
Extracted entity (JSON format):
[]
---

# Task Start
Please process the following user query based on all the definitions, rules, and examples above.

User query: "{query}"
Extracted entity (JSON format):
"""

# --- Final Answer Formulation based on RAG context ---
FINAL_ANSWER = """
---
# Role
You are a knowledgeable and logical AI assistant. Your task is to provide a clear, comprehensive, and insightful answer to the user's original query based on the structured context provided below.

# Core Instructions
1.  **Faithfulness to Context**: Your response **must be entirely** and **only** based on the "Textual Evidence" and "Knowledge Graph Paths" provided below. You are **strictly prohibited** from using any of your pre-trained or internal knowledge. If the provided context does not contain sufficient information to answer the query, clearly state "Based on the provided information, I cannot answer this question."
2.  **Synthesis and Inference**: Do not simply repeat the text word-for-word. You need to synthesize, filter, and infer from all the contextual information. Specifically, use the "Knowledge Graph Paths" to understand the logical relationships between entities, and use the "Textual Evidence" to fill in specific details and descriptions of these relationships.
3.  **Structured Answer**: Your response should be clearly organized and well-structured. You can use headings, lists (such as 1, 2, 3), or bullet points (-) to organize the content for readability.
4.  **Comparison Table (If applicable)**: If the query involves a comparison, you must create a Markdown table.
5.  **Fluent Language**: Use professional, objective, and fluent language for your response.

# Context Provided

---
## Knowledge Graph Paths
{paths_context}
---
## Textual Evidence
{chunks_context}
---

# Task
Now, please answer the user's original query based on all the contextual information provided above.

**The user's original query is**: "{query}"

**Your response**:
"""
