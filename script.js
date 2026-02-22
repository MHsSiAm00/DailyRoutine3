 // --- 1. Data Initialization ---
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let routines = JSON.parse(localStorage.getItem('smartRoutines')) || {
    "Saturday": [], "Sunday": [], "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": []
};

// Auto-detect today
const todayName = daysOfWeek[new Date().getDay()];
let currentViewDay = todayName; 
let isEditMode = false;
let currentEditingNoteIndex = null;

// --- 2. UI Elements ---
const targetDaySelect = document.getElementById('targetDay');
const dayTabsContainer = document.getElementById('dayTabs');
const scheduleContainer = document.getElementById('scheduleContainer');
const copyFromDaySelect = document.getElementById('copyFromDay');

// Edit Mode UI
const btnToggleEditMode = document.getElementById('btnToggleEditMode');
const editControls = document.getElementById('editControls');

// Modal UI
const noteModalOverlay = document.getElementById('noteModalOverlay');
const modalSubjectTitle = document.getElementById('modalSubjectTitle');
const subjectNoteInput = document.getElementById('subjectNoteInput');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnSaveNote = document.getElementById('btnSaveNote');

// --- 3. Initialization ---
window.onload = () => {
    // Handle Splash Screen Animation
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 600);
    }, 2000); // 2 seconds delay

    targetDaySelect.value = currentViewDay;
    renderTabs();
    renderSchedule();
    updateCopyDropdown();
    
    // Check for active subject every minute to update the glowing effect
    setInterval(renderSchedule, 60000); 
};

// --- 4. Toggle Edit/View Mode ---
btnToggleEditMode.addEventListener('click', () => {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        btnToggleEditMode.classList.add('editing');
        btnToggleEditMode.innerHTML = `<i class="fas fa-check"></i> Done`;
        editControls.style.display = 'block';
    } else {
        btnToggleEditMode.classList.remove('editing');
        btnToggleEditMode.innerHTML = `<i class="fas fa-pen"></i> Edit`;
        editControls.style.display = 'none';
    }
    
    // Re-render schedule to show/hide notes or trash cans based on mode
    renderSchedule();
});

// --- 5. Toggles (Make New vs Same As) ---
const btnToggleNew = document.getElementById('btnToggleNew');
const btnToggleCopy = document.getElementById('btnToggleCopy');
const sectionNew = document.getElementById('sectionNew');
const sectionCopy = document.getElementById('sectionCopy');

btnToggleNew.addEventListener('click', () => {
    btnToggleNew.classList.add('active');
    btnToggleCopy.classList.remove('active');
    sectionNew.style.display = 'block';
    sectionCopy.style.display = 'none';
});

btnToggleCopy.addEventListener('click', () => {
    btnToggleCopy.classList.add('active');
    btnToggleNew.classList.remove('active');
    sectionNew.style.display = 'none';
    sectionCopy.style.display = 'block';
    updateCopyDropdown();
});

// --- 6. Core Functions ---

// Add a new subject
document.getElementById('btnAddSubject').addEventListener('click', () => {
    const day = targetDaySelect.value;
    const time = document.getElementById('subTime').value;
    const subject = document.getElementById('subName').value;

    if (!time || !subject) return alert("Please fill in both time and subject!");

    // Added a 'note' property to keep track of dedicated notes
    routines[day].push({ time, subject, note: "" });
    routines[day].sort((a, b) => a.time.localeCompare(b.time));
    
    saveData();
    document.getElementById('subName').value = ''; 
    
    currentViewDay = day;
    renderTabs();
    renderSchedule();
});

// Copy routine ("Same As")
document.getElementById('btnCopyRoutine').addEventListener('click', () => {
    const targetDay = targetDaySelect.value;
    const sourceDay = copyFromDaySelect.value;

    if (!sourceDay) return alert("Please select a day to copy from.");
    if (targetDay === sourceDay) return alert("Cannot copy a day to itself!");
    if (!confirm(`Overwrite ${targetDay}'s routine with ${sourceDay}'s routine?`)) return;

    routines[targetDay] = JSON.parse(JSON.stringify(routines[sourceDay]));
    saveData();
    
    currentViewDay = targetDay;
    renderTabs();
    renderSchedule();
});

// Delete a subject (With Warning)
function deleteSubject(index) {
    const subjectName = routines[currentViewDay][index].subject;
    if(confirm(`Are you sure you want to remove "${subjectName}" from the routine?`)) {
        routines[currentViewDay].splice(index, 1);
        saveData();
        renderSchedule();
    }
}

function saveData() {
    localStorage.setItem('smartRoutines', JSON.stringify(routines));
    updateCopyDropdown();
}

// --- 7. Rendering Logic ---

function renderTabs() {
    dayTabsContainer.innerHTML = '';
    const displayOrder = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    displayOrder.forEach(day => {
        const chip = document.createElement('div');
        chip.className = `day-chip glass ${day === currentViewDay ? 'active' : ''}`;
        chip.innerText = day.substring(0, 3);
        
        chip.addEventListener('click', () => {
            currentViewDay = day;
            targetDaySelect.value = day; 
            renderTabs();
            renderSchedule();
        });
        
        dayTabsContainer.appendChild(chip);
    });
}

function renderSchedule() {
    scheduleContainer.innerHTML = '';
    const dayData = routines[currentViewDay];

    if (dayData.length === 0) {
        scheduleContainer.innerHTML = `<div class="glass" style="text-align:center; padding: 20px; border-radius: 15px; color:#4a5568;">No routine set for ${currentViewDay}.</div>`;
        return;
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const isToday = currentViewDay === daysOfWeek[now.getDay()];

    dayData.forEach((item, index) => {
        const timeParts = item.time.split(':');
        let h = parseInt(timeParts[0]);
        const m = timeParts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayTime = `${h % 12 || 12}:${m} ${ampm}`;

        let isActive = false;
        if (isToday) {
            const itemMins = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
            let nextMins = itemMins + 60; 
            
            if (index < dayData.length - 1) {
                const nextParts = dayData[index + 1].time.split(':');
                nextMins = parseInt(nextParts[0]) * 60 + parseInt(nextParts[1]);
            }
            
            if (currentMins >= itemMins && currentMins < nextMins) isActive = true;
        }

        // Determine icon based on mode
        let actionIconHTML = '';
        if (isEditMode) {
            actionIconHTML = `<button class="delete-btn" style="display:block;" onclick="deleteSubject(${index})"><i class="fas fa-trash"></i></button>`;
        } else {
            const hasNote = item.note && item.note.trim() !== "";
            actionIconHTML = `<button class="note-btn ${hasNote ? 'has-note' : ''}" onclick="openNoteModal(${index})"><i class="fas ${hasNote ? 'fa-clipboard' : 'fa-sticky-note'}"></i></button>`;
        }

        const cardHTML = `
            <div class="routine-card glass ${isActive ? 'active-now' : ''}" id="${isActive ? 'activeItem' : ''}">
                <div class="time-box">${displayTime}</div>
                <div class="subject-info">
                    <h4>${item.subject} ${isActive ? '<span style="color:#00b894; font-size:0.8rem;">(NOW)</span>' : ''}</h4>
                </div>
                <div class="card-actions">
                    ${actionIconHTML}
                </div>
            </div>
        `;
        scheduleContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    const activeEl = document.getElementById('activeItem');
    if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updateCopyDropdown() {
    copyFromDaySelect.innerHTML = '<option value="">-- Select a day --</option>';
    for (const [day, data] of Object.entries(routines)) {
        if (data.length > 0) {
            copyFromDaySelect.innerHTML += `<option value="${day}">${day}</option>`;
        }
    }
}

// --- 8. Note Modal Logic ---
function openNoteModal(index) {
    currentEditingNoteIndex = index;
    const item = routines[currentViewDay][index];
    
    modalSubjectTitle.innerText = `${item.subject} Notes`;
    subjectNoteInput.value = item.note || "";
    
    noteModalOverlay.classList.add('show');
}

function closeNoteModal() {
    noteModalOverlay.classList.remove('show');
    currentEditingNoteIndex = null;
}

btnCloseModal.addEventListener('click', closeNoteModal);

// Close modal if clicking outside the content box
noteModalOverlay.addEventListener('click', (e) => {
    if (e.target === noteModalOverlay) closeNoteModal();
});

btnSaveNote.addEventListener('click', () => {
    if (currentEditingNoteIndex !== null) {
        routines[currentViewDay][currentEditingNoteIndex].note = subjectNoteInput.value;
        saveData();
        renderSchedule(); // Refresh icon status (color change if note exists)
    }
    closeNoteModal();
});

