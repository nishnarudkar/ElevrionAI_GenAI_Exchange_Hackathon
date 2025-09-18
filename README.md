# ElevrionAI

An intelligent web application to help users identify their career readiness for various technology roles. The system analyzes your resume or manually entered skills, assesses your fit for a selected target role, and generates a personalized, phased learning roadmap to address skill gaps.

---

## 🚀 Features

- **Resume-Based Skill Extraction:** Upload your PDF or DOCX resume and let the app extract technical skills automatically.
- **Manual Skill Input:** No resume? Enter your skills directly.
- **Role Readiness Assessment:** Compare your skills to requirements for tech roles (e.g., Data Scientist, ML Engineer, Full Stack Developer). Get a readiness score and a clear label: "Ready", "Workable", or "Needs Foundation".
- **Personalized Learning Roadmap:** Receive a three-phase, structured learning plan to close your skill gaps.
- **Quick-Win Recommendations:** Get prioritized, actionable course recommendations (with IDs and estimated times) for your most critical missing skills.
- **Performance Monitoring:** Backend includes profiling to monitor and report the execution time of core pipeline steps, like skill extraction and roadmap generation.

---

## 🛠️ Tech Stack

### Frontend

- HTML, CSS (including Tailwind CSS)
- JavaScript
- Modern UI components & animations (tippy.js, Chart.js, CSS keyframes)
- Features: File uploads, skill management, assessment display, and roadmap visualization

### Backend

- **Language:** Python
- **Frameworks:** Flask, FastAPI
- **Libraries:**
  - `PyPDF2`, `python-docx` (resume parsing)
  - `langgraph`, `langchain-google-genai` (AI pipeline)
  - `python-dotenv` (environment variables)
- **AI Agents:**
  - `career_pathfinder_optimized.py`: Main pipeline for extraction, gap analysis, and roadmap generation (using Gemini API)
  - `role_readiness_agent.py`: Robust agent using pre-defined role and course catalogs
- **Data:**
  - `job_roles.json`: Skills catalog for tech roles
  - `courses.json`: Curated courses/micro-tasks for upskilling

---

## 🏃‍♂️ Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/nishnarudkar/ElevrionAI_GenAI_Exchange_Hackathon.git
cd ElevrionAI_GenAI_Exchange_Hackathon
```

### 2. Set Up the Environment

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure API Key

- Create a `.env` file in the `backend` directory.
- Add your Google Gemini API key:

```
GEMINI_API_KEY="YOUR_API_KEY"
```

### 4. Run the Backend

```bash
python backend/app.py
```

### 5. Access the Application

- Open your browser and visit: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🌱 Project Roadmap & Future Enhancements

- **Advanced AI Agents:** More sophisticated skill extraction and career path generation
- **Enhanced UX:** Dynamic, interactive visualizations
- **Broader Catalogs:** Expand `job_roles.json` and `courses.json` to cover more roles and resources
- **User Accounts:** Progress tracking and personal roadmap saving
- **Real-Time Feedback:** Faster, real-time assessments

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 🙌 Acknowledgements

- Gemini API by Google
- LangChain & LangGraph
- Open-source course and job role data sources

---
