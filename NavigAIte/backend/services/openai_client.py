from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("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"))

def summarize_pdf(college_name, pdf_text):
    prompt = f"""
    You are analyzing the Common Data Set for {college_name}.
    Extract key information such as:
    - Acceptance rate
    - Average GPA and SAT/ACT
    - Most popular majors
    - Financial aid stats
    - Class size and student-faculty ratio
    - Any notable programs or distinctions

    Then, summarize the insights clearly.
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an expert education data analyst."},
            {"role": "user", "content": prompt + "\n\n" + pdf_text}
        ],
        temperature=0.5,
    )

    return response.choices[0].message.content
