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
    // Initialize app immediately
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
    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) {
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
}

// ===== CALCULATE SAVINGS =====
function calculateSavings() {
    // Set savings to 0 for now
    return 0;
}

// ===== UPDATE SAVINGS TARGETS LIST =====
function updateSavingsTargetsList() {
    const goalsList = document.getElementById('goalsList');
    if (!goalsList) return;
    
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
    if (!expensesList) return;
    
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
    const savings = calculateSavings(); // This now returns 0
    const spentPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, (totalSpent / MONTHLY_BUDGET) * 100) : 0;
    const budgetPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, Math.max(0, (budgetLeft / MONTHLY_BUDGET) * 100)) : 0;
    
    // Update budget amount
    const budgetAmountEl = document.getElementById('budgetAmount');
    if (budgetAmountEl) {
        budgetAmountEl.textContent = MONTHLY_BUDGET.toFixed(2);
    }
    
    // Update spent amount
    const spentAmountEl = document.getElementById('spentAmount');
    if (spentAmountEl) {
        spentAmountEl.textContent = totalSpent.toFixed(2);
    }
    
    // Update budget left
    const budgetLeftEl = document.getElementById('budgetLeft');
    if (budgetLeftEl) {
        budgetLeftEl.textContent = `${budgetLeft.toFixed(2)} left`;
    }
    
    // Update budget percentage
    const budgetPercentageEl = document.getElementById('budgetPercentage');
    if (budgetPercentageEl) {
        budgetPercentageEl.textContent = `${budgetPercentage.toFixed(1)}% remaining`;
    }
    
    // Update spent percentage
    const spentPercentageEl = document.getElementById('spentPercentage');
    if (spentPercentageEl) {
        spentPercentageEl.textContent = `${spentPercentage.toFixed(1)}% of budget used`;
    }
    
    // Update progress bars
    const budgetBarEl = document.getElementById('budgetBar');
    if (budgetBarEl) {
        budgetBarEl.style.width = `${budgetPercentage}%`;
    }
    
    const spentBarEl = document.getElementById('spentBar');
    if (spentBarEl) {
        spentBarEl.style.width = `${spentPercentage}%`;
    }
    
    // Update savings display (set to 0)
    const savingsAmountEl = document.getElementById('savingsAmount');
    if (savingsAmountEl) {
        savingsAmountEl.textContent = '0.00';
    }
    
    // Update savings progress (set to 0)
    const savingsProgressBarEl = document.getElementById('savingsProgressBar');
    if (savingsProgressBarEl) {
        savingsProgressBarEl.style.width = '0%';
    }
    
    const savingsProgressTextEl = document.getElementById('savingsProgressText');
    if (savingsProgressTextEl) {
        savingsProgressTextEl.textContent = '0% of goal';
    }
    
    const savingsRemainingEl = document.getElementById('savingsRemaining');
    if (savingsRemainingEl) {
        savingsRemainingEl.textContent = '₱0 left';
    }

    // Update expenses list
    updateExpensesList(monthExpenses);
    
    // Update savings targets
    updateSavingsTargetsList();
    
    // Update monthly total
    const monthlyTotalEl = document.getElementById('monthlyTotal');
    if (monthlyTotalEl) {
        monthlyTotalEl.textContent = totalSpent.toFixed(2);
    }
    
    // Update expense count
    const expenseCountEl = document.getElementById('expenseCount');
    if (expenseCountEl) {
        expenseCountEl.textContent = `${monthExpenses.length} item${monthExpenses.length !== 1 ? 's' : ''}`;
    }
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
            // No profile found, create one
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

// ===== LOCK ICON FUNCTIONS =====
function setupLockIcon() {
    const lockIcon = document.getElementById('budgetLockIcon');
    const budgetAmount = document.getElementById('budgetAmount');
    
    if (!lockIcon || !budgetAmount) return;
    
    // Set initial state
    lockIcon.setAttribute('data-locked', 'true');
    lockIcon.classList.add('locked');
    
    // Add click handler
    lockIcon.addEventListener('click', function() {
        if (this.classList.contains('locked')) {
            // Unlock
            this.classList.remove('fa-lock', 'locked');
            this.classList.add('fa-unlock', 'unlocked');
            this.setAttribute('data-locked', 'false');
            budgetAmount.classList.add('editable');
            budgetAmount.addEventListener('click', editBudget);
        } else {
            // Lock
            this.classList.remove('fa-unlock', 'unlocked');
            this.classList.add('fa-lock', 'locked');
            this.setAttribute('data-locked', 'true');
            budgetAmount.classList.remove('editable');
            budgetAmount.removeEventListener('click', editBudget);
        }
    });
}

// ===== EDIT BUDGET =====
async function editBudget() {
    const budgetAmount = document.getElementById('budgetAmount');
    const lockIcon = document.getElementById('budgetLockIcon');
    
    if (!lockIcon || lockIcon.getAttribute('data-locked') === 'true') return;
    
    const currentValue = parseFloat(budgetAmount.textContent.replace(/,/g, ''));
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.inputMode = 'decimal';
    input.className = 'budget-input';
    
    budgetAmount.style.display = 'none';
    budgetAmount.parentNode.appendChild(input);
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
        budgetAmount.style.display = 'flex';
    }
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') finishEditing();
    });
    
    input.addEventListener('blur', finishEditing);
}

// ===== CREATE NEW SAVINGS TARGET (COMPACT) =====
async function createNewGoalCompact() {
    const goalTo = document.getElementById('goalToCompact');
    const goalFrom = document.getElementById('goalFromCompact');
    const goalAmount = document.getElementById('goalAmountCompact');
    
    if (!goalTo || !goalFrom || !goalAmount) return;
    
    const goalToValue = goalTo.value;
    const goalFromValue = goalFrom.value;
    const goalAmountValue = goalAmount.value;
    
    // Validation
    if (!goalToValue || !goalFromValue || !goalAmountValue) {
        alert('Please fill in all fields');
        return;
    }
    
    const amount = parseFloat(goalAmountValue);
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
        name: `${goalToValue} (from ${goalFromValue})`,
        target_amount: amount,
        current_amount: 0,
        target_type: goalToValue,
        source_category: goalFromValue,
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
            name: `${goalToValue} (from ${goalFromValue})`,
            target: amount,
            saved: 0,
            type: goalToValue,
            source: goalFromValue
        });
        
        // Clear form
        goalTo.value = '';
        goalFrom.value = '';
        goalAmount.value = '';
        
        updateSavingsTargetsList();
        
    } catch (error) {
        console.error('Error adding savings target:', error);
        alert('Failed to add savings target');
    }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Expense form
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', addExpense);
    }
    
    // Category select
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', updateSubcategoryDropdown);
    }
    
    // Create goal button
    const createGoalBtn = document.getElementById('createGoalCompactBtn');
    if (createGoalBtn) {
        createGoalBtn.addEventListener('click', createNewGoalCompact);
    }
    
    // Month navigation
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            updateMonthDisplay();
            updateDashboard();
        });
    }
    
    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
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
}

// ===== UPDATE SUBCATEGORY DROPDOWN =====
function updateSubcategoryDropdown() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    
    if (!categorySelect || !subcategorySelect) return;
    
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
    
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const dateInput = document.getElementById('date');
    
    if (!amountInput || !categorySelect || !paymentMethodSelect || !dateInput) return;
    
    const newExpense = {
        user_id: session.user.id,
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        subcategory: subcategorySelect.value || null,
        payment_method: paymentMethodSelect.value,
        date: dateInput.value
    };
    
    if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (!newExpense.category) {
        alert('Please select a category');
        return;
    }
    
    if (!newExpense.payment_method) {
        alert('Please select a payment method');
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
        
        // Reset subcategory dropdown
        const subcatSelect = document.getElementById('subcategory');
        if (subcatSelect) {
            subcatSelect.disabled = true;
            subcatSelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
        }
        
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
        if (userNameElement && data) {
            const firstName = data.first_name || 'User';
            const lastName = data.last_name ? ` ${data.last_name}` : '';
            userNameElement.innerHTML = `
                <i class="fa-regular fa-user"></i>
                <span class="full-name">${firstName}${lastName}</span>
            `;
        }
    } catch (error) {
        console.error('Error loading user name:', error);
        const userNameElement = document.getElementById('userNameDisplay');
        if (userNameElement) {
            userNameElement.innerHTML = `
                <i class="fa-regular fa-user"></i>
                <span class="full-name">User</span>
            `;
        }
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
    
    if (!homeBtn || !budgetsBtn || !addBtn || !savingsBtn || !listBtn) {
        console.error('Tab navigation buttons not found');
        return;
    }
    
    // Function to switch tabs
    function switchTab(tabId, activeButton) {
        // Hide all tabs
        if (homeTab) homeTab.classList.remove('active-tab');
        if (budgetsTab) budgetsTab.classList.remove('active-tab');
        if (savingsTab) savingsTab.classList.remove('active-tab');
        if (listTab) listTab.classList.remove('active-tab');
        
        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active-tab');
        }
        
        // Update active button state
        document.querySelectorAll('.footer-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    homeBtn.addEventListener('click', () => {
        switchTab('homeTab', homeBtn);
        currentTab = 'home';
    });
    
    budgetsBtn.addEventListener('click', () => {
        switchTab('budgetsTab', budgetsBtn);
        currentTab = 'budgets';
    });
    
    addBtn.addEventListener('click', () => {
        // Open modal instead of switching tab
        openAddExpenseModal();
    });
    
    savingsBtn.addEventListener('click', () => {
        switchTab('savingsTab', savingsBtn);
        currentTab = 'savings';
        updateSavingsTargetsList();
    });
    
    listBtn.addEventListener('click', () => {
        switchTab('listTab', listBtn);
        currentTab = 'list';
        updateDashboard();
    });
}

// ===== MODAL FUNCTIONS =====
function openAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    isModalOpen = true;
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }
}

function closeAddExpenseModal() {
    const modal = document.getElementById('addExpenseModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    isModalOpen = false;
}

// ===== INITIALIZE APP =====
async function initializeApp(user) {
    try {
        await loadBudget(user.id);
        await loadExpenses(user.id);
        await loadSavingsTargets(user.id);
        await displayUserName(user.id);
        
        setMonthFromLatestExpense();
        updateMonthDisplay();
        updateDashboard();
        setupEventListeners();
        setupTabNavigation();
        setupLockIcon();
        
        // Set up modal close button
        const cancelBtn = document.getElementById('cancelAddExpense');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAddExpenseModal);
        }
        
        // Close modal when clicking overlay
        const modal = document.getElementById('addExpenseModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAddExpenseModal();
                }
            });
        }
        
        setupLogoutButton();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}