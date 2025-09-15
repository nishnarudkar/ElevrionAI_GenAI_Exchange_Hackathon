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
    const industryEvaluation = document.getElementById('industry-evaluation');
    const industryAssessment = document.getElementById('industry-assessment');
    const skillsList = document.getElementById('skills-list');
    const jobRole = document.getElementById('job-role');
    const generateRoadmapBtn = document.getElementById('generate-roadmap');
    const loading = document.getElementById('loading');
    const roadmapContainer = document.getElementById('roadmap-container');
    const roadmapList = document.getElementById('roadmap-list');
    const resourcesContainer = document.getElementById('resources-container');
    const resources = document.getElementById('resources');
    
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        tippy(tooltip, {
            content: tooltip.getAttribute('data-tooltip'),
            placement: 'top',
            animation: 'scale',
        });
    });

    // Enhanced drag and drop functionality
    uploadArea.addEventListener('click', () => resumeInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            resumeInput.files = files;
            handleFileUpload(files[0]);
        }
    });

    // Handle resume upload
    resumeInput.addEventListener('change', async () => {
        const file = resumeInput.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    async function handleFileUpload(file) {
        fileName.textContent = file.name;
        fileInfo.style.display = 'flex';

        const formData = new FormData();
        formData.append('resume', file);

        try {
            const response = await fetch('/upload-resume', {
                method: 'POST',
                body: formData
            });
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
            fileName.style.color = '#f56565';
        }
    }

    // Handle skill addition
    function addSkill(skillText) {
        if (!skillText.trim()) return;
        const skills = skillText.split(/\s+/).filter(skill => skill.trim());
        const existingSkills = Array.from(skillsList.children).map(li => li.querySelector('span').textContent.toLowerCase());
        
        skills.forEach(skill => {
            const cleanSkill = skill.trim();
            if (!cleanSkill || existingSkills.includes(cleanSkill.toLowerCase())) return;
            
            const li = document.createElement('li');
            li.className = 'skill-tag';
            li.innerHTML = `<span>${cleanSkill}</span><button class="skill-remove" onclick="removeSkill(this)">×</button>`;
            skillsList.appendChild(li);
            existingSkills.push(cleanSkill.toLowerCase());
        });
    }
    
    // Remove skill
    window.removeSkill = function(button) {
        button.parentElement.remove();
    }

    // Show temporary messages
    function showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.textContent = text;
        message.className = `toast-message toast-${type}`;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    }

    addSkillBtn.addEventListener('click', () => {
        addSkill(skillInput.value);
        skillInput.value = '';
    });

    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSkill(skillInput.value);
            skillInput.value = '';
        }
    });

    // Handle skill extraction
    extractSkillsBtn.addEventListener('click', async () => {
        if (!resumeInput.dataset.sessionId) {
            return showMessage('Please upload a resume first.', 'warning');
        }

        try {
            const response = await fetch('/extract-skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: resumeInput.dataset.sessionId })
            });
            const data = await response.json();

            if (data.success) {
                skillsList.innerHTML = '';
                data.skills.forEach(addSkill);
                showMessage(`Extracted ${data.skills.length} skills!`, 'success');
            } else {
                showMessage(data.error || 'Failed to extract skills', 'warning');
            }
        } catch (error) {
            showMessage('Error extracting skills.', 'warning');
        }
    });

    // ===================================================================
    // NEW FUNCTION TO DISPLAY THE READINESS CHART
    // ===================================================================
    function displayReadinessChart(assessment) {
        readinessAssessment.innerHTML = '<canvas id="readiness-chart"></canvas>';
        const ctx = document.getElementById('readiness-chart');
        if (!ctx || !assessment || !assessment.breakdown) {
            readinessAssessment.innerHTML = `<p>Could not display assessment chart. Score: ${assessment.readiness_score || 'N/A'}</p>`;
            return;
        }

        const labels = assessment.breakdown.map(item => item.category);
        const dataPoints = assessment.breakdown.map(item => item.score);

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Your Profile Readiness',
                    data: dataPoints,
                    fill: true,
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgb(102, 126, 234)',
                    pointBackgroundColor: 'rgb(102, 126, 234)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(102, 126, 234)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: { backdropColor: 'transparent' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    // UPDATED assessTargetRoleReadiness to call the new chart function
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
                displayReadinessChart(data.assessment); // <-- THIS IS THE KEY CHANGE
                showMessage('Assessment complete!', 'success');
                generateRoadmapBtn.disabled = false;
            } else {
                readinessAssessment.innerHTML = `<p>Error: ${data.error || 'Failed to assess readiness'}</p>`;
                showMessage(data.error || 'Failed to assess readiness', 'warning');
            }
        } catch (error) {
            readinessAssessment.innerHTML = `<p>An error occurred. Please try again.</p>`;
            showMessage('Network error during assessment.', 'warning');
        }
    }

    // Job role selection listener
    jobRole.addEventListener('change', async () => {
        const selectedRole = jobRole.value;
        if (selectedRole) {
            selectedRoleName.textContent = selectedRole.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            readinessResults.style.display = 'block';
            
            const skillsCount = skillsList.children.length;
            if (skillsCount > 0) {
                await assessTargetRoleReadiness(selectedRole);
            } else {
                showMessage('Please add skills or upload a resume first.', 'warning');
                readinessResults.style.display = 'none';
            }
        } else {
            readinessResults.style.display = 'none';
        }
    });

    // Roadmap generation (remains the same)
    generateRoadmapBtn.addEventListener('click', async () => {
        const role = jobRole.value;
        const skills = Array.from(skillsList.children).map(li => li.querySelector('span').textContent);

        if (!role || skills.length === 0 || !resumeInput.dataset.sessionId) {
            return showMessage('Please select a role and add skills first.', 'warning');
        }

        loading.style.display = 'block';
        roadmapContainer.style.display = 'none';
        generateRoadmapBtn.disabled = true;

        try {
            const response = await fetch('/generate-roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills, role, session_id: resumeInput.dataset.sessionId })
            });
            const data = await response.json();
            if (data.success) {
                displayRoadmap(data);
            } else {
                showMessage(`Error: ${data.error}`, 'warning');
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'warning');
        } finally {
            loading.style.display = 'none';
            generateRoadmapBtn.disabled = false;
        }
    });

    function displayRoadmap(data) {
        // This function remains the same as your original, so it is omitted for brevity
        // but should be kept in your file.
        roadmapContainer.style.display = 'block';
        roadmapList.innerHTML = '...'; // Placeholder for your existing roadmap display logic
        console.log("Displaying roadmap:", data);
    }
});