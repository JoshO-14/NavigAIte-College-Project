from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def college_chat(user_message, cached_summaries):
    """
    Uses the summarized college data to power the chatbot's responses.
    cached_summaries should be a dict of college summaries loaded from cache.
    """
    # Build a short context of all summaries
    context = "\n\n".join(
        [f"{college}: {data['summary']}" for college, data in cached_summaries.items()]
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are NavigAIte, an expert college planning assistant that recommends schools and strategies for high school students."},
            {"role": "user", "content": f"Context:\n{context}\n\nUser: {user_message}"}
        ],
        temperature=0.7,
    )

    return response.choices[0].message.content
