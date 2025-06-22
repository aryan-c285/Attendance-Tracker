// Enhanced Attendance Tracker JavaScript

// Create global variables to be accessible across functions
let db;
let attendanceRecords = {}; // { date: [{ name, status }] }
let allStudents = []; // Array to store all students
let filteredStudents = []; // For search and filter functionality

// Firebase references
let studentsRef;
let attendanceRef;

// Add a helper function to ensure elements are updated when available
function updateElementTextContent(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
}

// Firebase helper functions
async function saveStudentToFirebase(student) {
  if (!db) return null;
  
  try {
    const { ref, push } = window.firebaseApp.databaseFunctions;
    const newStudentRef = push(studentsRef);
    const studentId = newStudentRef.key;
    
    student.firebaseId = studentId;
    
    await window.firebaseApp.databaseFunctions.set(newStudentRef, student);
    console.log(`Student ${student.name} saved to Firebase with ID: ${studentId}`);
    return studentId;
  } catch (error) {
    console.error("Error saving student to Firebase:", error);
    return null;
  }
}

async function updateStudentInFirebase(student) {
  if (!db || !student.firebaseId) return false;
  
  try {
    const { ref, update } = window.firebaseApp.databaseFunctions;
    const studentRef = ref(db, `students/${student.firebaseId}`);
    await update(studentRef, student);
    console.log(`Student ${student.name} updated in Firebase`);
    return true;
  } catch (error) {
    console.error("Error updating student in Firebase:", error);
    return false;
  }
}

async function removeStudentFromFirebase(studentId) {
  if (!db) return false;
  
  try {
    const { ref, remove } = window.firebaseApp.databaseFunctions;
    await remove(ref(db, `students/${studentId}`));
    console.log(`Student with ID: ${studentId} removed from Firebase`);
    return true;
  } catch (error) {
    console.error("Error removing student from Firebase:", error);
    return false;
  }
}

async function saveAttendanceToFirebase(date, records) {
  if (!db) return false;
  
  try {
    const { ref, set } = window.firebaseApp.databaseFunctions;
    const formattedDate = date.replace(/-/g, '');
    await set(ref(db, `attendance/${formattedDate}`), records);
    console.log(`Attendance for ${date} saved to Firebase`);
    return true;
  } catch (error) {
    console.error("Error saving attendance to Firebase:", error);
    return false;
  }
}

async function loadStudentsFromFirebase() {
  if (!db) return;
  
  try {
    const { ref, get } = window.firebaseApp.databaseFunctions;
    const snapshot = await get(studentsRef);
    
    if (snapshot.exists()) {
      const studentsData = snapshot.val();
      allStudents = [];
      
      // Convert object to array and add firebaseId
      Object.keys(studentsData).forEach(key => {
        const student = studentsData[key];
        student.firebaseId = key;
        allStudents.push(student);
      });
      
      console.log(`Loaded ${allStudents.length} students from Firebase`);
      
      // Update class filter options
      updateClassFilterOptions();
      
      // Filter and display students
      filterStudents();
      
      // Update UI
      updateAttendanceSummary();
      populateStudentTable();
      populateStudentNamesList();
    } else {
      console.log("No students found in database, using sample data");
    }
  } catch (error) {
    console.error("Error loading students from Firebase:", error);
  }
}

async function loadAttendanceFromFirebase() {
  if (!db) return;
  
  try {
    const { ref, get } = window.firebaseApp.databaseFunctions;
    const snapshot = await get(attendanceRef);
    
    if (snapshot.exists()) {
      const attendanceData = snapshot.val();
      attendanceRecords = {};
      
      // Convert Firebase format to app format
      Object.keys(attendanceData).forEach(dateKey => {
        // Convert dateKey (YYYYMMDD) to YYYY-MM-DD format
        const year = dateKey.substring(0, 4);
        const month = dateKey.substring(4, 6);
        const day = dateKey.substring(6, 8);
        const formattedDate = `${year}-${month}-${day}`;
        
        attendanceRecords[formattedDate] = attendanceData[dateKey];
      });
      
      console.log(`Loaded attendance records for ${Object.keys(attendanceRecords).length} dates from Firebase`);
      
      // Update UI
      updateAttendanceSummary();
    } else {
      console.log("No attendance records found in database");
    }
  } catch (error) {
    console.error("Error loading attendance from Firebase:", error);
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  console.log("DOMContentLoaded - Initializing app");
  
  // Wait for Firebase to be initialized
  let firebaseReady = false;
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  while (!firebaseReady && attempts < maxAttempts) {
    if (window.firebaseApp) {
      firebaseReady = true;
      console.log("Firebase is ready");
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!firebaseReady) {
    console.warn("Firebase not available, continuing with mock implementation");
  }

  try {
    // Initialize Firebase with global firebaseApp object
    if (window.firebaseApp) {
      if (window.firebaseApp.isConnected) {
        db = window.firebaseApp.db;
        const { ref } = window.firebaseApp.databaseFunctions;
        studentsRef = ref(db, 'students');
        attendanceRef = ref(db, 'attendance');
        console.log("Connected to Firebase database");
      } else {
        console.log("Using mock Firebase database");
        db = window.firebaseApp.getDatabase();
      }
    } else {
      console.error("FirebaseApp not found, creating fallback");
      // Create a simple fallback
      db = null;
    }
    
    // Initialize date picker with today's date
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById("datePicker");
    if (datePicker) {
      datePicker.value = today;
    }
    
    // Try to load data from Firebase
    try {
      await loadAttendanceFromFirebase();
      await loadStudentsFromFirebase();
    } catch (error) {
      console.warn("Error loading data from Firebase:", error);
      console.log("Will use sample data instead");
    }
    
    // Add event listeners
    document.getElementById("saveNewStudent").addEventListener("click", addNewStudent);
    document.getElementById("datePicker").addEventListener("change", function() {
      updateAttendanceSummary();
      populateStudentTable(); // Update student table when date changes
    });
    
    // Navigation event listeners
    const teacherViewLink = document.getElementById("teacherViewLink");
    const studentViewLink = document.getElementById("studentViewLink");
    const statsLink = document.getElementById("statsLink");
    
    if (teacherViewLink) teacherViewLink.addEventListener("click", showTeacherView);
    if (studentViewLink) studentViewLink.addEventListener("click", showStudentView);
    if (statsLink) statsLink.addEventListener("click", showStatsView);
    
    document.getElementById("exportBtn").addEventListener("click", exportCSV);
    document.getElementById("importStudentsBtn").addEventListener("click", () => document.getElementById("csvFileInput").click());
    document.getElementById("csvFileInput").addEventListener("change", importStudentsFromCSV);
    document.getElementById("studentSearch").addEventListener("input", filterStudents);
    document.getElementById("classFilter").addEventListener("change", filterStudents);
    
    // Add toggle student list button event listener
    document.getElementById("toggleStudentListBtn").addEventListener("click", function() {
      const studentListContainer = document.getElementById("studentListContainer");
      if (studentListContainer.style.display === "none") {
        studentListContainer.style.display = "block";
        this.innerHTML = '<i class="fas fa-eye-slash me-1"></i> Hide';
      } else {
        studentListContainer.style.display = "none";
        this.innerHTML = '<i class="fas fa-eye me-1"></i> Show';
      }
    });
    
    // Initialize default students if none exist
    if (allStudents.length === 0) {
      allStudents = [
        { name: 'Alice Johnson', id: 'S001', class: 'ClassA' },
        { name: 'Bob Smith', id: 'S002', class: 'ClassA' },
        { name: 'Charlie Brown', id: 'S003', class: 'ClassB' },
      ];
    }
    
    // Add sample students
    addSampleStudents();
    
    // Populate class filter dropdown with available classes
    populateClassFilter();
    
    // Set filtered students initially to all students
    filteredStudents = [...allStudents];
    
    // Update the student table
    populateStudentTable();
    
    // Update attendance summary statistics
    updateAttendanceSummary();
    
    // Update the filter count display
    updateFilterCount();

    // Make sure teacher view is shown by default
    showTeacherView();
    
    console.log("Application initialized successfully");
    showNotification("Application loaded successfully", "success");
  } catch (error) {
    console.error("Error initializing app:", error);
    showNotification("Error initializing app. Please check console for details.", "danger");
  }
  
  // Add a final step to synchronize all student counts
  // This ensures consistent count display across the UI
  if (typeof synchronizeStudentCounts === 'function') {
    synchronizeStudentCounts();
  } else {
    console.warn("synchronizeStudentCounts function not available - counts may be inconsistent");
  }
});

// Notification system
function showNotification(message, type = 'success', duration = 3000) {
  // Create notification container if it doesn't exist
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  
  // Create notification toast
  const toast = document.createElement('div');
  toast.className = `notification-toast toast show alert alert-${type}`;
  toast.innerHTML = `
    <div class="toast-body">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} me-2"></i>
      ${message}
    </div>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Loading indicator functions
function showLoading(message = 'Loading...') {
  let loader = document.querySelector('.loading-indicator');
  if (!loader) {
    loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.innerHTML = `
      <div class="spinner-border text-primary me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span id="loadingMessage">${message}</span>
    `;
    document.body.appendChild(loader);
  } else {
    document.getElementById('loadingMessage').textContent = message;
  }
  
  loader.classList.add('show');
}

function hideLoading() {
  const loader = document.querySelector('.loading-indicator');
  if (loader) {
    loader.classList.remove('show');
  }
}

// Function to update filter count
function updateFilterCount() {
  const filterCountElement = document.getElementById('filterCount');
  if (filterCountElement) {
    // Ensure we're using the correct counts
    filterCountElement.textContent = `${filteredStudents.length} of ${allStudents.length}`;
    console.log(`Filter count updated: ${filteredStudents.length} of ${allStudents.length}`);
  } else {
    console.warn("Filter count element not found");
  }
  
  // Also update the total students count in the summary
  updateElementTextContent('totalStudents', allStudents.length);
}

// Explicitly define functions in global scope
function getSelectedDate() {
  return document.getElementById("datePicker").value || new Date().toISOString().split('T')[0];
}

function markStatus(button, status, studentName) {
  console.log(`Marking ${studentName} as ${status}`);
  
  try {
    if (!studentName || !status) {
      console.error("Missing required parameters for markStatus", { studentName, status });
      return;
    }
    
    const date = getSelectedDate();
    
    if (!attendanceRecords[date]) attendanceRecords[date] = [];
    
    // Remove existing entry for this student if any
    attendanceRecords[date] = attendanceRecords[date].filter(entry => entry.name !== studentName);
    
    // Add new status
    attendanceRecords[date].push({ name: studentName, status });
    
    // Update UI
    updateStudentStatus(studentName, status);
    updateAttendanceSummary();
    
    // Save to Firebase
    saveAttendanceToFirebase();
    
    // Show notification
    const statusColors = {
      'Present': 'success',
      'Late': 'warning',
      'Absent': 'danger'
    };
    
    showNotification(`${studentName} marked ${status.toLowerCase()}`, statusColors[status] || 'info');
    
    console.log(`Successfully marked ${studentName} as ${status}`);
    return true;
  } catch (error) {
    console.error("Error in markStatus:", error);
    showNotification(`Error marking attendance for ${studentName}`, "danger");
    return false;
  }
  saveAttendanceToFirebase();
  
  showNotification(`${studentName} marked ${status.toLowerCase()}`, status === 'Present' ? 'success' : status === 'Late' ? 'warning' : 'danger');
}

function updateStudentStatus(studentName, status) {
  try {
    console.log(`Updating UI for ${studentName} with status ${status}`);
    
    if (!studentName || !status) {
      console.error("Missing parameters for updateStudentStatus", { studentName, status });
      return;
    }
    
    const rows = document.querySelectorAll('#studentTableBody tr');
    if (rows.length === 0) {
      console.warn("No student rows found in table");
      return;
    }
    
    let studentFound = false;
    
    for (const row of rows) {
      const nameCell = row.querySelector('.student-name');
      
      if (nameCell && nameCell.textContent === studentName) {
        studentFound = true;
        const statusCell = row.querySelector('.status-cell');
        if (!statusCell) {
          console.warn("Status cell not found for student", studentName);
          continue;
        }
        
        let badgeClass, iconClass;
        
        switch(status) {
          case 'Present':
            badgeClass = 'badge-present';
            iconClass = 'fa-check-circle';
            break;
          case 'Late':
            badgeClass = 'badge-late';
            iconClass = 'fa-clock';
            break;
          case 'Absent':
            badgeClass = 'badge-absent';
            iconClass = 'fa-times-circle';
            break;
          default:
            badgeClass = 'bg-secondary';
            iconClass = 'fa-question-circle';
        }
        
        statusCell.innerHTML = `<span class="badge ${badgeClass}">
          <i class="fas ${iconClass} me-1"></i>${status}
        </span>`;
        
        // Update buttons' appearance
        const presentBtn = row.querySelector('.btn-present');
        const lateBtn = row.querySelector('.btn-late');
        const absentBtn = row.querySelector('.btn-absent');
        
        if (presentBtn && lateBtn && absentBtn) {
          // Reset all buttons to outline state
          presentBtn.classList.add('btn-outline-success');
          presentBtn.classList.remove('btn-success');
          lateBtn.classList.add('btn-outline-warning');
          lateBtn.classList.remove('btn-warning');
          absentBtn.classList.add('btn-outline-danger');
          absentBtn.classList.remove('btn-danger');
          
          // Highlight the selected button
          if (status === 'Present') {
            presentBtn.classList.add('btn-success');
            presentBtn.classList.remove('btn-outline-success');
          } else if (status === 'Late') {
            lateBtn.classList.add('btn-warning');
            lateBtn.classList.remove('btn-outline-warning');
          } else if (status === 'Absent') {
            absentBtn.classList.add('btn-danger');
            absentBtn.classList.remove('btn-outline-danger');
          }
        } else {
          console.warn("One or more status buttons not found for student", studentName);
        }
        
        break;
      }
    }
    
    if (!studentFound) {
      console.warn(`Student ${studentName} not found in the table. UI not updated.`);
    }
  } catch (error) {
    console.error("Error in updateStudentStatus:", error);
  }
}

function updateAttendanceSummary() {
  const date = getSelectedDate();
  const todayRecords = attendanceRecords[date] || [];
  
  const totalStudents = allStudents.length;
  
  // Count only attendance records for students who exist in our student list
  const validRecords = todayRecords.filter(record => 
    allStudents.some(student => student.name === record.name)
  );
  
  const presentToday = validRecords.filter(record => record.status === 'Present').length;
  const lateToday = validRecords.filter(record => record.status === 'Late').length;
  const absentToday = validRecords.filter(record => record.status === 'Absent').length;
  const attendanceRate = totalStudents ? Math.round(((presentToday + lateToday) / totalStudents) * 100) : 0;
  
  // Use the helper function to safely update elements
  updateElementTextContent('totalStudents', totalStudents);
  updateElementTextContent('presentToday', presentToday);
  updateElementTextContent('lateToday', lateToday);
  updateElementTextContent('absentToday', absentToday);
  updateElementTextContent('attendanceRate', `${attendanceRate}%`);
  
  console.log(`Attendance summary updated: ${totalStudents} total students, ${presentToday} present, ${lateToday} late, ${absentToday} absent`);
}

function populateStudentTable() {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) {
    console.error("Student table body not found");
    return;
  }
  
  tbody.innerHTML = '';
  
  const date = getSelectedDate();
  const todayRecords = attendanceRecords[date] || [];
  
  console.log(`Populating student table with ${filteredStudents.length} students`);
  
  // Update filter count right away for consistency
  const filterCountElement = document.getElementById('filterCount');
  if (filterCountElement) {
    filterCountElement.textContent = `${filteredStudents.length} of ${allStudents.length}`;
  }
  
  if (filteredStudents.length === 0) {
    // No students to display - add a message row
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="3" class="text-center text-muted py-4">
        <i class="fas fa-info-circle me-2"></i>No students match the current filter criteria
      </td>
    `;
    tbody.appendChild(emptyRow);
  } else {
    // Display the filtered students
    filteredStudents.forEach((student) => {
      const record = todayRecords.find(entry => entry.name === student.name);
      const status = record ? record.status : 'Not Marked';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="student-info">
            <div class="student-avatar">${student.name.charAt(0)}</div>
            <div>
              <div class="student-name">${student.name}</div>
              <small class="text-muted">${student.id || 'No ID'} • ${student.class || 'No Class'}</small>
            </div>
          </div>
        </td>
        <td class="status-cell">
          ${status === 'Present' ? 
            `<span class="badge badge-present"><i class="fas fa-check-circle me-1"></i>Present</span>` : 
            status === 'Late' ? 
            `<span class="badge badge-late"><i class="fas fa-clock me-1"></i>Late</span>` :
            status === 'Absent' ? 
            `<span class="badge badge-absent"><i class="fas fa-times-circle me-1"></i>Absent</span>` :
            `<span class="badge bg-secondary"><i class="fas fa-question-circle me-1"></i>Not Marked</span>`
          }
        </td>
        <td>
          <div class="attendance-actions">
            <button class="btn ${status === 'Present' ? 'btn-success' : 'btn-outline-success'} btn-sm btn-present" 
                    onclick="markStatus(this, 'Present', '${student.name}')">
              <i class="fas fa-check me-1"></i>Present
            </button>
            <button class="btn ${status === 'Late' ? 'btn-warning' : 'btn-outline-warning'} btn-sm btn-late" 
                    onclick="markStatus(this, 'Late', '${student.name}')">
              <i class="fas fa-clock me-1"></i>Late
            </button>
            <button class="btn ${status === 'Absent' ? 'btn-danger' : 'btn-outline-danger'} btn-sm btn-absent" 
                    onclick="markStatus(this, 'Absent', '${student.name}')">
              <i class="fas fa-times me-1"></i>Absent
            </button>
            <button class="btn btn-outline-info btn-sm" onclick="showStudentAttendanceModal('${student.name}')">
              <i class="fas fa-chart-pie me-1"></i>Stats
            </button>
            <button class="btn btn-outline-secondary btn-sm" onclick="removeStudent('${student.name}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }
  
  // Always update filter count after populating the table
  updateFilterCount();
  
  // If we have the synchronization function available, use it for extra consistency
  if (typeof synchronizeStudentCounts === 'function') {
    synchronizeStudentCounts();
  }
}

function filterStudents() {
  const searchQuery = document.getElementById('studentSearch').value.toLowerCase().trim();
  const classFilter = document.getElementById('classFilter').value;
  
  console.log(`Filtering students... Query: '${searchQuery}', Class: '${classFilter}'`);
  
  filteredStudents = allStudents.filter(student => {
    const nameMatch = student.name.toLowerCase().includes(searchQuery) || 
                     (student.id && student.id.toLowerCase().includes(searchQuery));
    const classMatch = classFilter === 'All' || student.class === classFilter;
    
    return nameMatch && classMatch;
  });
  
  console.log(`Filter results: ${filteredStudents.length} students`);
  
  // Update table with filtered students
  populateStudentTable();
  
  // Update filter count separately to ensure it's updated
  updateFilterCount();
}

function populateClassFilter() {
  const classFilter = document.getElementById('classFilter');
  classFilter.innerHTML = '<option value="All">All Classes</option>';
  
  // Get unique classes
  const classes = [...new Set(allStudents.map(student => student.class))].filter(Boolean).sort();
  
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });
}

// Update class filter options based on available classes
function updateClassFilterOptions() {
  const classFilter = document.getElementById('classFilter');
  if (!classFilter) {
    console.warn("Class filter element not found");
    return;
  }
  
  // Save current selection
  const currentSelection = classFilter.value;
  
  // Clear current options except "All Classes"
  while (classFilter.options.length > 1) {
    classFilter.remove(1);
  }
  
  // Get unique classes from all students
  const classes = [...new Set(allStudents.map(student => student.class))].filter(Boolean);
  
  // Add options for each class
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });
  
  // Restore previous selection if it still exists
  if (currentSelection && Array.from(classFilter.options).some(option => option.value === currentSelection)) {
    classFilter.value = currentSelection;
  }
  
  console.log(`Updated class filter with ${classes.length} classes`);
}

function importStudentsFromCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const contents = e.target.result;
      const rows = contents.split('\n');
      
      if (rows.length < 2) {
        showNotification("CSV file seems empty or invalid", "danger");
        return;
      }
      
      const headers = rows[0].split(',').map(h => h.trim());
      const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
      const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
      const classIndex = headers.findIndex(h => h.toLowerCase() === 'class');
      
      if (nameIndex === -1) {
        showNotification("CSV must contain a 'name' column", "danger");
        return;
      }
      
      let newStudents = [];
      let duplicates = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',').map(c => c.trim());
        
        const name = columns[nameIndex];
        if (!name) continue;
        
        const id = idIndex > -1 ? columns[idIndex] : `S${(allStudents.length + newStudents.length + 1).toString().padStart(3, '0')}`;
        const className = classIndex > -1 ? columns[classIndex] : 'No Class';
        
        // Check if student already exists
        if (allStudents.some(s => s.name === name)) {
          duplicates.push(name);
          continue;
        }
        
        newStudents.push({ name, id, class: className });
      }
      
      if (newStudents.length === 0) {
        if (duplicates.length > 0) {
          showNotification(`No new students added. ${duplicates.length} duplicates found.`, "warning");
        } else {
          showNotification("No valid student data found in CSV", "warning");
        }
        return;
      }
      
      // Store the initial count for logging
      const initialCount = allStudents.length;
      
      // Add new students
      allStudents = [...allStudents, ...newStudents];
      saveStudentsToFirebase();
      
      console.log(`Added ${newStudents.length} students. Total students: ${initialCount} → ${allStudents.length}`);
      
      // Update UI
      populateClassFilter();
      
      // Reset filtered students to match current filter settings
      filterStudents();
      
      // Explicitly update the filter count display
      updateFilterCount();
      
      // Update attendance summary with new student count
      updateAttendanceSummary();
      
      let message = `${newStudents.length} students imported successfully`;
      if (duplicates.length > 0) {
        message += `. ${duplicates.length} duplicates skipped.`;
      }
      
      showNotification(message, "success");
    } catch (error) {
      console.error("Error parsing CSV:", error);
      showNotification("Error parsing CSV file. Please check format.", "danger");
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  reader.onerror = function() {
    showNotification("Error reading file", "danger");
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

// Mark student attendance function
async function markAttendance(studentName, status) {
  const date = document.getElementById("datePicker").value;
  
  // Initialize the date entry if it doesn't exist
  if (!attendanceRecords[date]) {
    attendanceRecords[date] = [];
  }
  
  // Check if student already has attendance for this date
  const existingRecord = attendanceRecords[date].find(record => record.name === studentName);
  
  if (existingRecord) {
    // Update existing record
    existingRecord.status = status;
    console.log(`Updated ${studentName}'s attendance to ${status} on ${date}`);
  } else {
    // Add new record
    attendanceRecords[date].push({ name: studentName, status: status });
    console.log(`Marked ${studentName} as ${status} on ${date}`);
  }
  
  // Save to Firebase
  if (db) {
    await saveAttendanceToFirebase(date, attendanceRecords[date]);
  }
  
  // Update UI
  updateAttendanceSummary();
  populateStudentTable();
  
  // Show notification
  showNotification(`${studentName} marked as ${status}`);
}

// Add new student function
async function addNewStudent() {
  console.log("addNewStudent function called");
  
  const name = document.getElementById("newStudentName").value.trim();
  const id = document.getElementById("newStudentId").value.trim() || generateStudentId();
  const studentClass = document.getElementById("newStudentClass").value;
  
  console.log("Student data:", { name, id, class: studentClass });
  
  if (!name) {
    showNotification("Student name is required", "warning");
    return;
  }
  
  // Check for duplicate name
  if (allStudents.some(student => student.name.toLowerCase() === name.toLowerCase())) {
    showNotification("A student with this name already exists", "warning");
    return;
  }
  
  const newStudent = { name, id, class: studentClass };
  console.log("New student object:", newStudent);
  
  // Save to Firebase and get ID
  if (db) {
    const firebaseId = await saveStudentToFirebase(newStudent);
    if (firebaseId) {
      newStudent.firebaseId = firebaseId;
    }
  }
  
  // Add to local array
  allStudents.push(newStudent);
  console.log("Student added to allStudents array. New count:", allStudents.length);
  
  // Update UI
  updateClassFilterOptions();
  filterStudents();
  updateAttendanceSummary();
  populateStudentTable();
  populateStudentNamesList();
  
  // Reset form and close modal
  document.getElementById("newStudentName").value = "";
  document.getElementById("newStudentId").value = "";
  
  // Use Bootstrap method to close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
  if (modal) {
    modal.hide();
  } else {
    console.warn("Modal instance not found, trying alternate approach");
    // Alternative approach to close the modal
    const modalElement = document.getElementById('addStudentModal');
    const bsModal = new bootstrap.Modal(modalElement);
    bsModal.hide();
  }
  
  showNotification(`Student ${name} added successfully`);
}

function showTeacherView() {
  document.getElementById('teacherView').style.display = 'block';
  document.getElementById('studentView').style.display = 'none';
  document.getElementById('statsView').style.display = 'none';
  
  document.getElementById('teacherViewLink').classList.add('active');
  document.getElementById('studentViewLink').classList.remove('active');
  document.getElementById('statsLink').classList.remove('active');
}

function showStudentView() {
  document.getElementById('teacherView').style.display = 'none';
  document.getElementById('studentView').style.display = 'block';
  document.getElementById('statsView').style.display = 'none';
  
  document.getElementById('teacherViewLink').classList.remove('active');
  document.getElementById('studentViewLink').classList.add('active');
  document.getElementById('statsLink').classList.remove('active');
}

function showStatsView() {
  document.getElementById('teacherView').style.display = 'none';
  document.getElementById('studentView').style.display = 'none';
  document.getElementById('statsView').style.display = 'block';
  
  document.getElementById('teacherViewLink').classList.remove('active');
  document.getElementById('studentViewLink').classList.remove('active');
  document.getElementById('statsLink').classList.add('active');
  
  // Populate the class filter dropdown
  populateStatsClassFilter();
  
  // Update statistics dashboard
  updateStatisticsDashboard();
}

// Enhanced removeStudent function
function removeStudent(studentName) {
  if (!confirm(`Are you sure you want to remove ${studentName}?`)) {
    return;
  }
  
  // Remove from allStudents array
  const initialCount = allStudents.length;
  allStudents = allStudents.filter(student => student.name !== studentName);
  
  if (allStudents.length === initialCount) {
    console.warn(`Student ${studentName} not found in student list`);
    showNotification(`Student ${studentName} not found`, 'warning');
    return;
  }
  
  console.log(`Student ${studentName} removed`);
  
  // Remove from filteredStudents array as well
  filteredStudents = filteredStudents.filter(student => student.name !== studentName);
  
  // Update attendance records to remove this student
  for (const date in attendanceRecords) {
    if (attendanceRecords[date]) {
      attendanceRecords[date] = attendanceRecords[date].filter(record => record.name !== studentName);
    }
  }
  
  // Save updated data to Firebase
  saveStudentsToFirebase();
  saveAttendanceToFirebase();
  
  // Update the UI
  populateClassFilter();
  populateStudentTable();
  updateAttendanceSummary();
  updateFilterCount(); // Explicitly update filter count
  
  showNotification(`Student ${studentName} removed successfully`, 'success');
}

// Firebase functions
async function saveAttendanceToFirebase() {
  if (db) {
    try {
      await window.firebaseApp.set(window.firebaseApp.ref(db, 'attendanceRecords'), attendanceRecords);
      console.log("Attendance data saved to Firebase");
    } catch (error) {
      console.error("Error saving attendance data:", error);
      showNotification("Error saving attendance data. Please try again.", "danger");
    }
  } else {
    console.error("Firebase database not initialized");
    showNotification("Database not initialized. Please refresh the page.", "danger");
  }
}

async function saveStudentsToFirebase() {
  if (db) {
    try {
      await window.firebaseApp.set(window.firebaseApp.ref(db, 'students'), allStudents);
      console.log("Student data saved to Firebase");
    } catch (error) {
      console.error("Error saving student data:", error);
      showNotification("Error saving student data. Please try again.", "danger");
    }
  } else {
    console.error("Firebase database not initialized");
    showNotification("Database not initialized. Please refresh the page.", "danger");
  }
}

async function loadAttendanceFromFirebase() {
  if (db) {
    try {
      const dbRef = window.firebaseApp.ref(db);
      const snapshot = await window.firebaseApp.get(window.firebaseApp.child(dbRef, 'attendanceRecords'));
      
      if (snapshot.exists()) {
        attendanceRecords = snapshot.val() || {};
        console.log("Attendance data loaded from Firebase");
      } else {
        console.log("No attendance data found in Firebase");
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
      showNotification("Error loading attendance data. Using empty dataset.", "warning");
    }
  } else {
    console.error("Firebase database not initialized");
  }
}

async function loadStudentsFromFirebase() {
  if (db) {
    try {
      const dbRef = window.firebaseApp.ref(db);
      const snapshot = await window.firebaseApp.get(window.firebaseApp.child(dbRef, 'students'));
      
      if (snapshot.exists()) {
        allStudents = snapshot.val() || [];
        console.log("Student data loaded from Firebase");
      } else {
        console.log("No student data found in Firebase");
      }
    } catch (error) {
      console.error("Error loading student data:", error);
      showNotification("Error loading student data. Using default students.", "warning");
    }
  } else {
    console.error("Firebase database not initialized");
  }
}

// Make sure functions are available to the HTML
window.markStatus = markStatus;
window.exportCSV = exportCSV;
window.exportStudentList = exportStudentList;
window.showTeacherView = showTeacherView;
window.showStudentView = showStudentView;
window.showStatsView = showStatsView;
window.viewAttendance = viewAttendance;
window.removeStudent = removeStudent;
window.importStudentsFromCSV = importStudentsFromCSV;
window.filterStudents = filterStudents;
window.showStudentAttendanceModal = showStudentAttendanceModal;
window.addNewStudent = addNewStudent;
window.directAddStudent = directAddStudent; // Add directAddStudent to global scope
window.markAttendance = markAttendance;

// Populate the student names list in the UI
function populateStudentNamesList() {
  const studentNamesList = document.getElementById('studentNamesList');
  if (!studentNamesList) {
    console.warn("Student names list container not found");
    return;
  }
  
  // Clear existing content
  studentNamesList.innerHTML = '';
  
  // Add each student to the list
  allStudents.forEach(student => {
    // Create container for student item
    const studentItem = document.createElement('div');
    studentItem.className = 'col-md-4 col-sm-6 mb-2';
    
    // Create the student name item with avatar
    const nameInitial = student.name.charAt(0).toUpperCase();
    
    studentItem.innerHTML = `
      <div class="student-name-item">
        <div class="student-name-avatar">${nameInitial}</div>
        <span class="student-list-name">${student.name}</span>
        <small class="student-list-id">#${student.id}</small>
        <span class="student-list-class">${student.class}</span>
      </div>
    `;
    
    studentNamesList.appendChild(studentItem);
  });
  
  console.log(`Populated student names list with ${allStudents.length} students`);
}

// Function to handle direct add student button click from HTML
function directAddStudent() {
  // Call the addNewStudent function
  addNewStudent();
}

// Helper function to generate a student ID
function generateStudentId() {
  // Get the current year
  const year = new Date().getFullYear().toString().substring(2);
  // Get the current highest student ID number
  let highestId = 0;
  
  allStudents.forEach(student => {
    if (student.id && student.id.startsWith('S')) {
      const idNumber = parseInt(student.id.substring(1));
      if (!isNaN(idNumber) && idNumber > highestId) {
        highestId = idNumber;
      }
    }
  });
  
  // Increment the highest ID
  const newIdNumber = highestId + 1;
  
  // Format the ID with leading zeros (e.g., S001, S012, S123)
  const idFormatted = 'S' + newIdNumber.toString().padStart(3, '0');
  
  console.log(`Generated new student ID: ${idFormatted}`);
  return idFormatted;
}

// Add sample student data if none exists
function addSampleStudents() {
  if (allStudents.length === 0) {
    console.log("Adding sample students");
    
    const sampleStudents = [
      { name: 'John Smith', id: 'S1001', class: 'ClassA' },
      { name: 'Emily Johnson', id: 'S1002', class: 'ClassA' },
      { name: 'Michael Brown', id: 'S1003', class: 'ClassA' },
      { name: 'Jessica Davis', id: 'S1004', class: 'ClassB' },
      { name: 'David Wilson', id: 'S1005', class: 'ClassB' },
      { name: 'Sarah Miller', id: 'S1006', class: 'ClassB' },
      { name: 'Daniel Martinez', id: 'S1007', class: 'ClassC' },
      { name: 'Olivia Taylor', id: 'S1008', class: 'ClassC' },
      { name: 'James Anderson', id: 'S1009', class: 'ClassC' },
      { name: 'Sophia Thomas', id: 'S1010', class: 'ClassA' },
      { name: 'Matthew Jackson', id: 'S1011', class: 'ClassB' },
      { name: 'Emma White', id: 'S1012', class: 'ClassC' }
    ];
    
    // Add sample students to the array
    allStudents = [...sampleStudents];
    
    // Save to Firebase if available
    if (db) {
      sampleStudents.forEach(async (student) => {
        await saveStudentToFirebase(student);
      });
    }
    
    // Update UI
    updateClassFilterOptions();
    filterStudents();
    updateAttendanceSummary();
    populateStudentTable();
    populateStudentNamesList();
    
    console.log("Sample students added successfully");
  }
}

// Statistics Dashboard Functions
function updateStatisticsDashboard() {
  // Get filter values
  const classFilter = document.getElementById('statsClassFilter').value;
  const dateRangeFilter = document.getElementById('statsDateRangeFilter').value;
  
  // Calculate filtered data based on selections
  const filteredData = getFilteredStatsData(classFilter, dateRangeFilter);
  
  // Update summary metrics
  updateStatsSummaryMetrics(filteredData);
  
  // Render all charts with filtered data
  renderStatisticsCharts(filteredData);
  
  // Update at-risk students table
  updateAtRiskStudentsTable(filteredData);
}

function populateStatsClassFilter() {
  const classFilter = document.getElementById('statsClassFilter');
  classFilter.innerHTML = '<option value="All">All Classes</option>';
  
  // Get unique classes
  const classes = [...new Set(allStudents.map(student => student.class))].filter(Boolean).sort();
  
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });
}

function getFilteredStatsData(classFilter, dateRangeFilter) {
  // Filter students by class if specified
  const filteredStudents = classFilter === 'All' 
    ? [...allStudents] 
    : allStudents.filter(student => student.class === classFilter);
  
  // Filter dates based on date range
  const filteredDates = getFilteredDates(dateRangeFilter);
  
  // Filter attendance records
  const filteredAttendance = {};
  for (const date of filteredDates) {
    if (attendanceRecords[date]) {
      // Filter records by selected students
      filteredAttendance[date] = attendanceRecords[date].filter(record => 
        filteredStudents.some(student => student.name === record.name)
      );
    }
  }
  
  return {
    students: filteredStudents,
    dates: filteredDates,
    attendance: filteredAttendance
  };
}

function getFilteredDates(dateRangeFilter) {
  const allDates = Object.keys(attendanceRecords).sort();
  if (dateRangeFilter === 'all' || allDates.length === 0) {
    return allDates;
  }
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  let startDate;
  
  switch (dateRangeFilter) {
    case 'thisMonth':
      startDate = new Date(currentYear, currentMonth, 1);
      break;
    case 'lastMonth':
      startDate = new Date(currentYear, currentMonth - 1, 1);
      const endLastMonth = new Date(currentYear, currentMonth, 0);
      return allDates.filter(date => {
        const dateObj = new Date(date);
        return dateObj >= startDate && dateObj <= endLastMonth;
      });
    case 'last3Months':
      startDate = new Date(currentYear, currentMonth - 2, 1);
      break;
    case 'thisYear':
      startDate = new Date(currentYear, 0, 1);
      break;
    default:
      return allDates;
  }
  
  return allDates.filter(date => new Date(date) >= startDate);
}

function updateStatsSummaryMetrics(filteredData) {
  const { students, attendance } = filteredData;
  
  // Calculate total students
  const totalStudents = students.length;
  document.getElementById('statsStudentCount').textContent = totalStudents;
  
  // Calculate days recorded
  const daysRecorded = Object.keys(attendance).length;
  document.getElementById('statsRecordedDays').textContent = daysRecorded;
  
  // Calculate average attendance rate
  let totalPresent = 0;
  let totalLate = 0;
  let totalEntries = 0;
  
  for (const date in attendance) {
    attendance[date].forEach(record => {
      totalEntries++;
      if (record.status === 'Present') totalPresent++;
      else if (record.status === 'Late') totalLate += 0.5; // Late counts as half present
    });
  }
  
  const averageAttendance = totalEntries > 0 
    ? Math.round(((totalPresent + totalLate) / totalEntries) * 100) 
    : 0;
  
  document.getElementById('statsAverageAttendance').textContent = `${averageAttendance}%`;
  
  // Calculate at-risk students (below 75% attendance)
  const studentAttendanceRates = calculateStudentAttendanceRates(students, attendance);
  const atRiskCount = Object.values(studentAttendanceRates)
    .filter(rate => rate < 75).length;
  
  document.getElementById('statsAtRiskCount').textContent = atRiskCount;
}

function calculateStudentAttendanceRates(students, attendance) {
  const studentRates = {};
  
  students.forEach(student => {
    let present = 0;
    let late = 0;
    let total = 0;
    
    for (const date in attendance) {
      const record = attendance[date].find(r => r.name === student.name);
      if (record) {
        total++;
        if (record.status === 'Present') present++;
        else if (record.status === 'Late') late++;
      }
    }
    
    studentRates[student.name] = total > 0 
      ? ((present + (late * 0.5)) / total) * 100 
      : 0;
  });
  
  return studentRates;
}

function updateAtRiskStudentsTable(filteredData) {
  const { students, attendance } = filteredData;
  const tbody = document.getElementById('atRiskStudentsTable').querySelector('tbody');
  tbody.innerHTML = '';
  
  // Calculate attendance stats for each student
  const studentStats = students.map(student => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let total = 0;
    let lastPresentDate = null;
    
    // Count attendance records
    for (const date in attendance) {
      const record = attendance[date].find(r => r.name === student.name);
      if (record) {
        total++;
        if (record.status === 'Present') {
          present++;
          if (!lastPresentDate || new Date(date) > new Date(lastPresentDate)) {
            lastPresentDate = date;
          }
        } else if (record.status === 'Late') {
          late++;
          if (!lastPresentDate || new Date(date) > new Date(lastPresentDate)) {
            lastPresentDate = date;
          }
        } else if (record.status === 'Absent') {
          absent++;
        }
      }
    }
    
    // Calculate attendance rate
    const attendanceRate = total > 0 
      ? ((present + (late * 0.5)) / total) * 100 
      : 0;
    
    return {
      student,
      attendanceRate,
      present,
      late,
      absent,
      total,
      lastPresentDate
    };
  });
  
  // Filter to show only at-risk students (below 85%)
  const atRiskStudents = studentStats
    .filter(stats => stats.total > 0 && stats.attendanceRate < 85)
    .sort((a, b) => a.attendanceRate - b.attendanceRate);
  
  // Populate table
  atRiskStudents.forEach(stats => {
    const row = document.createElement('tr');
    
    // Format last present date
    const lastPresent = stats.lastPresentDate 
      ? formatDate(stats.lastPresentDate)
      : 'Never';
    
    // Determine rate class
    let rateClass = 'attendance-rate-high';
    if (stats.attendanceRate < 75) {
      rateClass = 'attendance-rate-low';
    } else if (stats.attendanceRate < 85) {
      rateClass = 'attendance-rate-medium';
    }
    
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="student-avatar me-2">${stats.student.name.charAt(0)}</div>
          <div>${stats.student.name}</div>
        </div>
      </td>
      <td>${stats.student.class || 'N/A'}</td>
      <td>
        <div class="d-flex align-items-center">
          <span class="me-2">${Math.round(stats.attendanceRate)}%</span>
          <div class="attendance-rate-indicator">
            <div class="attendance-rate-progress ${rateClass}" style="width: ${stats.attendanceRate}%"></div>
          </div>
        </div>
      </td>
      <td>${stats.absent} days</td>
      <td>${lastPresent}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="showStudentAttendanceModal('${stats.student.name}')">
          <i class="fas fa-chart-pie me-1"></i>Details
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Show message if no at-risk students
  if (atRiskStudents.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6" class="text-center">No at-risk students found. Everyone is doing great!</td>';
    tbody.appendChild(row);
  }
}

// Add event listeners for statistics filters
document.getElementById('statsClassFilter').addEventListener('change', updateStatisticsDashboard);
document.getElementById('statsDateRangeFilter').addEventListener('change', updateStatisticsDashboard);
document.getElementById('refreshStatsBtn').addEventListener('click', updateStatisticsDashboard);

// Add event listeners for chart period buttons
const chartPeriodButtons = document.querySelectorAll('.chart-controls button');
chartPeriodButtons.forEach(button => {
  button.addEventListener('click', function() {
    // Remove active class from all buttons
    chartPeriodButtons.forEach(btn => btn.classList.remove('active'));
    // Add active class to clicked button
    this.classList.add('active');
    // Update chart based on selected period
    const period = this.getAttribute('data-period');
    updateChartPeriod(period);
  });
});

window.synchronizeStudentCounts = function() {
  // This function ensures that the student counts are consistent across the application
  const totalCount = allStudents.length;
  const presentCount = Object.values(attendanceRecords).reduce((count, records) => 
    count + records.filter(record => record.status === 'Present').length, 0);
  const lateCount = Object.values(attendanceRecords).reduce((count, records) => 
    count + records.filter(record => record.status === 'Late').length, 0);
  const absentCount = Object.values(attendanceRecords).reduce((count, records) => 
    count + records.filter(record => record.status === 'Absent').length, 0);
  
  // Update the summary statistics
  updateElementTextContent('totalStudents', totalCount);
  updateElementTextContent('presentToday', presentCount);
  updateElementTextContent('lateToday', lateCount);
  updateElementTextContent('absentToday', absentCount);
  
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;
  updateElementTextContent('attendanceRate', `${attendanceRate}%`);
  
  console.log(`Student counts synchronized: ${totalCount} total, ${presentCount} present, ${lateCount} late, ${absentCount} absent`);
};

// Expose additional functions to global scope
window.updateStatisticsDashboard = updateStatisticsDashboard;

function updateChartPeriod(period) {
  const classFilter = document.getElementById('statsClassFilter').value;
  const dateRangeFilter = document.getElementById('statsDateRangeFilter').value;
  const filteredData = getFilteredStatsData(classFilter, dateRangeFilter);
  
  // Get all dates from the filtered data
  const allDates = Object.keys(filteredData.attendance).sort((a, b) => new Date(a) - new Date(b));
  if (allDates.length === 0) return;
  
  // Filter dates based on selected period
  let filteredDates;
  const today = new Date();
  
  switch (period) {
    case 'week':
      // Last 7 days
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      filteredDates = allDates.filter(date => new Date(date) >= weekAgo);
      break;
    case 'month':
      // Last 30 days
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      filteredDates = allDates.filter(date => new Date(date) >= monthAgo);
      break;
    case 'year':
      // Last 365 days
      const yearAgo = new Date(today);
      yearAgo.setDate(today.getDate() - 365);
      filteredDates = allDates.filter(date => new Date(date) >= yearAgo);
      break;
    default:
      filteredDates = allDates;
  }
  
  // Create a subset of attendance data with only the filtered dates
  const periodAttendance = {};
  filteredDates.forEach(date => {
    if (filteredData.attendance[date]) {
      periodAttendance[date] = filteredData.attendance[date];
    }
  });
  
  // Update the trend chart with this period data
  const updatedData = {
    ...filteredData,
    attendance: periodAttendance
  };
    renderAttendanceTrendChart(updatedData);
}
