from flask import Flask, request, jsonify, render_template
import os
from pathlib import Path
import PyPDF2
from docx import Document
from dotenv import load_dotenv
import sys
import time

# --- FIX 1: Add project root to Python path ---
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)
# ---------------------------------------------

from agents.career_pathfinder_optimized import run_pipeline_optimized, extract_skills_only
from agents.career_logger import CareerPathfinderLogger
from agents.role_readiness_agent import assess_role_readiness, assess_single_role_readiness

# Configure Flask app with correct paths
app = Flask(__name__,
            template_folder='../frontend/templates',
            static_folder='../frontend/static')

# Load environment variables
load_dotenv(os.path.join(project_root, '.env'))

# --- FIX 2: Check for the correct API key ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY must be set in the .env file")
# -------------------------------------------

# Initialize logger
logger = CareerPathfinderLogger()

# Ensure uploads directory exists
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def parse_course_info(course_string):
    """Parse course string to extract title, platform, and estimate duration"""
    if not course_string or course_string == 'N/A':
        return {
            'title': 'N/A',
            'platform': 'N/A',
            'duration': 'N/A',
            'url': ''
        }
    
    duration_map = {
        'coursera': '4-6 weeks', 'edx': '4-8 weeks', 'udemy': '10-15 hours',
        'youtube': '2-5 hours', 'freecodecamp': '5-10 hours', 'w3schools': '1-3 hours',
        'khan academy': '2-4 weeks', 'ibm skillsbuild': '3-5 hours', 'official documentation': '1-2 hours',
        'datacamp': '2-4 hours', 'official': '1-2 hours', 'microsoft learn': '2-4 hours',
        'google': '3-6 hours', 'free book': '2-3 weeks', 'tutorial': '1-3 hours'
    }
    
    title, platform, duration = course_string, 'Online', '2-4 hours'
    
    if ' - ' in course_string:
        parts = course_string.split(' - ', 1)
        title, platform_part = parts[0].strip(), parts[1].strip()
        platform = platform_part.split(' (')[0].strip() if ' (' in platform_part else platform_part
    
    for key, dur in duration_map.items():
        if key in platform.lower():
            duration = dur
            break
            
    course_lower = course_string.lower()
    if 'certification' in course_lower or 'certificate' in course_lower: duration = '6-8 weeks'
    elif 'bootcamp' in course_lower: duration = '12-24 weeks'
    elif 'crash course' in course_lower: duration = '1-2 days'
    elif 'full course' in course_lower: duration = '8-12 hours'
    elif 'tutorial' in course_lower: duration = '1-3 hours'
    
    return {'title': title, 'platform': platform, 'duration': duration, 'url': generate_course_url(title, platform)}

def generate_course_url(title, platform):
    """Generate course URLs based on platform and title"""
    return f'https://www.google.com/search?q="{title}"+"online+course"'


def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            return "".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_path):
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
        return ""

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/upload-resume', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not file.filename.lower().endswith(('.pdf', '.docx')):
        return jsonify({'success': False, 'error': 'Unsupported file type'}), 400

    file_path = os.path.join(UPLOADS_DIR, file.filename)
    file.save(file_path)

    resume_text = extract_text_from_pdf(file_path) if file.filename.lower().endswith('.pdf') else extract_text_from_docx(file_path)

    if not resume_text.strip():
        return jsonify({'success': False, 'error': 'Could not extract text from resume'}), 500

    session_id = f"session_{int(time.time())}"
    session_file = os.path.join(UPLOADS_DIR, f"{session_id}.txt")
    with open(session_file, 'w', encoding='utf-8') as f:
        f.write(resume_text)

    return jsonify({'success': True, 'session_id': session_id})


@app.route('/extract-skills', methods=['POST'])
def extract_skills():
    session_id = request.json.get('session_id') if request.is_json else None
    if not session_id:
        return jsonify({'success': False, 'error': 'No session ID provided'}), 400

    session_file = os.path.join(UPLOADS_DIR, f"{session_id}.txt")
    if not os.path.exists(session_file):
        return jsonify({'success': False, 'error': 'Session file not found'}), 404

    with open(session_file, 'r', encoding='utf-8') as f:
        resume_text = f.read()

    try:
        start_time = time.time()
        result = extract_skills_only(resume_text)
        execution_time = time.time() - start_time
        logger.log_execution(resume_text, "Skill Extraction", result, execution_time)
        return jsonify({'success': True, 'skills': result.get('extracted_skills', [])})
    except Exception as e:
        print(f"Skill extraction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/generate-roadmap', methods=['POST'])
def generate_roadmap():
    data = request.get_json()
    role = data.get('role', '')
    session_id = data.get('session_id', '')

    if not role or not session_id:
        return jsonify({'success': False, 'error': 'Role and session ID are required'}), 400

    session_file = os.path.join(UPLOADS_DIR, f"{session_id}.txt")
    if not os.path.exists(session_file):
        return jsonify({'success': False, 'error': 'Session file not found'}), 404

    with open(session_file, 'r', encoding='utf-8') as f:
        resume_text = f.read()
        
    try:
        result = run_pipeline_optimized(resume_text, role, log_execution=True)

        if not isinstance(result, dict):
            return jsonify({'success': False, 'error': f'Unexpected result type: {type(result)}'}), 500

        roadmap = []
        roadmap_data = result.get('roadmap', [])
        
        if isinstance(roadmap_data, list):
            for i, phase in enumerate(roadmap_data):
                if isinstance(phase, dict):
                    phase_data = {
                        'phase': phase.get('phase', f'Phase {i+1}'), 'skills': [],
                        'phase_total_hours': phase.get('phase_total_hours', 0),
                        'phase_time_frame': phase.get('phase_time_frame', 'N/A')
                    }
                    skills_data = phase.get('skills', phase.get('items', []))
                    for j, item in enumerate(skills_data):
                        if isinstance(item, dict):
                            course = item.get('course', 'N/A')
                            parsed_course = parse_course_info(course) if isinstance(course, str) else parse_course_info(course.get('title', 'N/A'))
                            phase_data['skills'].append({
                                'skill': item.get('skill', f'Skill {j+1}'), 'course': parsed_course,
                                'est_hours': item.get('est_hours', 10)
                            })
                    roadmap.append(phase_data)

        response = {
            'success': True, 'roadmap': roadmap,
            'resources': 'Personalized course recommendations based on your skill gaps and target role.',
            'time_estimates': result.get('time_estimates', {}),
            'performance': result.get('performance_summary', {})
        }
        return jsonify(response)
    except Exception as e:
        print(f"Roadmap generation error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/assess-target-role-readiness', methods=['POST'])
def assess_target_role_readiness():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON payload'}), 400

    session_id = data.get('session_id')
    target_role = data.get('target_role')

    if not all([session_id, target_role]):
        return jsonify({'success': False, 'error': 'session_id and target_role are required'}), 400

    session_file = os.path.join(UPLOADS_DIR, f"{session_id}.txt")
    if not os.path.exists(session_file):
        return jsonify({'success': False, 'error': 'Session file not found'}), 404

    with open(session_file, 'r', encoding='utf-8') as f:
        resume_text = f.read()

    try:
        start_time = time.time()
        assessment = assess_single_role_readiness(resume_text, target_role)
        execution_time = time.time() - start_time
        
        # --- THIS IS THE CORRECTED LINE ---
        # The first argument should be the input text, not a keyword argument.
        logger.log_execution(
            resume_text, # Changed from input_data=...
            "Single Role Readiness",
            assessment,
            execution_time
        )

        return jsonify({'success': True, 'assessment': assessment})

    except Exception as e:
        print(f"Role readiness assessment error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)