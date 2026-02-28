// ===== API URL - Works on both local and production =====
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

// ===== EXPENSES ARRAY (will be populated from database) =====
let expenses = [];

// ===== CONSTANTS =====
let MONTHLY_BUDGET = 2500; // Default, will be loaded from database

// ===== SUBCATEGORY MAPPING =====
const subcategoriesByCategory = {
    'Food': ['Restaurant', 'Groceries', 'Take-out', 'Snacks', 'Cafe', 'Other Food'],
    'Transport': ['Gas', 'Ride Share', 'Public Transit', 'Parking', 'Maintenance', 'Other Transport'],
    'Shopping': ['Clothing', 'Electronics', 'Home Goods', 'Personal Care', 'Other Shopping'],
    'Entertainment': ['Movies', 'Gaming', 'Music', 'Sports', 'Streaming', 'Other Entertainment'],
    'Bills': ['Electricity', 'Water', 'Internet', 'Phone', 'Rent', 'Insurance', 'Other Bills'],
    'Other': ['General', 'Miscellaneous']
};

// ===== DATE HANDLING =====
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Function to set current month to the month of the most recent expense
function setMonthFromLatestExpense() {
    if (expenses.length > 0) {
        // Sort expenses by date (newest first)
        const sortedExpenses = [...expenses].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Get the most recent expense date
        const latestExpense = sortedExpenses[0];
        const latestDate = new Date(latestExpense.date);
        
        // Set current month/year to match the latest expense
        currentMonth = latestDate.getMonth();
        currentYear = latestDate.getFullYear();
        
        console.log('Set to month of latest expense:', monthNames[currentMonth], currentYear);
    }
}

// ===== LOCK STATE =====
let isLocked = true; // Budget starts locked

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Add lock icon to budget card header
    addLockIcon();
    
    // Load data from database
    await loadBudget();
    await loadExpenses();
    
    // ADD THIS LINE HERE:
    setMonthFromLatestExpense();  // This will set the month to match your data
    
    updateMonthDisplay();
    updateDashboard();
    setupEventListeners();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
});

// ===== LOAD BUDGET FROM DATABASE =====
async function loadBudget() {
    try {
        const response = await fetch(`${API_URL}/budget`);
        if (response.ok) {
            const data = await response.json();
            MONTHLY_BUDGET = parseFloat(data.amount) || 2500;
            console.log('Budget loaded:', MONTHLY_BUDGET);
        } else {
            // If no budget in DB, use default
            console.log('Using default budget');
            MONTHLY_BUDGET = 2500;
        }
    } catch (error) {
        console.error('Error loading budget:', error);
        MONTHLY_BUDGET = 2500; // fallback to default
    }
}

// ===== LOAD EXPENSES FROM DATABASE =====
async function loadExpenses() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        if (response.ok) {
            const data = await response.json();

            // Ensure amount is a number and date is properly parsed
            expenses = data.map(expense => ({
                id: expense.id,
                amount: parseFloat(expense.amount),
                category: expense.category,
                subcategory: expense.subcategory || null,
                date: expense.date // string like "2026-02-28"
            }));
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        expenses = []; // fallback empty array
    }
}

// ===== ADD LOCK ICON TO BUDGET CARD =====
function addLockIcon() {
    const budgetCardHeader = document.querySelector('.card:first-child .card-header');
    if (!budgetCardHeader) return;
    
    // Create lock container
    const lockContainer = document.createElement('div');
    lockContainer.className = 'lock-container';
    lockContainer.style.display = 'flex';
    lockContainer.style.alignItems = 'center';
    lockContainer.style.gap = '10px';
    
    // Move the budget amount into the container
    const budgetAmount = document.getElementById('budgetAmount');
    budgetAmount.parentNode.removeChild(budgetAmount);
    
    // Create lock icon
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock locked'; // Start locked
    lockIcon.setAttribute('data-locked', 'true');
    
    // Assemble
    lockContainer.appendChild(budgetAmount);
    lockContainer.appendChild(lockIcon);
    budgetCardHeader.appendChild(lockContainer);
    
    // Add click event to lock
    lockIcon.addEventListener('click', toggleLock);
}

// ===== TOGGLE LOCK =====
function toggleLock(event) {
    const lockIcon = event.currentTarget;
    const budgetAmount = document.getElementById('budgetAmount');
    
    if (lockIcon.classList.contains('locked')) {
        // Unlock
        lockIcon.classList.remove('locked');
        lockIcon.classList.add('unlocked');
        lockIcon.setAttribute('data-locked', 'false');
        
        // Make budget amount editable (add underline)
        budgetAmount.classList.add('editable');
        
        // Add click to edit
        budgetAmount.addEventListener('click', editBudget);
    } else {
        // Lock
        lockIcon.classList.remove('unlocked');
        lockIcon.classList.add('locked');
        lockIcon.setAttribute('data-locked', 'true');
        
        // Remove editable styling
        budgetAmount.classList.remove('editable');
        
        // Remove edit listener
        budgetAmount.removeEventListener('click', editBudget);
    }
}

// ===== EDIT BUDGET =====
async function editBudget() {
    const budgetAmount = document.getElementById('budgetAmount');
    const lockIcon = document.querySelector('.lock');
    
    // Only allow editing if unlocked
    if (lockIcon.getAttribute('data-locked') === 'true') return;
    
    // Get current value (remove commas)
    const currentValue = parseFloat(budgetAmount.textContent.replace(/,/g, ''));
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.inputMode = 'decimal'; // mobile shows numeric keyboard
    input.pattern = "[0-9]*[.]?[0-9]*"; // optional validation hint
    input.className = 'budget-input';
    
    // Replace span with input
    budgetAmount.style.display = 'none';
    budgetAmount.parentNode.insertBefore(input, budgetAmount.nextSibling);
    
    // Focus input
    input.focus();
    
    // Handle when editing is done
    async function finishEditing() {
        const newValue = parseFloat(input.value);
        
        if (!isNaN(newValue) && newValue >= 0) {
            try {
                // Update budget in database
                const response = await fetch(`${API_URL}/budget`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ budget: newValue })
                });
                
                if (response.ok) {
                    // Update local budget
                    MONTHLY_BUDGET = newValue;
                    
                    // Update display with 2 decimal places
                    budgetAmount.textContent = newValue.toFixed(2);
                    
                    // Update dashboard with new budget
                    updateDashboard();
                }
            } catch (error) {
                console.error('Error updating budget:', error);
                alert('Failed to update budget. Please try again.');
            }
        }
        
        // Remove input and show span again
        input.remove();
        budgetAmount.style.display = 'inline';
    }
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishEditing();
        }
    });
    
    // Handle blur (clicking away)
    input.addEventListener('blur', finishEditing);
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('category').addEventListener('change', updateSubcategoryDropdown);
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else {
            currentMonth--;
        }
        updateMonthDisplay();
        updateDashboard();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else {
            currentMonth++;
        }
        updateMonthDisplay();
        updateDashboard();
    });
}

// ===== UPDATE SUBCATEGORY DROPDOWN =====
function updateSubcategoryDropdown() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    const selectedCategory = categorySelect.value;
    
    subcategorySelect.innerHTML = '';
    
    if (selectedCategory && subcategoriesByCategory[selectedCategory]) {
        if (selectedCategory === 'Other') {
            subcategorySelect.disabled = false;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.selected = true;
            defaultOption.textContent = '-- No subcategory (optional) --';
            subcategorySelect.appendChild(defaultOption);
            
            subcategoriesByCategory[selectedCategory].forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat;
                option.textContent = subcat;
                subcategorySelect.appendChild(option);
            });
        } else {
            subcategorySelect.disabled = false;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = 'Select subcategory';
            subcategorySelect.appendChild(defaultOption);
            
            subcategoriesByCategory[selectedCategory].forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat;
                option.textContent = subcat;
                subcategorySelect.appendChild(option);
            });
        }
    } else {
        subcategorySelect.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.selected = true;
        option.textContent = 'Select category first';
        subcategorySelect.appendChild(option);
    }
}

// ===== UPDATE MONTH DISPLAY =====
function updateMonthDisplay() {
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
}

// ===== UPDATE DASHBOARD =====
function updateDashboard() {
    // Filter expenses for current month/year
    const monthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date); // Just use the date as-is
    return expenseDate.getMonth() === currentMonth && 
           expenseDate.getFullYear() === currentYear;
});

    // Total spent for the month
    const totalSpent = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Budget left
    const budgetLeft = MONTHLY_BUDGET - totalSpent;

    // Percentages
    const spentPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, (totalSpent / MONTHLY_BUDGET) * 100) : 0;
    const budgetPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, Math.max(0, (budgetLeft / MONTHLY_BUDGET) * 100)) : 0;

    // Update dashboard numbers
    document.getElementById('budgetAmount').textContent = MONTHLY_BUDGET.toFixed(2);
    document.getElementById('spentAmount').textContent = totalSpent.toFixed(2);
    document.getElementById('budgetLeft').textContent = `${budgetLeft.toFixed(2)} left`;
    document.getElementById('budgetPercentage').textContent = `${budgetPercentage.toFixed(1)}% remaining`;
    document.getElementById('spentPercentage').textContent = `${spentPercentage.toFixed(1)}% of budget used`;

    // Update progress bars
    document.getElementById('budgetBar').style.width = `${budgetPercentage}%`;
    document.getElementById('spentBar').style.width = `${spentPercentage}%`;

    // Update expense list
    updateExpensesList(monthExpenses);

    // Update totals and count
    document.getElementById('monthlyTotal').textContent = totalSpent.toFixed(2);
    document.getElementById('expenseCount').textContent = 
        `${monthExpenses.length} item${monthExpenses.length !== 1 ? 's' : ''}`;
}

// ===== UPDATE EXPENSES LIST =====
function updateExpensesList(monthExpenses) {
    const expensesList = document.getElementById('expensesList');
    
    if (monthExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>No expenses yet for ${monthNames[currentMonth]}. Add your first expense above!</p>
            </div>
        `;
        return;
    }
    
    const sortedExpenses = [...monthExpenses].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
    );
    
    expensesList.innerHTML = sortedExpenses.map(expense => {
        let categoryDisplay = expense.category;
        if (expense.subcategory) {
            categoryDisplay = `${expense.category} | ${expense.subcategory}`;
        }
        
        return `
        <div class="expense-item" data-id="${expense.id}">
            <!-- Top row: Category and subcategory -->
            <div class="expense-row">
                <span class="expense-category">
                    ${getCategoryEmoji(expense.category)} ${categoryDisplay}
                </span>
            </div>
            <!-- Bottom row: Amount and Date side by side -->
            <div class="expense-row amount-date-row">
                <span class="expense-amount">${expense.amount.toFixed(2)}</span>
                <span class="expense-date">${formatDate(expense.date)}</span>
                <button class="delete-expense" onclick="deleteExpense(${expense.id})">✕</button>
            </div>
        </div>
    `}).join('');
}

// ===== ADD NEW EXPENSE =====
async function addExpense(event) {
    event.preventDefault();
    
    const newExpense = {
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        subcategory: document.getElementById('subcategory').value || null,
        date: document.getElementById('date').value
    };
    
    if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (newExpense.category !== 'Other' && !newExpense.subcategory) {
        alert('Please select a subcategory');
        return;
    }
    
    try {
        // Save to database
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newExpense)
        });
        
        if (response.ok) {
            const savedExpense = await response.json();
            expenses.push(savedExpense);
            
            // Clear form
            document.getElementById('expenseForm').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            
            const subcategorySelect = document.getElementById('subcategory');
            subcategorySelect.disabled = true;
            subcategorySelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
            
            updateDashboard();
        } else {
            alert('Failed to add expense. Please try again.');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please check your connection.');
    }
}

// ===== DELETE EXPENSE =====
async function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
        try {
            const response = await fetch(`${API_URL}/expenses/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                expenses = expenses.filter(expense => expense.id !== id);
                updateDashboard();
            } else {
                alert('Failed to delete expense. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense. Please check your connection.');
        }
    }
}

window.deleteExpense = deleteExpense;

// ===== HELPER FUNCTIONS =====
function getCategoryEmoji(category) {
    const emojis = {
        'Food': '🍔',
        'Transport': '🚗',
        'Shopping': '🛒',
        'Entertainment': '🎬',
        'Bills': '💡',
        'Other': '📦'
    };
    return emojis[category] || '📌';
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
}