# library imports
import json
import os
import sys
import re
import io
import datetime
from typing import Dict, List, Tuple
from contextlib import redirect_stdout
from autogen import AssistantAgent, UserProxyAgent
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
from json_repair import repair_json
import dirtyjson

# Load environment variables 
load_dotenv()

# Initialize FastAPI application with metadata
app = FastAPI(
    title="AI Job Transformation API",
    description="API for analyzing job positions and their AI transformation potential",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing) to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (can be restricted to specific domains)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# API ENDPOINTS
@app.post("/analyze-job")
async def analyze_job_endpoint(request: Dict = Body(...)):
    """
    Main API endpoint for job transformation analysis

    Process:
    1. Receives a job position from the frontend
    2. Validates the input
    3. Runs the multi-agent analysis pipeline
    4. Returns comprehensive results including job description, tasks, AI impact analysis, and recommendations

    Args:
        request: Dictionary containing the job_position field

    Returns:
        JSON object with analysis results, HTML report, and backend logs
    """
    job_position = request.get("job_position", "")
    try:
        # Capture all console output for logging purposes
        f = io.StringIO()
        with redirect_stdout(f):
            # Step 1: Validate job position input
            is_valid, error_message = validate_job_position(job_position)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_message)

            # Step 2: Execute the full analysis pipeline
            transformation_results = analyze_job_for_ai_transformation(job_position)

            # Step 3: Check for errors in the analysis
            if transformation_results.get("status") == "error":
                raise HTTPException(
                    status_code=500,
                    detail=f"Analysis failed: {transformation_results.get('message')}"
                )

        # Attach backend logs to the response
        backend_logs = f.getvalue()
        transformation_results["backend_logs"] = backend_logs
        return transformation_results

    except Exception as e:
        # Handle any unexpected errors
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LLM CONFIGURATION - OLLAMA
# ============================================================================
# Configure Ollama for local LLM inference
# Ollama provides fast, private, and free AI model hosting on your local machine
# Default model: llama3.2 (you can change this to any model you have installed)
# Available models: llama3.2, mistral, codellama, phi, etc.
# To see installed models: ollama list
# To install a model: ollama pull <model-name>

def get_llm_config() -> Dict:
    """
    Get LLM configuration for agents (supports OpenAI or Ollama)

    Returns:
        Dictionary with API configuration
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key:
        # OpenAI Configuration
        return {
            "config_list": [
                {
                    "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    "api_key": api_key,
                }
            ],
            "temperature": float(os.getenv("TEMPERATURE", "0.7")),
            "timeout": int(os.getenv("TIMEOUT", "300")),
        }
    else:
        # Ollama Configuration (fallback)
        return {
            "config_list": [
                {
                    "model": os.getenv("OLLAMA_MODEL", "functiongemma"),
                    "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                    "api_key": "ollama",
                    "price": [0, 0],
                }
            ],
            "temperature": float(os.getenv("TEMPERATURE", "0.7")),
            "timeout": int(os.getenv("TIMEOUT", "300")),
        }

# LLM configuration object used by all agents
llm_config = get_llm_config()

# ============================================================================
# AGENT 1: JOB DESCRIBER AGENT
# ============================================================================
# Purpose: Analyzes the job position and generates a detailed job description
# Input: Job title (e.g., "Backend Developer")
# Output: Structured JSON with job title, description, responsibilities, and requirements
agent_job_describer = AssistantAgent(
    name="Job_Describer",
    system_message="""You are an expert in job analysis and description, specializing in IT roles.

CRITICAL: You must ONLY respond with valid JSON. No other text, no explanations, just pure JSON.

When given a job title, respond with this exact JSON structure:
{
    "job_title": "The job title provided",
    "Description": "Brief 1-2 sentence overview of the role",
    "key_responsibilities": [
        {"responsibility": "Core responsibility 1", "importance": "High"},
        {"responsibility": "Core responsibility 2", "importance": "High"},
        {"responsibility": "Core responsibility 3", "importance": "Medium"}
    ],
    "essential_requirements": [
        "Key requirement 1",
        "Key requirement 2",
        "Key requirement 3"
    ]
}

Remember: ONLY output valid JSON, nothing else. Start with { and end with }.""",
    llm_config=llm_config
)

# ============================================================================
# AGENT 2: TASK EXTRACTOR AGENT
# ============================================================================
# Purpose: Extracts all individual tasks from the job description
# Input: Job description JSON from Agent 1
# Output: List of tasks with detailed descriptions
agent_task_extractor = AssistantAgent(
    name="Task_Extractor",
    system_message="""You are an expert in task extraction from job descriptions.

CRITICAL: You must ONLY respond with valid JSON array. No other text, no explanations, just pure JSON.

When given a job description, respond with this exact JSON structure:
[
    {"task_name": "Task 1", "description": "Detailed description of task 1"},
    {"task_name": "Task 2", "description": "Detailed description of task 2"},
    {"task_name": "Task 3", "description": "Detailed description of task 3"}
]

Remember: ONLY output valid JSON array, nothing else. Start with [ and end with ].""",
    llm_config=llm_config
)

# ============================================================================
# AGENT 3: VERIFICATION & VALIDATION AGENT
# ============================================================================
# Purpose: Reviews and validates outputs from previous agents, making corrections if needed
# This agent ensures data quality and consistency before proceeding to AI impact analysis
agent_verifier = AssistantAgent(
    name="Verification_Agent",
    system_message="""You are a quality assurance specialist for job analysis data.

CRITICAL: You must ONLY respond with valid JSON. No other text, just pure JSON.

When given job data to verify, respond with this exact JSON structure:
{
    "verification_status": "APPROVED",
    "corrections_made": [],
    "validated_job_description": {},
    "validated_tasks": []
}

Remember: ONLY output valid JSON, nothing else. Start with { and end with }.""",
    llm_config=llm_config
)

# ============================================================================
# AGENT 4: AI IMPACT ANALYZER AGENT
# ============================================================================
# Purpose: Analyzes the automation potential of each task and estimates AI involvement
# Input: Validated tasks from Agent 3
# Output: Automation categories, AI percentages, time savings, and explanations
agent_task_automation_categorizer = AssistantAgent(
    name="Task_Automation_Categorizer",
    system_message="""
    You are an expert in AI automation analysis. Your role is to categorize job tasks based on their automation potential.

    Your task is to:
    1. Analyze each job task and determine if it can be:
       a) FULLY AUTOMATED by AI (90-100% automation)
       b) PARTIALLY AUTOMATED/HYBRID by AI (30-89% automation)
       c) NOT AUTOMATABLE (0-29% automation)
    2. Provide a detailed explanation for each categorization.
    3. Estimate the percentage of AI involvement for each task.
    4. Calculate the potential time saved through AI automation.
    5. Identify which AI technologies could be used (e.g., LLMs, Computer Vision, RPA, etc.).

    IMPORTANT: Your output MUST ALWAYS be formatted as a valid JSON object.
    The output should follow this exact structure:

    ```json
    {
        "automation_analysis": [
            {
                "task": "Task description",
                "automation_category": "FULLY_AUTOMATED",
                "ai_involvement_percentage": 100,
                "time_saved_percentage": 80,
                "ai_technologies": ["LLMs", "Code Generation"],
                "explanation": "Detailed explanation of why this task can be fully automated and the expected impact."
            }
        ],
        "overall_metrics": {
            "average_automation_percentage": 65,
            "estimated_time_savings": "40-50% overall time reduction",
            "automation_readiness": "High/Medium/Low"
        }
    }
    ```
    """,
    llm_config=llm_config
)

# ============================================================================
# AGENT 5: HTML REPORT GENERATOR AGENT
# ============================================================================
# Purpose: Generates a comprehensive, visually appealing HTML report
# Input: All analysis results combined
# Output: HTML document with styled sections and visualizations
html_generator = AssistantAgent(
    name="HTML_Generator",
    system_message="""
    You are an expert HTML visualization generator. Your role is to create a clean, readable, and responsive HTML report based on a provided JSON object.

    Your task is to generate an HTML report with the following sections, in this specific order:
    1.  **Job Description**: Display the title, summary, and key responsibilities.
    2.  **Extracted Tasks**: List all tasks identified from the job description.
    3.  **AI Task Analysis**: For each task, show its name, its AI automation category (e.g., Fully Automated, Partially Automated/Hybrid), the percentage of AI involvement, time saved, and the explanation for the analysis.
    4.  **Overall Metrics**: Display summary metrics including average automation percentage, estimated time savings, and automation readiness.
    5.  **Future Skill Recommendations**: Detail the new skills required for the AI-enhanced role.
    6.  **Workforce Sustainability Plan**: Outline the strategy for maintaining a resilient and adaptable workforce amidst AI integration.
    7.  **New Opportunities**: Describe the new opportunities that arise from AI adoption in this role.

    RULES:
    - The final output MUST be a single HTML string.
    - Use modern HTML5 and self-contained CSS within a `<style>` tag. Do not use external stylesheets or JavaScript.
    - The design must be professional, clean, and easy to read. Use text formats, lists, and tables where appropriate.
    - Include visual elements like progress bars for automation percentages and color-coded categories (green for fully automated, yellow for partial, red for not automatable).
    - **Crucially, if any section's data is missing or the list is empty in the input JSON, DO NOT render that section in the HTML report.** For example, if `future_skill_recommendations` is an empty list, the "Future Skill Recommendations" section should be completely omitted from the output.
    - Under no circumstances should you include sections titled "Preserved Tasks", "Transformed Tasks", or "New Capabilities". Only include the sections explicitly listed above.
    - Do not include any explanations or text outside of the HTML content itself.
    """,
    llm_config=llm_config
)

# ============================================================================
# AGENT 6: STRATEGIC RECOMMENDATIONS AGENT
# ============================================================================
# Purpose: Generates strategic recommendations for AI transformation
# Input: Job description and automation analysis
# Output: Future skills, sustainability plan, and new opportunities
recommendation_agent = AssistantAgent(
    name="Recommendation_Agent",
    system_message="""
    You are an expert in generating strategic recommendations for AI transformation in IT roles. Your role is to provide actionable plans for future skills, workforce sustainability, and new opportunities.

    Your response MUST be a JSON object containing three keys: `future_skill_recommendations`, `sustainability_plan`, and `opportunities_identification`.

    - **`future_skill_recommendations`**: (List of objects) Detail the skills needed for the AI-enhanced role. Each object should have `skill_area`, `specific_skills`, and `relevance_to_ai_role`.
    - **`sustainability_plan`**: (List of objects) Based on the definition of workforce sustainability (maintaining a resilient, adaptable, and equitable workforce amid AI disruptions), provide initiatives. Each object should have `area`, `initiative`, and `impact_metric`.
    - **`opportunities_identification`**: (List of objects) Identify new business opportunities created by AI adoption. Each object should have `opportunity`, `description`, and `potential_value_proposition`.

    Example structure:
    ```json
    {
        "future_skill_recommendations": [
            {
                "skill_area": "Data Literacy and Analysis",
                "specific_skills": ["Understanding AI model outputs", "Data-driven decision making"],
                "relevance_to_ai_role": "Essential for interpreting AI insights and making informed decisions."
            }
        ],
        "sustainability_plan": [
            {
                "area": "Continuous Learning and Upskilling",
                "initiative": "Develop personalized learning paths for employees to acquire critical AI-related skills.",
                "impact_metric": "Increased employee retention by 25% and internal mobility opportunities."
            }
        ],
        "opportunities_identification": [
            {
                "opportunity": "Personalized Customer Experience at Scale",
                "description": "Leverage AI to analyze customer data and provide highly personalized recommendations.",
                "potential_value_proposition": "Increased customer retention by 15% and 20% revenue growth."
            }
        ]
    }
    ```
    """,
    llm_config=llm_config
)

# ============================================================================
# USER PROXY AGENT
# ============================================================================
# Purpose: Coordinates communication between agents and executes the workflow
# This agent manages the conversation flow between all specialist agents
user_proxy = UserProxyAgent(
    name="User_Proxy",
    system_message="Execute tasks and coordinate between agents.",
    human_input_mode="NEVER",  # No human intervention required during execution
    code_execution_config={"use_docker": False},  # Code execution disabled for security
    max_consecutive_auto_reply=3,  # Maximum number of automatic replies (reduced for efficiency)
    default_auto_reply="TERMINATE",  # Immediate termination after response
    llm_config=llm_config
)

# ============================================================================
# CORE WORKFLOW FUNCTIONS
# ============================================================================

def get_job_description(job_position: str) -> Dict:
    """
    STEP 1: Get job description from Agent 1 (Job Describer)

    Args:
        job_position: The IT job title entered by the user

    Returns:
        Dictionary containing structured job description
    """
    print(f"\n[INFO] Getting job description for: {job_position}")
    user_proxy.initiate_chat(agent_job_describer, message=job_position, silent=True)
    last_message = agent_job_describer.last_message()["content"]
    return parse_json_safely(last_message)


def extract_tasks(job_description: Dict) -> List[Dict]:
    """
    STEP 2: Extract tasks from job description using Agent 2 (Task Extractor)

    Args:
        job_description: Job description from Agent 1

    Returns:
        List of task dictionaries
    """
    print(f"\n[INFO] Extracting tasks from job description")
    prompt = f"Extract all tasks from this job description:\n{json.dumps(job_description, indent=2)}"
    user_proxy.initiate_chat(agent_task_extractor, message=prompt, silent=True)
    last_message = agent_task_extractor.last_message()["content"]
    return parse_json_safely(last_message)


def verify_and_validate(job_description: Dict, extracted_tasks: List[Dict]) -> Dict:
    """
    STEP 3: Verify and validate data using Agent 3 (Verification Agent)

    This critical step ensures data quality before proceeding to AI impact analysis.
    The verifier checks for:
    - Accuracy and completeness
    - Consistency between job description and tasks
    - Relevance to IT industry standards
    - Missing or incorrect information

    Args:
        job_description: Job description from Agent 1
        extracted_tasks: Tasks from Agent 2

    Returns:
        Dictionary with verification status and validated data
    """
    print(f"\n[INFO] Verifying and validating data")
    prompt = f"""
    Please verify and validate the following job analysis data:

    Job Description:
    {json.dumps(job_description, indent=2)}

    Extracted Tasks:
    {json.dumps(extracted_tasks, indent=2)}

    Review this data carefully and provide your verification results with any necessary corrections.
    """
    user_proxy.initiate_chat(agent_verifier, message=prompt, silent=True)
    last_message = agent_verifier.last_message()["content"]
    verification_result = parse_json_safely(last_message)

    # Log verification results
    if verification_result.get("verification_status") == "MODIFIED":
        print(f"[INFO] Verification Agent made corrections: {verification_result.get('corrections_made')}")
    else:
        print(f"[INFO] Verification Agent approved the data without modifications")

    return verification_result


def categorize_tasks_by_automation(extracted_tasks: List[Dict]) -> Dict:
    """
    STEP 4: Analyze AI impact and automation potential using Agent 4 (AI Impact Analyzer)

    This agent determines:
    - Automation category for each task
    - AI involvement percentage
    - Time savings estimate
    - Relevant AI technologies
    - Overall automation metrics

    Args:
        extracted_tasks: Validated tasks from Agent 3

    Returns:
        Dictionary with automation analysis and metrics
    """
    print(f"\n[INFO] Categorizing tasks by automation potential")
    prompt = f"""
    Analyze the following tasks and determine their AI automation potential, including time savings and AI technologies:

    {json.dumps(extracted_tasks, indent=2)}
    """
    user_proxy.initiate_chat(agent_task_automation_categorizer, message=prompt, silent=True)
    last_message = agent_task_automation_categorizer.last_message()["content"]
    return parse_json_safely(last_message)


def generate_ai_transition_recommendations(job_description: Dict, automation_analysis: list) -> Dict:
    """
    STEP 5: Generate strategic recommendations using Agent 6 (Recommendations Agent)

    Creates actionable plans for:
    - Future skill development
    - Workforce sustainability
    - New business opportunities

    Args:
        job_description: Validated job description
        automation_analysis: Analysis from Agent 4

    Returns:
        Dictionary with recommendations
    """
    print(f"\n[INFO] Generating AI transition recommendations")
    prompt = f"""
    Generate recommendations for the AI transformation of a '{job_description.get('job_title', 'N/A')}' role.

    Here is the analysis of tasks and their automation potential:
    {json.dumps(automation_analysis, indent=2)}

    Based on this, provide recommendations for future skills, a workforce sustainability plan, and new opportunities.
    """
    user_proxy.initiate_chat(recommendation_agent, message=prompt, silent=True)
    last_message = recommendation_agent.last_message()["content"]
    return parse_json_safely(last_message)


def generate_html_report(analysis_results: Dict) -> str:
    """
    STEP 6: Generate HTML report using Agent 5 (HTML Generator)

    Creates a comprehensive, visually appealing report with all analysis results.

    Args:
        analysis_results: Complete analysis data

    Returns:
        HTML string for the report
    """
    print(f"\n[INFO] Generating HTML report for: {analysis_results.get('job_position')}")
    # Filter out empty values
    report_data = {key: value for key, value in analysis_results.items() if value}

    prompt = f"Generate a comprehensive HTML report based on the following data:\n{json.dumps(report_data, indent=2, default=str)}"
    user_proxy.initiate_chat(html_generator, message=prompt, silent=True)
    html_content = html_generator.last_message()["content"]

    # Extract HTML from markdown code blocks if present
    if "```html" in html_content:
        html_content = html_content.split("```html")[1].split("```")[0]

    print(f"\n[INFO] Successfully generated HTML report.")
    return html_content.strip()


def analyze_job_for_ai_transformation(job_position: str) -> Dict:
    """
    MAIN ORCHESTRATION FUNCTION

    Executes the complete multi-agent workflow:
    1. Job Description Generation (Agent 1)
    2. Task Extraction (Agent 2)
    3. Verification & Validation (Agent 3)
    4. AI Impact Analysis (Agent 4)
    5. Strategic Recommendations (Agent 6)
    6. HTML Report Generation (Agent 5)

    Args:
        job_position: IT job title from user

    Returns:
        Complete analysis results with all agent outputs
    """
    print(f"\n[INFO] Starting AI transformation analysis for: {job_position}")

    # STEP 1: Get job description
    job_description = get_job_description(job_position)
    print(f"[DEBUG] Job Description: {json.dumps(job_description)[:500]}...")

    # STEP 2: Extract tasks
    extracted_tasks = extract_tasks(job_description)
    print(f"[DEBUG] Extracted Tasks: {json.dumps(extracted_tasks)[:500]}...")

    # STEP 3: Verify and validate (NEW AGENT)
    verification_result = verify_and_validate(job_description, extracted_tasks)

    # Use validated data from the verifier
    validated_job_description = verification_result.get("validated_job_description", job_description)
    validated_tasks = verification_result.get("validated_tasks", extracted_tasks)

    # STEP 4: Analyze automation potential
    automation_categorization = categorize_tasks_by_automation(validated_tasks)
    automation_analysis = automation_categorization.get("automation_analysis", [])
    overall_metrics = automation_categorization.get("overall_metrics", {})
    print(f"[DEBUG] Automation Categorization: {json.dumps(automation_categorization)[:500]}...")

    # Build task analysis summary for the report
    task_analysis_summary = []
    if isinstance(automation_analysis, list):
        for i, task_info in enumerate(automation_analysis):
            original_task = validated_tasks[i] if i < len(validated_tasks) else {}
            task_analysis_summary.append({
                "task_name": original_task.get('task_name', 'N/A'),
                "ai_involvement_percentage": task_info.get('ai_involvement_percentage', 'N/A'),
                "time_saved_percentage": task_info.get('time_saved_percentage', 'N/A'),
                "automation_category": task_info.get('automation_category', 'N/A').replace('_', ' ').title(),
                "ai_technologies": task_info.get('ai_technologies', []),
                "explanation": task_info.get('explanation', '')
            })

    # STEP 5: Generate recommendations
    recommendations = generate_ai_transition_recommendations(validated_job_description, automation_analysis)
    print(f"[DEBUG] Recommendations: {json.dumps(recommendations)[:500]}...")

    # Prepare complete report payload
    report_payload = {
        "job_position": job_position,
        "job_description": validated_job_description,
        "extracted_tasks": validated_tasks,
        "task_analysis_summary": task_analysis_summary,
        "overall_metrics": overall_metrics,
        "verification_info": {
            "status": verification_result.get("verification_status"),
            "corrections": verification_result.get("corrections_made", [])
        },
        "future_skill_recommendations": recommendations.get("future_skill_recommendations", []),
        "sustainability_plan": recommendations.get("sustainability_plan", []),
        "opportunities_identification": recommendations.get("opportunities_identification", []),
    }

    # STEP 6: Generate HTML report
    html_report = generate_html_report(report_payload)

    # Return complete results
    return {
        "job_position": job_position,
        "job_description": validated_job_description,
        "extracted_tasks": validated_tasks,
        "automation_categorization": automation_categorization,
        "overall_metrics": overall_metrics,
        "verification_info": {
            "status": verification_result.get("verification_status"),
            "corrections": verification_result.get("corrections_made", [])
        },
        "future_skill_recommendations": recommendations.get("future_skill_recommendations", []),
        "sustainability_plan": recommendations.get("sustainability_plan", []),
        "opportunities_identification": recommendations.get("opportunities_identification", []),
        "html_report": html_report,
        "status": "success"
    }


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def validate_job_position(position: str) -> Tuple[bool, str]:
    """
    Validates user input for job position

    Checks:
    - Not empty
    - Minimum 3 characters
    - Maximum 100 characters
    - No invalid special characters
    - Not numeric only
    - No URLs

    Args:
        position: Job position string from user

    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    position = position.strip()
    if not position:
        return False, "Job position cannot be empty"
    if len(position) < 3:
        return False, "Job position must be at least 3 characters long"
    if len(position) > 100:
        return False, "Job position cannot exceed 100 characters"
    if any(char in '!@#$%^&*()+=[]{}|\\:;"<>?/' for char in position):
        return False, "Job position contains invalid special characters"
    if position.replace(" ", "").isnumeric():
        return False, "Job position cannot be numeric only"
    if any(pattern in position.lower() for pattern in ['www.', 'http', '.com', '.net', '.org']):
        return False, "Job position cannot contain URLs"
    return True, ""


def get_valid_job_position() -> str:
    """
    Prompts user for job position with validation (for CLI mode)

    Allows up to 3 attempts to enter a valid job position.

    Returns:
        Valid job position string

    Raises:
        ValueError: If maximum attempts exceeded
    """
    max_attempts = 3
    for i in range(max_attempts):
        position = input("\nEnter the job position to analyze: ").strip()
        is_valid, error_message = validate_job_position(position)
        if is_valid:
            return position
        print(f"\n[ERROR] {error_message}")
        if i < max_attempts - 1:
            print(f"Please try again. {max_attempts - 1 - i} attempts remaining.")
    raise ValueError("Maximum number of invalid input attempts reached.")


def parse_json_safely(json_str: str):
    """
    Safely parse JSON from LLM responses with multiple fallback strategies

    LLMs sometimes return JSON in markdown code blocks or with formatting issues.
    This function attempts multiple parsing strategies:
    1. Direct JSON parsing
    2. Extract from markdown code blocks
    3. Use json_repair library
    4. Use dirtyjson library for malformed JSON

    Args:
        json_str: String potentially containing JSON

    Returns:
        Parsed Python object (dict or list) or empty dict if all parsing fails
    """
    # If already a Python object, return as-is
    if not isinstance(json_str, str):
        return json_str

    # Print debug info
    print(f"[DEBUG] Attempting to parse: {json_str[:200]}..." if len(json_str) > 200 else f"[DEBUG] Attempting to parse: {json_str}")

    try:
        # Strategy 1: Try to extract JSON from markdown code blocks
        match = re.search(r'```(?:json)?\s*(\{.*\}|\[.*\])\s*```', json_str, re.DOTALL)
        if match:
            json_str = match.group(1)

        # Try to find JSON object or array in the text
        json_match = re.search(r'(\{.*\}|\[.*\])', json_str, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)

        # Direct parsing
        result = json.loads(json_str)
        print(f"[DEBUG] Successfully parsed JSON")
        return result
    except json.JSONDecodeError as e:
        print(f"[DEBUG] JSON decode failed: {e}")
        try:
            # Strategy 2: Use json_repair for common JSON errors
            result = json.loads(repair_json(json_str))
            print(f"[DEBUG] Successfully repaired and parsed JSON")
            return result
        except (json.JSONDecodeError, ValueError) as e:
            print(f"[DEBUG] JSON repair failed: {e}")
            try:
                # Strategy 3: Use dirtyjson for very malformed JSON
                result = dirtyjson.loads(json_str)
                print(f"[DEBUG] Successfully parsed with dirtyjson")
                return result
            except Exception as e:
                print(f"[ERROR] Final attempt to parse JSON failed: {e}")
                print(f"[ERROR] Raw content was: {json_str}")
                return {}


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--api":
        # API SERVER MODE: Run FastAPI server for frontend integration
        print("\nStarting AI Job Transformation API Server")
        print("=" * 50)
        print("Server running on: http://localhost:8000")
        print("API Documentation: http://localhost:8000/docs")
        print("=" * 50)
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        # CLI MODE: Interactive command-line interface
        print("\nAI Impact Analysis Tool")
        print("=" * 50)
        print("This tool analyzes IT job positions and their AI transformation potential.")
        print("=" * 50)
        try:
            # Get job position from user
            position = get_valid_job_position()
            print(f"\n[INFO] Analyzing position: {position}")

            # Run full analysis pipeline
            transformation_results = analyze_job_for_ai_transformation(position)

            # Check for errors
            if transformation_results.get("status") == "error":
                print(f"\n[ERROR] Analysis failed: {transformation_results.get('message')}")
                exit(1)

            # Save HTML report to file
            if transformation_results.get("html_report"):
                report_filename = f"AI_Impact_Report_{position.replace(' ', '_')}.html"
                with open(report_filename, "w", encoding="utf-8") as f:
                    f.write(transformation_results["html_report"])
                print(f"\n[SUCCESS] HTML report saved to: {report_filename}")

            # Display summary in console
            print("\n" + "=" * 50)
            print("--- ANALYSIS SUMMARY ---")
            print("=" * 50)
            print(f"\nJob Position: {transformation_results['job_position']}")

            if transformation_results.get('job_description'):
                print("\nJob Description Summary:")
                print(json.dumps(transformation_results['job_description'].get('Description', 'N/A'), indent=2))

            if transformation_results.get('verification_info'):
                print("\nVerification Status:")
                print(f"Status: {transformation_results['verification_info'].get('status')}")
                if transformation_results['verification_info'].get('corrections'):
                    print("Corrections Made:")
                    for correction in transformation_results['verification_info']['corrections']:
                        print(f"  - {correction}")

            if transformation_results.get('overall_metrics'):
                print("\nOverall Automation Metrics:")
                print(json.dumps(transformation_results['overall_metrics'], indent=2))

            if transformation_results.get('future_skill_recommendations'):
                print("\nFuture Skill Recommendations:")
                print(json.dumps(transformation_results['future_skill_recommendations'], indent=2))

            if transformation_results.get('opportunities_identification'):
                print("\nNew Opportunities:")
                print(json.dumps(transformation_results['opportunities_identification'], indent=2))

        except ValueError as e:
            print(f"\n[ERROR] {str(e)}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"\n[ERROR] An unexpected error occurred: {str(e)}")
        finally:
            print("\n" + "=" * 50)
            print("Analysis complete!")
            print("=" * 50)





