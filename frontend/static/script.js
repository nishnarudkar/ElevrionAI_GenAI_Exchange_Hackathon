document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    const resumeInput = document.getElementById('resume-input');
    const uploadArea = document.getElementById('upload-area');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const skillInput = document.getElementById('skill-input');
    const addSkillBtn = document.getElementById('add-skill');
    const extractSkillsBtn = document.getElementById('extract-skills');
    const readinessResults = document.getElementById('readiness-results');
    const readinessAssessment = document.getElementById('readiness-assessment');
    const selectedRoleName = document.getElementById('selected-role-name');
    const skillsList = document.getElementById('skills-list');
    const jobRole = document.getElementById('job-role');
    const generateRoadmapBtn = document.getElementById('generate-roadmap');

    // Initialize tooltips
    tippy('[data-tooltip]', { content: (reference) => reference.getAttribute('data-tooltip') });

    // Drag and drop functionality
    uploadArea.addEventListener('click', () => resumeInput.click());
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') uploadArea.classList.add('dragover');
            if (eventName === 'dragleave' || eventName === 'drop') uploadArea.classList.remove('dragover');
            if (eventName === 'drop' && e.dataTransfer.files.length > 0) {
                resumeInput.files = e.dataTransfer.files;
                handleFileUpload(resumeInput.files[0]);
            }
        });
    });

    // Handle resume upload
    resumeInput.addEventListener('change', () => handleFileUpload(resumeInput.files[0]));

    async function handleFileUpload(file) {
        if (!file) return;
        fileName.textContent = file.name;
        fileInfo.style.display = 'flex';
        const formData = new FormData();
        formData.append('resume', file);
        try {
            const response = await fetch('/upload-resume', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                resumeInput.dataset.sessionId = data.session_id;
                fileName.textContent = `✅ ${file.name}`;
                fileName.style.color = '#48bb78';
                showMessage('Resume uploaded successfully!', 'success');
            } else {
                fileName.textContent = `❌ ${file.name}`;
                fileName.style.color = '#f56565';
                showMessage(data.error || 'Upload failed', 'warning');
            }
        } catch (error) {
            fileName.textContent = `❌ Error uploading ${file.name}`;
        }
    }

    // Handle skill addition
    function addSkill(skillText) {
        if (!skillText.trim()) return;
        const existingSkills = new Set(Array.from(skillsList.querySelectorAll('span')).map(s => s.textContent.toLowerCase()));
        skillText.split(/\s+/).filter(Boolean).forEach(skill => {
            if (!existingSkills.has(skill.toLowerCase())) {
                const li = document.createElement('li');
                li.className = 'skill-tag';
                li.innerHTML = `<span>${skill}</span><button class="skill-remove">&times;</button>`;
                li.querySelector('.skill-remove').onclick = () => li.remove();
                skillsList.appendChild(li);
                existingSkills.add(skill.toLowerCase());
            }
        });
    }

    // Show temporary messages
    function showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.textContent = text;
        message.className = `toast-message toast-${type}`;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3500);
    }

    addSkillBtn.addEventListener('click', () => { addSkill(skillInput.value); skillInput.value = ''; });
    skillInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput.value); skillInput.value = ''; } });

    // Handle skill extraction
    extractSkillsBtn.addEventListener('click', async () => {
        if (!resumeInput.dataset.sessionId) return showMessage('Please upload a resume first.', 'warning');
        try {
            const response = await fetch('/extract-skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: resumeInput.dataset.sessionId })
            });
            const data = await response.json();
            if (data.success) {
                skillsList.innerHTML = '';
                data.skills.forEach(skill => addSkill(skill));
                showMessage(`Extracted ${data.skills.length} skills!`, 'success');
            } else {
                showMessage(data.error || 'Failed to extract skills', 'warning');
            }
        } catch (error) {
            showMessage('Error extracting skills.', 'warning');
        }
    });

    // ===================================================================
    // NEW FUNCTION TO DISPLAY THE ASSESSMENT RESULTS
    // ===================================================================
    function displayReadinessResults(assessmentData) {
        const assessment = assessmentData.role_assessment;
        if (!assessment) {
            readinessAssessment.innerHTML = `<p>Could not parse assessment results.</p>`;
            return;
        }

        const scoreClass = assessment.readiness_score > 60 ? 'high' : assessment.readiness_score > 30 ? 'medium' : 'low';

        let html = `
            <div class="readiness-summary">
                <div class="readiness-score ${scoreClass}">
                    <span>${assessment.readiness_score}</span>
                    <small>/ 100</small>
                </div>
                <div class="readiness-label ${scoreClass}">${assessment.readiness_label}</div>
            </div>
        `;

        if (assessment.missing_skills && assessment.missing_skills.length > 0) {
            html += `<h4>Missing Skills</h4><div class="missing-skills-list">`;
            assessment.missing_skills.forEach(skill => {
                html += `<span class="skill-tag missing importance-${skill.importance}">${skill.skill}</span>`;
            });
            html += `</div>`;
        }

        if (assessment.quick_win_recommendations && assessment.quick_win_recommendations.length > 0) {
            html += `<h4>Quick Win Recommendations</h4><ul class="recommendations-list">`;
            assessment.quick_win_recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += `</ul>`;
        }
        
        readinessAssessment.innerHTML = html;
    }

    // assessTargetRoleReadiness function calls the new display function
    async function assessTargetRoleReadiness(targetRole) {
        const sessionId = resumeInput.dataset.sessionId;
        if (!sessionId) return showMessage('Please upload a resume first.', 'warning');
        readinessAssessment.innerHTML = `<div class="loading">🔄 Assessing readiness...</div>`;

        try {
            const response = await fetch('/assess-target-role-readiness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, target_role: targetRole })
            });
            const data = await response.json();
            
            if (data.success && data.assessment) {
                displayReadinessResults(data.assessment); // <-- Calls the new display function
                showMessage('Assessment complete!', 'success');
                generateRoadmapBtn.disabled = false;
            } else {
                readinessAssessment.innerHTML = `<p>Error: ${data.error || 'Failed to assess readiness'}</p>`;
            }
        } catch (error) {
            readinessAssessment.innerHTML = `<p>An error occurred. Please try again.</p>`;
        }
    }

    // Job role selection listener
    jobRole.addEventListener('change', async () => {
        const selectedRole = jobRole.value;
        if (selectedRole) {
            selectedRoleName.textContent = selectedRole.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            readinessResults.style.display = 'block';
            if (skillsList.children.length > 0) {
                await assessTargetRoleReadiness(selectedRole);
            } else {
                showMessage('Please add skills or upload a resume first.', 'warning');
                readinessResults.style.display = 'none';
            }
        } else {
            readinessResults.style.display = 'none';
        }
    });
    
    // Placeholder for roadmap generation
    generateRoadmapBtn.addEventListener('click', () => {
        showMessage('Roadmap generation would happen here!', 'info');
    });
});