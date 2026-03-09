// ===== IMPORT SUPABASE =====
import { supabase } from '/supabase.js'

// ===== CHECK SESSION IMMEDIATELY =====
console.log('Main page loading...');

const { data: { session }, error } = await supabase.auth.getSession();

if (error) {
    console.error('Session error:', error);
    window.location.href = '/login/login.html';
}

if (!session) {
    console.log('No session found, redirecting to login');
    window.location.href = '/login/login.html';
} else {
    console.log('Session found for:', session.user.email);
    initializeApp(session.user);
}

// ===== EXPENSES ARRAY =====
let expenses = [];

// ===== SAVINGS TARGETS ARRAY =====
let savingsTargets = [];

// ===== CONSTANTS =====
let MONTHLY_BUDGET = 2500;

// ===== SUBCATEGORY MAPPING =====
const subcategoriesByCategory = {
    'Food': ['Restaurant', 'Groceries', 'Take-out', 'Snacks', 'Cafe', 'Other Food'],
    'Transport': ['Private-Vehicle', 'Public Transit', 'Pay-Parking', 'Rental', 'Other Transport'],
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

// ===== STATE =====
let currentTab = 'home';
let isModalOpen = false;

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
    return new Date(dateString).toLocaleDateString('en-GB');
}

// ===== SET MONTH FROM LATEST EXPENSE =====
function setMonthFromLatestExpense() {
    if (expenses.length > 0) {
        const sortedExpenses = [...expenses].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        const latestExpense = sortedExpenses[0];
        const latestDate = new Date(latestExpense.date);
        
        currentMonth = latestDate.getMonth();
        currentYear = latestDate.getFullYear();
    }
}

// ===== UPDATE MONTH DISPLAY =====
function updateMonthDisplay() {
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
}

// ===== CALCULATE SAVINGS =====
function calculateSavings() {
    const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });
    
    const totalSpent = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const savings = MONTHLY_BUDGET - totalSpent;
    return Math.max(0, savings);
}

// ===== UPDATE SAVINGS TARGETS LIST =====
function updateSavingsTargetsList() {
    const goalsList = document.getElementById('goalsList');
    
    if (savingsTargets.length === 0) {
        goalsList.innerHTML = `
            <div class="empty-state">
                <p>No savings targets yet.</p>
            </div>
        `;
        return;
    }
    
    goalsList.innerHTML = savingsTargets.map(target => {
        const progress = (target.saved / target.target) * 100;
        const remaining = target.target - target.saved;
        
        return `
        <div class="goal-item" data-id="${target.id}">
            <div class="goal-header">
                <span class="goal-name">${target.name}</span>
                <span class="goal-amount">₱${target.saved.toFixed(2)} / ₱${target.target.toFixed(2)}</span>
            </div>
            <div class="goal-progress">
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="goal-stats">
                    <span>${progress.toFixed(1)}% complete</span>
                    <span>₱${remaining.toFixed(2)} left</span>
                </div>
            </div>
            <div class="goal-source">
                <i class="fa-solid fa-filter"></i> Saving from: ${target.source || 'All categories'}
            </div>
        </div>
    `}).join('');
}

// ===== UPDATE EXPENSES LIST =====
function updateExpensesList(monthExpenses) {
    const expensesList = document.getElementById('expensesList');
    
    if (monthExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>No expenses yet for ${monthNames[currentMonth]}!</p>
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
        
        const paymentEmoji = {
            'Cash': '💵',
            'Credit Card': '💳',
            'Debit Card': '💳',
            'Bank Transfer': '🏦',
            'E-Wallet': '📱',
            'Other': '📦'
        }[expense.payment_method] || '💳';
        
        return `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-row">
                <span class="expense-category">
                    ${getCategoryEmoji(expense.category)} ${categoryDisplay}
                </span>
                <span class="payment-method-badge" title="${expense.payment_method}">
                    ${paymentEmoji}
                </span>
            </div>
            <div class="expense-row amount-date-row">
                <span class="expense-amount">₱${expense.amount.toFixed(2)}</span>
                <span class="expense-date">${formatDate(expense.date)}</span>
                <button class="delete-expense" onclick="deleteExpense(${expense.id})">✕</button>
            </div>
        </div>
    `}).join('');
}

// ===== UPDATE DASHBOARD =====
function updateDashboard() {
    const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });

    const totalSpent = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const budgetLeft = MONTHLY_BUDGET - totalSpent;
    const savings = calculateSavings();
    const spentPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, (totalSpent / MONTHLY_BUDGET) * 100) : 0;
    const budgetPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, Math.max(0, (budgetLeft / MONTHLY_BUDGET) * 100)) : 0;

    document.getElementById('budgetAmount').textContent = MONTHLY_BUDGET.toFixed(2);
    document.getElementById('spentAmount').textContent = totalSpent.toFixed(2);
    document.getElementById('budgetLeft').textContent = `${budgetLeft.toFixed(2)} left`;
    document.getElementById('budgetPercentage').textContent = `${budgetPercentage.toFixed(1)}% remaining`;
    document.getElementById('spentPercentage').textContent = `${spentPercentage.toFixed(1)}% of budget used`;
    document.getElementById('budgetBar').style.width = `${budgetPercentage}%`;
    document.getElementById('spentBar').style.width = `${spentPercentage}%`;
    
    document.getElementById('savingsAmount').textContent = `${savings.toFixed(2)}`;

    updateExpensesList(monthExpenses);
    updateSavingsTargetsList();
    document.getElementById('monthlyTotal').textContent = totalSpent.toFixed(2);
    document.getElementById('expenseCount').textContent = 
        `${monthExpenses.length} item${monthExpenses.length !== 1 ? 's' : ''}`;
}

// ===== LOAD BUDGET FROM SUPABASE =====
async function loadBudget(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('monthly_budget')
            .eq('id', userId)
            .single();
        
        if (error && error.code === 'PGRST116') {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ 
                    id: userId, 
                    monthly_budget: 2500,
                    first_name: 'User',
                    last_name: 'Name',
                    email: session?.user?.email || ''
                }]);
            
            if (insertError) throw insertError;
            MONTHLY_BUDGET = 2500;
        } else if (data) {
            MONTHLY_BUDGET = parseFloat(data.monthly_budget);
        }
    } catch (error) {
        console.error('Error loading budget:', error);
    }
}

// ===== LOAD EXPENSES FROM SUPABASE =====
async function loadExpenses(userId) {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        expenses = data.map(expense => ({
            id: expense.id,
            amount: parseFloat(expense.amount),
            category: expense.category,
            subcategory: expense.subcategory || null,
            payment_method: expense.payment_method || 'Cash',
            date: expense.date
        }));
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

// ===== LOAD SAVINGS TARGETS FROM SUPABASE =====
async function loadSavingsTargets(userId) {
    try {
        const { data, error } = await supabase
            .from('savings_targets')
            .select('*')
            .eq('user_id', userId);
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            savingsTargets = data.map(goal => ({
                id: goal.id,
                name: goal.name,
                target: parseFloat(goal.target_amount),
                saved: parseFloat(goal.current_amount) || 0,
                type: goal.target_type,
                source: goal.source_category
            }));
        }
    } catch (error) {
        console.error('Error loading savings targets:', error);
    }
}

// ===== ADD LOCK ICON =====
function addLockIcon() {
    const budgetCardHeader = document.querySelector('#homeTab .card:nth-child(2) .card-header');
    if (!budgetCardHeader) return;
    
    const lockContainer = document.createElement('div');
    lockContainer.className = 'lock-container';
    
    const budgetAmount = document.getElementById('budgetAmount');
    budgetAmount.parentNode.removeChild(budgetAmount);
    
    const lockIcon = document.createElement('i');
    lockIcon.className = 'fa-solid fa-lock lock-icon locked';
    lockIcon.setAttribute('data-locked', 'true');
    
    lockContainer.appendChild(budgetAmount);
    lockContainer.appendChild(lockIcon);
    budgetCardHeader.appendChild(lockContainer);
    
    lockIcon.addEventListener('click', toggleLock);
}

// ===== TOGGLE LOCK =====
function toggleLock(event) {
    const lockIcon = event.currentTarget;
    const budgetAmount = document.getElementById('budgetAmount');
    
    if (lockIcon.classList.contains('locked')) {
        lockIcon.classList.remove('fa-lock', 'locked');
        lockIcon.classList.add('fa-unlock', 'unlocked');
        lockIcon.setAttribute('data-locked', 'false');
        budgetAmount.classList.add('editable');
        budgetAmount.addEventListener('click', editBudget);
    } else {
        lockIcon.classList.remove('fa-unlock', 'unlocked');
        lockIcon.classList.add('fa-lock', 'locked');
        lockIcon.setAttribute('data-locked', 'true');
        budgetAmount.classList.remove('editable');
        budgetAmount.removeEventListener('click', editBudget);
    }
}

// ===== EDIT BUDGET =====
async function editBudget() {
    const budgetAmount = document.getElementById('budgetAmount');
    const lockIcon = document.querySelector('.lock-icon');
    
    if (lockIcon.getAttribute('data-locked') === 'true') return;
    
    const currentValue = parseFloat(budgetAmount.textContent.replace(/,/g, ''));
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.inputMode = 'decimal';
    input.className = 'budget-input';
    
    budgetAmount.style.display = 'none';
    budgetAmount.parentNode.insertBefore(input, budgetAmount.nextSibling);
    input.focus();
    
    async function finishEditing() {
        const newValue = parseFloat(input.value);
        
        if (!isNaN(newValue) && newValue >= 0) {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert('Session expired. Please log in again.');
                window.location.href = '/login/login.html';
                return;
            }
            
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ monthly_budget: newValue })
                    .eq('id', session.user.id);
                
                if (error) throw error;
                
                MONTHLY_BUDGET = newValue;
                budgetAmount.textContent = newValue.toFixed(2);
                updateDashboard();
            } catch (error) {
                console.error('Error updating budget:', error);
                alert('Failed to update budget');
            }
        }
        
        input.remove();
        budgetAmount.style.display = 'inline';
    }
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') finishEditing();
    });
    
    input.addEventListener('blur', finishEditing);
}

// ===== CREATE NEW SAVINGS TARGET (COMPACT) =====
async function createNewGoalCompact() {
    const goalTo = document.getElementById('goalToCompact').value;
    const goalFrom = document.getElementById('goalFromCompact').value;
    const goalAmount = document.getElementById('goalAmountCompact').value;
    
    // Validation
    if (!goalTo || !goalFrom || !goalAmount) {
        alert('Please fill in all fields');
        return;
    }
    
    const amount = parseFloat(goalAmount);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('Please log in again');
        window.location.href = '/login/login.html';
        return;
    }
    
    // Prepare the data object
    const newTarget = {
        user_id: session.user.id,
        name: `${goalTo} (from ${goalFrom})`,
        target_amount: amount,
        current_amount: 0,
        target_type: goalTo,
        source_category: goalFrom,
        created_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase
            .from('savings_targets')
            .insert([newTarget])
            .select();
        
        if (error) throw error;
        
        savingsTargets.push({
            id: data[0].id,
            name: `${goalTo} (from ${goalFrom})`,
            target: amount,
            saved: 0,
            type: goalTo,
            source: goalFrom
        });
        
        // Clear form
        document.getElementById('goalToCompact').value = '';
        document.getElementById('goalFromCompact').value = '';
        document.getElementById('goalAmountCompact').value = '';
        
        updateSavingsTargetsList();
        
    } catch (error) {
        console.error('Error adding savings target:', error);
        alert('Failed to add savings target');
    }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Form submissions
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('category').addEventListener('change', updateSubcategoryDropdown);
    
    // Compact goal form
    document.getElementById('createGoalCompactBtn').addEventListener('click', createNewGoalCompact);
    
    // Month navigation
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

// ===== ADD NEW EXPENSE =====
async function addExpense(event) {
    event.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('Please log in again');
        window.location.href = '/login/login.html';
        return;
    }
    
    const newExpense = {
        user_id: session.user.id,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        subcategory: document.getElementById('subcategory').value || null,
        payment_method: document.getElementById('paymentMethod').value,
        date: document.getElementById('date').value
    };
    
    if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('expenses')
            .insert([newExpense])
            .select();
        
        if (error) throw error;
        
        expenses.push(data[0]);
        
        // Reset form
        document.getElementById('expenseForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentMethod').value = '';
        
        const subcategorySelect = document.getElementById('subcategory');
        subcategorySelect.disabled = true;
        subcategorySelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
        
        // Close modal
        closeAddExpenseModal();
        
        updateDashboard();
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense');
    }
}

// ===== DELETE EXPENSE =====
async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('Please log in again');
        window.location.href = '/login/login.html';
        return;
    }
    
    try {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        expenses = expenses.filter(expense => expense.id !== id);
        updateDashboard();
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
    }
}

window.deleteExpense = deleteExpense;

// ===== DISPLAY USER NAME =====
async function displayUserName(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        const userNameElement = document.getElementById('userNameDisplay');
        if (data) {
            const firstName = data.first_name || 'User';
            const lastName = data.last_name ? ` ${data.last_name}` : '';
            userNameElement.innerHTML = `
                <i class="fa-regular fa-user"></i>
                <span class="full-name">${firstName}${lastName}</span>
            `;
        }
    } catch (error) {
        console.error('Error loading user name:', error);
        document.getElementById('userNameDisplay').innerHTML = `
            <i class="fa-regular fa-user"></i>
            <span class="full-name">User</span>
        `;
    }
}

// ===== LOGOUT FUNCTION =====
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '/login/login.html';
        });
    }
}

// ===== TAB NAVIGATION =====
function setupTabNavigation() {
    const homeBtn = document.getElementById('homeTabBtn');
    const budgetsBtn = document.getElementById('budgetsTabBtn');
    const addBtn = document.getElementById('addTabBtn');
    const savingsBtn = document.getElementById('savingsTabBtn');
    const listBtn = document.getElementById('listTabBtn');
    
    // Get all tab content divs
    const homeTab = document.getElementById('homeTab');
    const budgetsTab = document.getElementById('budgetsTab');
    const savingsTab = document.getElementById('savingsTab');
    const listTab = document.getElementById('listTab');
    
    // Function to switch tabs
    function switchTab(tabId) {
        // Hide all tabs
        homeTab.classList.remove('active-tab');
        budgetsTab.classList.remove('active-tab');
        savingsTab.classList.remove('active-tab');
        listTab.classList.remove('active-tab');
        
        // Show selected tab
        document.getElementById(tabId).classList.add('active-tab');
        
        // Update active button state
        document.querySelectorAll('.footer-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    homeBtn.addEventListener('click', () => {
        switchTab('homeTab');
        homeBtn.classList.add('active');
        currentTab = 'home';
    });
    
    budgetsBtn.addEventListener('click', () => {
        switchTab('budgetsTab');
        budgetsBtn.classList.add('active');
        currentTab = 'budgets';
    });
    
    addBtn.addEventListener('click', () => {
        // Open modal instead of switching tab
        openAddExpenseModal();
    });
    
    savingsBtn.addEventListener('click', () => {
        switchTab('savingsTab');
        savingsBtn.classList.add('active');
        currentTab = 'savings';
        updateSavingsTargetsList();
    });
    
    listBtn.addEventListener('click', () => {
        switchTab('listTab');
        listBtn.classList.add('active');
        currentTab = 'list';
        updateDashboard();
    });
}

// ===== MODAL FUNCTIONS =====
function openAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    modal.style.display = 'flex';
    isModalOpen = true;
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function closeAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    modal.style.display = 'none';
    isModalOpen = false;
}

// ===== INITIALIZE APP =====
async function initializeApp(user) {
    addLockIcon();
    await loadBudget(user.id);
    await loadExpenses(user.id);
    await loadSavingsTargets(user.id);
    await displayUserName(user.id);
    setMonthFromLatestExpense();
    updateMonthDisplay();
    updateDashboard();
    setupEventListeners();
    setupTabNavigation();
    
    // Set up modal close button
    document.getElementById('cancelAddExpense').addEventListener('click', closeAddExpenseModal);
    
    // Close modal when clicking overlay
    document.getElementById('addExpenseModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('addExpenseModal')) {
            closeAddExpenseModal();
        }
    });
    
    setupLogoutButton();
}