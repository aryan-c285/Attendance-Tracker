// Enhanced Attendance Tracker JavaScript

// Create global variables to be accessible across functions
let db;
let attendanceRecords = {}; // { date: [{ name, status }] }
let allStudents = []; // Array to store all students
let filteredStudents = []; // For search and filter functionality

// Add a helper function to ensure elements are updated when available
function updateElementTextContent(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
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
    
    // Initialize default students if none exist
    if (allStudents.length === 0) {
      allStudents = [
        { name: 'Alice Johnson', id: 'S001', class: 'ClassA' },
        { name: 'Bob Smith', id: 'S002', class: 'ClassA' },
        { name: 'Charlie Brown', id: 'S003', class: 'ClassB' },
        { name: 'David Garcia', id: 'S004', class: 'ClassB' },
        { name: 'Emma Wilson', id: 'S005', class: 'ClassC' }
      ];
      await saveStudentsToFirebase();
    }
    
    console.log("Students loaded:", allStudents.length);
    
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

// Notification function to show user messages
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Try to find an existing notification container
  let container = document.getElementById('notification-container');
  
  if (!container) {
    // Create notification container if it doesn't exist
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
  notification.style.cssText = `
    margin-bottom: 10px;
    pointer-events: auto;
    min-width: 300px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  // Create icon based on type
  let icon = 'fa-info-circle';
  switch(type) {
    case 'success': icon = 'fa-check-circle'; break;
    case 'warning': icon = 'fa-exclamation-triangle'; break;
    case 'danger': icon = 'fa-times-circle'; break;
  }
  
  notification.innerHTML = `
    <i class="fas ${icon} me-2"></i>
    ${message}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
  `;
  
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
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

function addNewStudent() {
  const name = document.getElementById('newStudentName').value.trim();
  const id = document.getElementById('newStudentId').value.trim();
  const className = document.getElementById('newStudentClass').value;

  if (!name) {
    showNotification('Student name is required', 'danger');
    return;
  }

  // Prevent duplicate names
  if (allStudents.some(s => s.name === name)) {
    showNotification('Student already exists', 'warning');
    return;
  }

  allStudents.push({ name, id, class: className });
  saveStudentsToFirebase();
  populateStudentTable();
  updateAttendanceSummary();
  updateFilterCount();
  showNotification('Student added successfully', 'success');

  // Close the modal after adding
  const modalElement = document.getElementById('addStudentModal');
  if (modalElement && typeof bootstrap !== 'undefined') {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.hide();
  }

  // Reset form
  document.getElementById('addStudentForm').reset();
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
