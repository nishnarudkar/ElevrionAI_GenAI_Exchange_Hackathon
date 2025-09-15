import os
import json
import time
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI # <-- CHANGE 1: Import Gemini
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# --- CHANGE 2: Load .env from the project root ---
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(project_root, '.env'))
# ----------------------------------------------------

# Performance monitoring class remains the same
class PerformanceProfiler:
    def __init__(self):
        self.timings = {}
        self.cache = {}
        self.cache_hits = 0
        self.cache_misses = 0
    # ... (rest of the class is unchanged) ...
    def start_timer(self, step_name: str):
        self.timings[step_name] = {'start': time.time()}
        
    def end_timer(self, step_name: str):
        if step_name in self.timings:
            self.timings[step_name]['end'] = time.time()
            self.timings[step_name]['duration'] = self.timings[step_name]['end'] - self.timings[step_name]['start']
            
    def get_performance_report(self) -> dict:
        report = {
            'step_timings': {},
            'total_time': 0,
            'cache_stats': {
                'hits': self.cache_hits,
                'misses': self.cache_misses,
                'hit_ratio': self.cache_hits / (self.cache_hits + self.cache_misses) if (self.cache_hits + self.cache_misses) > 0 else 0
            }
        }
        
        total_time = 0
        for step, timing in self.timings.items():
            if 'duration' in timing:
                report['step_timings'][step] = round(timing['duration'], 3)
                total_time += timing['duration']
                
        report['total_time'] = round(total_time, 3)
        return report

profiler = PerformanceProfiler()

# --- CHANGE 3: Updated data loading logic ---
def load_data_files():
    """Load job roles and courses data from the project's data folder."""
    data_dir = os.path.join(project_root, "data")
    job_roles_path = os.path.join(data_dir, "job_roles.json")
    courses_path = os.path.join(data_dir, "courses.json")

    if os.path.exists(job_roles_path) and os.path.exists(courses_path):
        with open(job_roles_path, "r", encoding='utf-8') as f:
            job_roles = json.load(f)
        with open(courses_path, "r", encoding='utf-8') as f:
            courses = json.load(f)
        print(f"✅ Loaded curated data files from {data_dir}")
        return (job_roles, courses)
    else:
        print(f"⚠️  Curated data files not found in {data_dir}. Using AI-only mode.")
        return {}, {}
# -------------------------------------------

JOB_ROLES_DATA, COURSES_DATA = load_data_files()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")
# ---------------------------------------

PERFORMANCE_CONFIG = {
    'max_gaps_to_process': 8,
    'max_courses_per_skill': 6,
    'max_generation_time': 30.0,
    'llm_timeout': 30.0,
}

class MyState(TypedDict, total=False):
    input: str
    target_role: str
    extracted_skills: list[str]
    missing_skills: list[str]
    nice_to_have: list[str]
    roadmap: list[dict]
    time_estimates: dict
    performance_data: dict

def agent1_skill_extractor(state):
    """Extract skills using Gemini."""
   
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-latest",
        google_api_key=GEMINI_API_KEY, # Add this line
        temperature=0,
        convert_system_message_to_human=True
    )
    # ---------------------------------------------
    
    prompt = f"""Extract technical skills from this resume text. Return a JSON object with a single key "extracted_skills" containing a list of lowercase strings.
    
    USER INPUT: {state.get('input', '')}"""
    
    message = HumanMessage(content=prompt)
    response = llm.invoke([message])
    
    try:
        content = response.content
        # Gemini sometimes wraps the JSON in markdown
        if content.startswith('```json'):
            content = content[7:-4]
        
        result = json.loads(content)
        state['extracted_skills'] = result.get('extracted_skills', [])
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Agent1 JSON parsing error: {e}")
        state['extracted_skills'] = []
    
    return state

def agent2_gap_analyzer(state):
    """Analyze skill gaps using Gemini."""
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-latest",
        google_api_key=GEMINI_API_KEY, 
        temperature=0,
        convert_system_message_to_human=True
    )
    # ---------------------------------------------

    user_skills = state.get('extracted_skills', [])
    target_role = state.get('target_role', '')
    required_skills = JOB_ROLES_DATA.get(target_role, [])
    
    prompt = f"""Compare user skills with the required skills for the target role '{target_role}'.
    Required skills: {required_skills}
    User skills: {user_skills}
    
    Return a JSON object with two keys: "missing_skills" (skills from required list that user doesn't have) and "nice_to_have" (other relevant skills to learn)."""
    
    message = HumanMessage(content=prompt)
    response = llm.invoke([message])
    
    try:
        content = response.content
        if content.startswith('```json'):
            content = content[7:-4]
        
        result = json.loads(content)
        state['missing_skills'] = result.get('missing_skills', [])
        state['nice_to_have'] = result.get('nice_to_have', [])
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Agent2 JSON parsing error: {e}")
        state['missing_skills'] = []
        state['nice_to_have'] = []
        
    return state

def agent3_roadmap_mentor_optimized(state):
    """Generate roadmap using Gemini."""
    profiler.start_timer('roadmap_generation_total')
    
    missing_skills = state.get('missing_skills', [])
    nice_to_have = state.get('nice_to_have', [])
    
  
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-latest",
        google_api_key=GEMINI_API_KEY, # Add this line
        temperature=0,
        convert_system_message_to_human=True
    )
    # ---------------------------------------------
    
    prompt = f"""Create a 3-phase JSON learning roadmap for a person wanting to learn these skills:
    Missing Skills (High Priority): {missing_skills}
    Nice-to-have Skills (Lower Priority): {nice_to_have}
    
    The JSON output must follow this structure: {{"roadmap": [{{"phase": "Phase 1: Foundation", "skills": [{{"skill": "Python", "course": "Python for Everybody - Coursera", "reason": "Good for beginners", "est_hours": 15}}]}}]}}"""

    message = HumanMessage(content=prompt)
    response = llm.invoke([message])
    
    try:
        content = response.content
        if content.startswith('```json'):
            content = content[7:-4]
        
        roadmap_result = json.loads(content)
        state['roadmap'] = roadmap_result.get('roadmap', [])
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Agent3 JSON parsing error: {e}")
        state['roadmap'] = []
        
    profiler.end_timer('roadmap_generation_total')
    state['performance_data'] = profiler.get_performance_report()
    
    return state

# The rest of the functions (run_pipeline_optimized, extract_skills_only, etc.) remain the same.
# They will now use the updated agents with Gemini.
def run_pipeline_optimized(input_text: str, target_role: str, log_execution: bool = False) -> dict:
    global profiler
    profiler = PerformanceProfiler()
    profiler.start_timer('pipeline_total')
    
    workflow = StateGraph(MyState)
    workflow.add_node("agent1", agent1_skill_extractor)
    workflow.add_node("agent2", agent2_gap_analyzer)
    workflow.add_node("agent3", agent3_roadmap_mentor_optimized)
    workflow.set_entry_point("agent1")
    workflow.add_edge("agent1", "agent2")
    workflow.add_edge("agent2", "agent3")
    workflow.add_edge("agent3", END)
    
    app = workflow.compile()
    
    initial_state = MyState({'input': input_text, 'target_role': target_role})
    result = app.invoke(initial_state)
    
    profiler.end_timer('pipeline_total')
    result['performance_summary'] = profiler.get_performance_report()
    
    return result

def extract_skills_only(input_text: str) -> dict:
    global profiler
    profiler = PerformanceProfiler()
    profiler.start_timer('skill_extraction_only')
    
    state = {'input': input_text}
    result_state = agent1_skill_extractor(state)
    
    profiler.end_timer('skill_extraction_only')
    performance_data = profiler.get_performance_report()
    
    return {
        'extracted_skills': result_state.get('extracted_skills', []),
        'performance_summary': performance_data
    }