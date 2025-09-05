// Global state
let currentUser = null;
let polls = [];

// DOM elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const pollModal = document.getElementById('pollModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

// Event listeners
closeModal.addEventListener('click', () => {
    pollModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === pollModal) {
        pollModal.style.display = 'none';
    }
});

// API functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// Auth functions
function renderAuthSection() {
    if (currentUser) {
        authSection.innerHTML = `
            <div class="user-info">
                <span>Hello, ${currentUser.username}</span>
                <span class="role-badge role-${currentUser.role}">${currentUser.role}</span>
            </div>
            <button class="btn btn-secondary" onclick="logout()">Logout</button>
        `;
    } else {
        authSection.innerHTML = `
            <button class="btn btn-primary" onclick="showLoginForm()">Login</button>
            <button class="btn btn-secondary" onclick="showRegisterForm()">Register</button>
        `;
    }
}

function showLoginForm() {
    mainContent.innerHTML = `
        <div class="card">
            <h2>Login</h2>
            <div id="loginError" class="error"></div>
            <form onsubmit="login(event)">
                <input type="text" id="loginUsername" placeholder="Username" required>
                <input type="password" id="loginPassword" placeholder="Password" required>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
        </div>
    `;
}

function showRegisterForm() {
    mainContent.innerHTML = `
        <div class="card">
            <h2>Register</h2>
            <div id="registerError" class="error"></div>
            <form onsubmit="register(event)">
                <input type="text" id="registerUsername" placeholder="Username" required>
                <input type="password" id="registerPassword" placeholder="Password" required>
                <select id="registerRole">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" class="btn btn-primary">Register</button>
            </form>
        </div>
    `;
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        currentUser = data.user;
        renderAuthSection();
        loadPolls();
        showSuccess('Login successful!');
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
    }
}

async function register(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    try {
        await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
        
        showSuccess('Registration successful! Please login.');
        showLoginForm();
    } catch (error) {
        document.getElementById('registerError').textContent = error.message;
    }
}

async function logout() {
    try {
        await apiCall('/api/logout');
        currentUser = null;
        polls = [];
        renderAuthSection();
        mainContent.innerHTML = '<p>Please login to continue.</p>';
        showSuccess('Logged out successfully!');
    } catch (error) {
        // Error is already handled in apiCall
    }
}

// Poll functions
async function loadPolls() {
    try {
        polls = await apiCall('/api/polls');
        renderPolls();
    } catch (error) {
        mainContent.innerHTML = '<p>Error loading polls.</p>';
    }
}

function renderPolls() {
    if (!currentUser) {
        mainContent.innerHTML = '<p>Please login to view polls.</p>';
        return;
    }
    
    let html = '';
    
    if (currentUser.role === 'admin') {
        html += `
            <div class="card">
                <h2>Admin Actions</h2>
                <button class="btn btn-primary" onclick="showCreatePollForm()">Create New Poll</button>
            </div>
        `;
    }
    
    if (polls.length === 0) {
        html += '<div class="card"><p>No polls available.</p></div>';
    } else {
        polls.forEach(poll => {
            const isClosed = poll.is_closed || new Date(poll.closing_date) < new Date();
            const canVote = !isClosed && !poll.has_voted && currentUser.role === 'user';
            const canSeeResults = (isClosed || poll.is_closed) && poll.has_voted;
            
            html += `
                <div class="card poll-card" onclick="openPoll(${poll.id})">
                    <div class="poll-question">${poll.question}</div>
                    <div>Closes: ${new Date(poll.closing_date).toLocaleString()}</div>
                    <div>Status: ${isClosed ? 'Closed' : 'Open'}</div>
                    ${poll.has_voted ? `<div>You've already voted on this poll</div>` : ''}
                    ${canVote ? `<div>You can vote on this poll</div>` : ''}
                    ${canSeeResults ? `<div>Results available</div>` : ''}
                    
                    ${currentUser.role === 'admin' ? `
                        <div class="admin-actions">
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); showEditPollForm(${poll.id})">Edit</button>
                            <button class="btn btn-danger" onclick="event.stopPropagation(); deletePoll(${poll.id})">Delete</button>
                            ${!poll.is_closed ? `<button class="btn btn-secondary" onclick="event.stopPropagation(); closePoll(${poll.id})">Close Poll</button>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    mainContent.innerHTML = html;
}

function openPoll(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    const isClosed = poll.is_closed || new Date(poll.closing_date) < new Date();
    const canVote = !isClosed && !poll.has_voted && currentUser.role === 'user';
    const canSeeResults = (isClosed || poll.is_closed) && poll.has_voted;
    
    modalTitle.textContent = poll.question;
    
    if (canVote) {
        let optionsHtml = '';
        poll.options.forEach((option, index) => {
            optionsHtml += `
                <div class="poll-option">
                    <input type="radio" name="pollOption" id="option${index}" value="${index}">
                    <label for="option${index}">${option}</label>
                </div>
            `;
        });
        
        modalBody.innerHTML = `
            <form onsubmit="voteOnPoll(event, ${poll.id})">
                <div class="poll-options">
                    ${optionsHtml}
                </div>
                <button type="submit" class="btn btn-primary">Vote</button>
            </form>
        `;
    } else if (canSeeResults) {
        showPollResults(poll);
    } else if (poll.has_voted && !isClosed) {
        modalBody.innerHTML = `
            <p>You've already voted on this poll. The poll is still open.</p>
            <p>You voted for: ${poll.options[poll.user_vote]}</p>
        `;
    } else if (isClosed && !poll.has_voted) {
        modalBody.innerHTML = `
            <p>This poll is closed and you didn't vote, so you cannot see the results.</p>
        `;
    } else {
        modalBody.innerHTML = `
            <p>You don't have permission to view this poll.</p>
        `;
    }
    
    pollModal.style.display = 'flex';
}

async function voteOnPoll(event, pollId) {
    event.preventDefault();
    const selectedOption = document.querySelector('input[name="pollOption"]:checked');
    
    if (!selectedOption) {
        showError('Please select an option');
        return;
    }
    
    try {
        await apiCall(`/api/polls/${pollId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ option_index: parseInt(selectedOption.value) })
        });
        
        showSuccess('Vote recorded successfully!');
        pollModal.style.display = 'none';
        await loadPolls();
    } catch (error) {
        // Error is already handled in apiCall
    }
}

async function showPollResults(poll) {
    try {
        const data = await apiCall(`/api/polls/${poll.id}/results`);
        
        let resultsHtml = `
            <p>Total votes: ${data.total_votes}</p>
            <div class="chart-container">
        `;
        
        data.results.forEach((count, index) => {
            const percentage = data.total_votes > 0 ? (count / data.total_votes) * 100 : 0;
            resultsHtml += `
                <div class="chart-bar">
                    <div class="chart-label">${poll.options[index]}</div>
                    <div class="chart-bar-inner">
                        <div class="chart-bar-fill" style="width: ${percentage}%">
                            ${count} (${percentage.toFixed(1)}%)
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsHtml += '</div>';
        modalBody.innerHTML = resultsHtml;
    } catch (error) {
        modalBody.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

function showCreatePollForm() {
    modalTitle.textContent = 'Create New Poll';
    modalBody.innerHTML = `
        <form onsubmit="createPoll(event)">
            <input type="text" id="pollQuestion" placeholder="Question" required>
            <div id="pollOptions">
                <input type="text" placeholder="Option 1" required>
                <input type="text" placeholder="Option 2" required>
            </div>
            <button type="button" class="btn btn-secondary" onclick="addPollOption()">Add Option</button>
            <input type="datetime-local" id="pollClosingDate" required>
            <button type="submit" class="btn btn-primary">Create Poll</button>
        </form>
    `;
    pollModal.style.display = 'flex';
}

function addPollOption() {
    const optionsContainer = document.getElementById('pollOptions');
    const optionCount = optionsContainer.children.length;
    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.placeholder = `Option ${optionCount + 1}`;
    newOption.required = true;
    optionsContainer.appendChild(newOption);
}

async function createPoll(event) {
    event.preventDefault();
    const question = document.getElementById('pollQuestion').value;
    const closingDate = document.getElementById('pollClosingDate').value;
    
    const optionInputs = document.getElementById('pollOptions').getElementsByTagName('input');
    const options = Array.from(optionInputs).map(input => input.value).filter(opt => opt.trim() !== '');
    
    if (options.length < 2) {
        showError('At least 2 options are required');
        return;
    }
    
    try {
        await apiCall('/api/polls', {
            method: 'POST',
            body: JSON.stringify({ question, options, closing_date: closingDate })
        });
        
        showSuccess('Poll created successfully!');
        pollModal.style.display = 'none';
        await loadPolls();
    } catch (error) {
        // Error is already handled in apiCall
    }
}

function showEditPollForm(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    modalTitle.textContent = 'Edit Poll';
    
    let optionsHtml = '';
    poll.options.forEach((option, index) => {
        optionsHtml += `<input type="text" value="${option}" placeholder="Option ${index + 1}" required>`;
    });
    
    const closingDate = new Date(poll.closing_date);
    const formattedDate = closingDate.toISOString().slice(0, 16);
    
    modalBody.innerHTML = `
        <form onsubmit="updatePoll(event, ${poll.id})">
            <input type="text" id="editPollQuestion" value="${poll.question}" required>
            <div id="editPollOptions">
                ${optionsHtml}
            </div>
            <button type="button" class="btn btn-secondary" onclick="addEditPollOption()">Add Option</button>
            <input type="datetime-local" id="editPollClosingDate" value="${formattedDate}" required>
            <div>
                <input type="checkbox" id="editPollIsClosed" ${poll.is_closed ? 'checked' : ''}>
                <label for="editPollIsClosed">Close poll</label>
            </div>
            <button type="submit" class="btn btn-primary">Update Poll</button>
        </form>
    `;
    
    pollModal.style.display = 'flex';
}

function addEditPollOption() {
    const optionsContainer = document.getElementById('editPollOptions');
    const optionCount = optionsContainer.children.length;
    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.placeholder = `Option ${optionCount + 1}`;
    newOption.required = true;
    optionsContainer.appendChild(newOption);
}

async function updatePoll(event, pollId) {
    event.preventDefault();
    const question = document.getElementById('editPollQuestion').value;
    const closingDate = document.getElementById('editPollClosingDate').value;
    const isClosed = document.getElementById('editPollIsClosed').checked;
    
    const optionInputs = document.getElementById('editPollOptions').getElementsByTagName('input');
    const options = Array.from(optionInputs).map(input => input.value).filter(opt => opt.trim() !== '');
    
    if (options.length < 2) {
        showError('At least 2 options are required');
        return;
    }
    
    try {
        await apiCall(`/api/polls/${pollId}`, {
            method: 'PUT',
            body: JSON.stringify({ question, options, closing_date: closingDate, is_closed: isClosed })
        });
        
        showSuccess('Poll updated successfully!');
        pollModal.style.display = 'none';
        await loadPolls();
    } catch (error) {
        // Error is already handled in apiCall
    }
}

async function deletePoll(pollId) {
    if (!confirm('Are you sure you want to delete this poll?')) return;
    
    try {
        await apiCall(`/api/polls/${pollId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Poll deleted successfully!');
        await loadPolls();
    } catch (error) {
        // Error is already handled in apiCall
    }
}

async function closePoll(pollId) {
    try {
        await apiCall(`/api/polls/${pollId}`, {
            method: 'PUT',
            body: JSON.stringify({ is_closed: true })
        });
        
        showSuccess('Poll closed successfully!');
        await loadPolls();
    } catch (error) {
        // Error is already handled in apiCall
    }
}

// Utility functions
function showError(message) {
    // Create a temporary error message display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 3000);
}

function showSuccess(message) {
    // Create a temporary success message display
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '1001';
    successDiv.style.padding = '10px 15px';
    successDiv.style.borderRadius = '4px';
    successDiv.style.backgroundColor = '#28a745';
    successDiv.style.color = 'white';
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}
function showVotingStats(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    modalTitle.textContent = `Voting Statistics: ${poll.question}`;
    
    // Show loading message
    modalBody.innerHTML = '<p>Loading statistics...</p>';
    pollModal.style.display = 'flex';
    
    // Fetch voting data
    fetch(`/api/polls/${pollId}/stats`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                modalBody.innerHTML = `<p class="error">${data.error}</p>`;
                return;
            }
            
            let statsHtml = `
                <p><strong>Total Votes:</strong> ${data.total_votes}</p>
                <p><strong>Poll Status:</strong> ${data.poll.is_closed ? 'Closed' : 'Open'}</p>
                <div class="chart-container">
            `;
            
            // Show results for each option
            data.results.forEach((count, index) => {
                const percentage = data.total_votes > 0 ? (count / data.total_votes) * 100 : 0;
                statsHtml += `
                    <div class="chart-bar">
                        <div class="chart-label">${data.poll.options[index]}</div>
                        <div class="chart-bar-inner">
                            <div class="chart-bar-fill" style="width: ${percentage}%">
                                ${count} (${percentage.toFixed(1)}%)
                            </div>
                        </div>
                    </div>
                `;
            });
            
            statsHtml += `</div>`;
            
            // Show individual votes if available
            if (data.vote_details && data.vote_details.length > 0) {
                statsHtml += `
                    <h3>Individual Votes</h3>
                    <div class="vote-details">
                        <table>
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Username</th>
                                    <th>Voted For</th>
                                    <th>Vote Time</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                data.vote_details.forEach(vote => {
                    statsHtml += `
                        <tr>
                            <td>${vote.user_id}</td>
                            <td>${vote.username}</td>
                            <td>${data.poll.options[vote.option_index]}</td>
                            <td>${new Date(vote.vote_time).toLocaleString()}</td>
                        </tr>
                    `;
                });
                
                statsHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            modalBody.innerHTML = statsHtml;
        })
        .catch(error => {
            modalBody.innerHTML = `<p class="error">Error loading statistics: ${error.message}</p>`;
        });
}

// Initialize app
async function initApp() {
    try {
        const userData = await apiCall('/api/me');
        currentUser = userData;
    } catch (error) {
        // Not logged in, which is fine
    }
    
    renderAuthSection();
    
    if (currentUser) {
        await loadPolls();
    } else {
        mainContent.innerHTML = '<p>Please login to continue.</p>';
    }
}

// Start the app
initApp();