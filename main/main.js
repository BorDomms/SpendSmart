// ===== IMPORT SUPABASE =====
import { supabase } from '/supabase.js'

// ===== CHECK SESSION =====
const { data: { session }, error } = await supabase.auth.getSession();

if (error) {
    window.location.href = '/login/login.html';
}

if (!session) {
    window.location.href = '/login/login.html';
} else {
    initializeApp(session.user);
}

// ===== GLOBAL VARIABLES =====
let expenses = [];
let incomes = [];
let savingsTargets = [];
let MONTHLY_BUDGET = 2500;

// ===== CATEGORY PERCENTAGES =====
const categoryPercentages = {
    'Food': 35,
    'Transport': 20,
    'Shopping': 20,
    'Entertainment': 15,
    'Bills': 25,
    'Other': 10
};

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

// ===== STATE VARIABLES =====
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
        'Other': '📦',
        'Salary': '💰',
        'Freelance': '💻',
        'Investment': '📈',
        'Gift': '🎁',
        'Refund': '↩️'
    };
    return emojis[category] || '📌';
}

function getPaymentEmoji(method) {
    const emojis = {
        'Cash': '💵',
        'Credit Card': '💳',
        'Debit Card': '💳',
        'Bank Transfer': '🏦',
        'E-Wallet': '📱',
        'Check': '📝',
        'Other': '📦'
    };
    return emojis[method] || '💳';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB');
}

// ===== MONTH NAVIGATION =====
function setMonthFromLatestExpense() {
    if (expenses && expenses.length > 0) {
        const sortedExpenses = [...expenses].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        const latestExpense = sortedExpenses[0];
        const latestDate = new Date(latestExpense.date);
        
        currentMonth = latestDate.getMonth();
        currentYear = latestDate.getFullYear();
        console.log('Month set from latest expense:', monthNames[currentMonth], currentYear);
    } else {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        console.log('Using current month:', monthNames[currentMonth], currentYear);
    }
}

function updateMonthDisplay() {
    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) {
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
}

// ===== SAVINGS CALCULATION =====
function calculateSavings() {
    return 0;
}

// ===== CATEGORY SPENDING TRACKING =====
function calculateCategorySpending() {
    const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });
    
    const categorySpending = {
        'Food': 0,
        'Transport': 0,
        'Shopping': 0,
        'Entertainment': 0,
        'Bills': 0,
        'Other': 0
    };
    
    monthExpenses.forEach(expense => {
        if (categorySpending.hasOwnProperty(expense.category)) {
            categorySpending[expense.category] += expense.amount;
        }
    });
    
    return categorySpending;
}

// ===== CATEGORY CARD UPDATE =====
function updateCategoryCard(category, budget, spent) {
    const amountEl = document.getElementById(`${category.toLowerCase()}Amount`);
    const progressEl = document.getElementById(`${category.toLowerCase()}Progress`);
    const lockIcon = document.querySelector(`.lock-icon[data-category="${category}"]`);
    
    const remaining = budget - spent;
    const progressPercent = budget > 0 ? (spent / budget) * 100 : 0;
    
    const fullHtml = `<span class="card-amount">${Math.max(remaining, 0).toFixed(0)}</span><span class="card-separator">/</span><span class="card-total">${budget.toFixed(0)}</span>`;
    
    if (amountEl) {
        amountEl.setAttribute('data-original-html', fullHtml);
        
        if (lockIcon && lockIcon.getAttribute('data-locked') === 'false') {
            amountEl.innerHTML = `<span class="card-total">${budget.toFixed(0)}</span>`;
        } else {
            amountEl.innerHTML = fullHtml;
        }
    }
    
    if (progressEl) {
        progressEl.style.width = `${Math.min(progressPercent, 100)}%`;
        progressEl.style.background = spent > budget ? 
            'linear-gradient(90deg, #c53030 0%, #f56565 100%)' : 
            'linear-gradient(90deg, #7b2cbf 0%, #c77dff 100%)';
    }
}

// ===== BUDGET ALLOCATIONS DATABASE FUNCTIONS =====
async function loadBudgetAllocations(userId) {
    try {
        console.log('Loading budget allocations for user:', userId);
        const { data, error } = await supabase
            .from('budget_allocations')
            .select('*')
            .eq('user_id', userId);
        
        if (error && error.code !== 'PGRST116') throw error;
        
        window.customBudgetAmounts = null;
        
        if (data && data.length > 0) {
            window.customBudgetAmounts = {};
            data.forEach(allocation => {
                window.customBudgetAmounts[allocation.category] = allocation.amount;
            });
            console.log('Budget allocations loaded:', window.customBudgetAmounts);
        } else {
            console.log('No custom budget allocations found');
        }
    } catch (error) {
        console.error('Error loading budget allocations:', error);
        window.customBudgetAmounts = null;
    }
}

async function saveBudgetAllocations(userId) {
    try {
        const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other'];
        const amounts = {};
        
        categories.forEach(category => {
            const amountEl = document.getElementById(`${category.toLowerCase()}Amount`);
            if (amountEl) {
                const amountHTML = amountEl.innerHTML;
                const match = amountHTML.match(/<span class="card-total"[^>]*>(\d+)<\/span>/);
                if (match) {
                    amounts[category] = parseFloat(match[1]);
                }
            }
        });
        
        const allocations = Object.entries(amounts).map(([category, amount]) => ({
            user_id: userId,
            category,
            amount: Math.round(amount),
            updated_at: new Date().toISOString()
        }));
        
        for (const allocation of allocations) {
            const { error } = await supabase
                .from('budget_allocations')
                .upsert(allocation, { 
                    onConflict: 'user_id, category'
                });
            
            if (error) throw error;
        }
        
        window.customBudgetAmounts = amounts;
        
    } catch (error) {
        console.error('Error saving budget allocations:', error);
    }
}

// ===== CATEGORY BUDGETS UPDATE =====
function updateCategoryBudgets() {
    const monthlyBudget = MONTHLY_BUDGET;
    
    if (!monthlyBudget || monthlyBudget <= 0) {
        return;
    }
    
    const categorySpending = calculateCategorySpending();
    
    let foodBudget, transportBudget, shoppingBudget, entertainmentBudget, billsBudget, otherBudget;
    
    const hasCustomAmounts = window.customBudgetAmounts && Object.keys(window.customBudgetAmounts).length > 0;
    
    if (hasCustomAmounts) {
        const defaultBillsBudget = (categoryPercentages.Bills / 100) * monthlyBudget;
        const defaultFoodBudget = (categoryPercentages.Food / 100) * monthlyBudget;
        const defaultTransportBudget = (categoryPercentages.Transport / 100) * monthlyBudget;
        const defaultShoppingBudget = (categoryPercentages.Shopping / 100) * monthlyBudget;
        const defaultEntertainmentBudget = (categoryPercentages.Entertainment / 100) * monthlyBudget;
        const defaultOtherBudget = (categoryPercentages.Other / 100) * monthlyBudget;
        
        foodBudget = window.customBudgetAmounts['Food'] !== undefined ? window.customBudgetAmounts['Food'] : defaultFoodBudget;
        transportBudget = window.customBudgetAmounts['Transport'] !== undefined ? window.customBudgetAmounts['Transport'] : defaultTransportBudget;
        shoppingBudget = window.customBudgetAmounts['Shopping'] !== undefined ? window.customBudgetAmounts['Shopping'] : defaultShoppingBudget;
        entertainmentBudget = window.customBudgetAmounts['Entertainment'] !== undefined ? window.customBudgetAmounts['Entertainment'] : defaultEntertainmentBudget;
        billsBudget = window.customBudgetAmounts['Bills'] !== undefined ? window.customBudgetAmounts['Bills'] : defaultBillsBudget;
        otherBudget = window.customBudgetAmounts['Other'] !== undefined ? window.customBudgetAmounts['Other'] : defaultOtherBudget;
        
    } else {
        foodBudget = (categoryPercentages.Food / 100) * monthlyBudget;
        transportBudget = (categoryPercentages.Transport / 100) * monthlyBudget;
        shoppingBudget = (categoryPercentages.Shopping / 100) * monthlyBudget;
        entertainmentBudget = (categoryPercentages.Entertainment / 100) * monthlyBudget;
        billsBudget = (categoryPercentages.Bills / 100) * monthlyBudget;
        otherBudget = (categoryPercentages.Other / 100) * monthlyBudget;
    }
    
    updateCategoryCard('Food', foodBudget, categorySpending.Food || 0);
    updateCategoryCard('Transport', transportBudget, categorySpending.Transport || 0);
    updateCategoryCard('Shopping', shoppingBudget, categorySpending.Shopping || 0);
    updateCategoryCard('Entertainment', entertainmentBudget, categorySpending.Entertainment || 0);
    updateCategoryCard('Bills', billsBudget, categorySpending.Bills || 0);
    updateCategoryCard('Other', otherBudget, categorySpending.Other || 0);
    
    const savingsAmountEl = document.getElementById('savingsAllocationAmount');
    const savingsPercentageEl = document.getElementById('savingsAllocationPercentage');
    const savingsProgressEl = document.getElementById('savingsAllocationProgress');
    
    if (savingsAmountEl) {
        savingsAmountEl.innerHTML = `<span class="card-amount">0</span><span class="card-separator">/</span><span class="card-total">0</span>`;
    }
    if (savingsPercentageEl) {
        savingsPercentageEl.textContent = `0%`;
    }
    if (savingsProgressEl) {
        savingsProgressEl.style.width = `0%`;
    }
    
    const remainingAmountEl = document.getElementById('remainingAmount');
    const remainingPercentageEl = document.getElementById('remainingPercentage');
    const remainingProgressEl = document.getElementById('remainingProgress');
    
    const totalAllocated = foodBudget + transportBudget + shoppingBudget + 
                          entertainmentBudget + billsBudget + otherBudget;
    const unallocated = monthlyBudget - totalAllocated;
    
    if (remainingAmountEl) {
        remainingAmountEl.innerHTML = `<span class="card-amount">${unallocated.toFixed(0)}</span><span class="card-separator">/</span><span class="card-total">${monthlyBudget.toFixed(0)}</span>`;
    }
    if (remainingPercentageEl) {
        const remainingPercent = (unallocated / monthlyBudget) * 100;
        remainingPercentageEl.textContent = `${remainingPercent.toFixed(1)}%`;
    }
    if (remainingProgressEl) {
        const remainingProgress = (unallocated / monthlyBudget) * 100;
        remainingProgressEl.style.width = `${remainingProgress}%`;
    }
}

// ===== UPDATE SAVINGS TARGETS LIST =====
function updateSavingsTargetsList() {
    const savingsGrid = document.getElementById('savingsGrid');
    if (!savingsGrid) return;
    
    if (savingsTargets.length === 0) {
        savingsGrid.innerHTML = `
            <div class="empty-state" id="emptySavingsState">
                <p>No savings targets yet. Click the + button and select Savings to create one!</p>
            </div>
        `;
        return;
    }
    
    savingsGrid.innerHTML = savingsTargets.map(target => {
        const progress = (target.saved / target.target) * 100;
        return `
        <div class="card savings-primary" data-id="${target.id}">
            <div class="card-header">
                <div class="card-info">
                    <span class="card-icon">🎯</span>
                    <h3 class="savings-goal-name">${target.name}</h3>
                </div>
                <div class="card-controls">
                    <i class="fa-solid fa-lock lock-icon locked" data-goal-id="${target.id}" data-locked="true"></i>
                    <i class="fa-solid fa-trash-can delete-icon" data-goal-id="${target.id}" style="opacity: 0.3; pointer-events: none;"></i>
                </div>
            </div>
            <div class="card-amount-display">
                <span class="card-amount" id="savings-amount-${target.id}">${target.saved.toFixed(0)}</span>
                <span class="card-separator">/</span>
                <span class="card-total">${target.target.toFixed(0)}</span>
            </div>
            <div class="card-progress">
                <div class="progress-container">
                    <div class="progress-bar savings-bar" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="card-stats">
                <span class="savings-goal-current">${target.saved.toFixed(0)} saved</span>
                <span class="savings-goal-target-stat">${target.target.toFixed(0)} target</span>
            </div>
            <div class="savings-goal-source">
                <i class="fa-solid fa-filter"></i> Saving from: ${target.source || 'All categories'}
            </div>
        </div>
    `}).join('');
    
    setupSavingsGoalLocks();
    setupSavingsGoalDeletes();
}

function setupSavingsGoalLocks() {
    document.querySelectorAll('.lock-icon[data-goal-id]').forEach(lock => {
        const newLock = lock.cloneNode(true);
        lock.parentNode.replaceChild(newLock, lock);
        newLock.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSavingsGoalLock(newLock);
        });
    });
}

function setupSavingsGoalDeletes() {
    document.querySelectorAll('.delete-icon[data-goal-id]').forEach(deleteIcon => {
        const newDelete = deleteIcon.cloneNode(true);
        deleteIcon.parentNode.replaceChild(newDelete, deleteIcon);
        newDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = newDelete.dataset.goalId;
            const lockIcon = document.querySelector(`.lock-icon[data-goal-id="${goalId}"]`);
            if (lockIcon?.getAttribute('data-locked') === 'false') {
                deleteSavingsGoal(goalId);
            }
        });
    });
}

function toggleSavingsGoalLock(lockIcon) {
    const goalId = lockIcon.dataset.goalId;
    const deleteIcon = document.querySelector(`.delete-icon[data-goal-id="${goalId}"]`);
    
    if (lockIcon.classList.contains('locked')) {
        lockIcon.className = 'fa-solid fa-unlock lock-icon unlocked';
        lockIcon.setAttribute('data-locked', 'false');
        if (deleteIcon) {
            deleteIcon.style.opacity = '1';
            deleteIcon.style.pointerEvents = 'auto';
        }
    } else {
        lockIcon.className = 'fa-solid fa-lock lock-icon locked';
        lockIcon.setAttribute('data-locked', 'true');
        if (deleteIcon) {
            deleteIcon.style.opacity = '0.3';
            deleteIcon.style.pointerEvents = 'none';
        }
    }
}

async function deleteSavingsGoal(goalId) {
    if (!confirm('Delete this savings goal?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    try {
        const { error } = await supabase
            .from('savings_targets')
            .delete()
            .eq('id', goalId)
            .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        savingsTargets = savingsTargets.filter(goal => goal.id != goalId);
        updateSavingsTargetsList();
        
    } catch (error) {
        alert('Failed to delete savings goal');
    }
}

// ===== EXPENSES LIST UPDATE =====
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
        
        const paymentEmoji = getPaymentEmoji(expense.payment_method);
        
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
                <span class="expense-amount">${expense.amount.toFixed(2)}</span>
                <span class="expense-date">${formatDate(expense.date)}</span>
                <button class="delete-expense" onclick="deleteExpense(${expense.id})">✕</button>
            </div>
        </div>
    `}).join('');
}

// ===== INCOMES HELPERS =====
function getMonthIncomes() {
    return incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === currentMonth && 
               incomeDate.getFullYear() === currentYear;
    });
}

// ===== INCOMES LIST UPDATE =====
function updateIncomesList(monthIncomes) {
    const incomesList = document.getElementById('incomesList');
    if (!incomesList) return;
    
    if (monthIncomes.length === 0) {
        incomesList.innerHTML = `
            <div class="empty-state">
                <p>No incomes yet for ${monthNames[currentMonth]}!</p>
            </div>
        `;
        return;
    }
    
    const sortedIncomes = [...monthIncomes].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    incomesList.innerHTML = sortedIncomes.map(income => {
        const paymentEmoji = getPaymentEmoji(income.payment_method);
        
        return `
        <div class="income-item" data-id="${income.id}">
            <div class="income-row">
                <span class="income-category">
                    ${getCategoryEmoji(income.category)} ${income.category}
                </span>
                <span class="income-source">${income.source ? `📌 ${income.source}` : ''}</span>
            </div>
            <div class="income-row amount-date-row">
                <span class="income-amount">${income.amount.toFixed(2)}</span>
                <span class="income-date">${formatDate(income.date)}</span>
                <span class="payment-method-badge" title="${income.payment_method}">
                    ${paymentEmoji}
                </span>
                <button class="delete-income" onclick="deleteIncome(${income.id})">✕</button>
            </div>
        </div>
    `}).join('');
}

// ===== MAIN DASHBOARD UPDATE =====
function updateDashboard() {
    const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });

    const monthIncomes = getMonthIncomes();

    const totalSpent = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncome = monthIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const budgetLeft = MONTHLY_BUDGET - totalSpent;
    const spentPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, (totalSpent / MONTHLY_BUDGET) * 100) : 0;
    const budgetPercentage = MONTHLY_BUDGET > 0 ? Math.min(100, Math.max(0, (budgetLeft / MONTHLY_BUDGET) * 100)) : 0;

    const budgetRemainingEl = document.getElementById('budgetRemaining');
    const budgetTotalEl = document.getElementById('budgetTotal');
    const lockIcon = document.getElementById('budgetLockIcon');
    const budgetSeparator = document.getElementById('budgetSeparator');
    
    if (budgetRemainingEl) {
        budgetRemainingEl.textContent = Math.max(budgetLeft, 0).toFixed(0);
    }
    if (budgetTotalEl) {
        budgetTotalEl.textContent = MONTHLY_BUDGET.toFixed(0);
    }
    
    if (lockIcon && lockIcon.getAttribute('data-locked') === 'false') {
        if (budgetRemainingEl) budgetRemainingEl.style.display = 'none';
        if (budgetSeparator) budgetSeparator.style.display = 'none';
    } else {
        if (budgetRemainingEl) budgetRemainingEl.style.display = 'inline';
        if (budgetSeparator) budgetSeparator.style.display = 'inline';
    }
    
    const spentAmountEl = document.getElementById('spentAmount');
    if (spentAmountEl) {
        spentAmountEl.textContent = totalSpent.toFixed(2);
    }
    
    const budgetPercentageEl = document.getElementById('budgetPercentage');
    if (budgetPercentageEl) {
        budgetPercentageEl.textContent = `${budgetPercentage.toFixed(1)}% remaining`;
    }
    
    const spentPercentageEl = document.getElementById('spentPercentage');
    if (spentPercentageEl) {
        spentPercentageEl.textContent = `${spentPercentage.toFixed(1)}% of budget used`;
    }
    
    const budgetBarEl = document.getElementById('budgetBar');
    if (budgetBarEl) {
        budgetBarEl.style.width = `${budgetPercentage}%`;
    }
    
    const spentBarEl = document.getElementById('spentBar');
    if (spentBarEl) {
        spentBarEl.style.width = `${spentPercentage}%`;
    }
    
    const savingsAmountEl = document.getElementById('savingsAmount');
    if (savingsAmountEl) {
        savingsAmountEl.textContent = '0.00';
    }
    
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

    updateExpensesList(monthExpenses);
    updateIncomesList(monthIncomes);
    updateSavingsTargetsList();
    updateCategoryBudgets();
    
    const monthlyExpenseTotalEl = document.getElementById('monthlyExpenseTotal');
    if (monthlyExpenseTotalEl) {
        monthlyExpenseTotalEl.textContent = totalSpent.toFixed(2);
    }
    
    const monthlyIncomeTotalEl = document.getElementById('monthlyIncomeTotal');
    if (monthlyIncomeTotalEl) {
        monthlyIncomeTotalEl.textContent = totalIncome.toFixed(2);
    }
    
    const expenseCountEl = document.getElementById('expenseCount');
    if (expenseCountEl) {
        expenseCountEl.textContent = `${monthExpenses.length} item${monthExpenses.length !== 1 ? 's' : ''}`;
    }
    
    const incomeCountEl = document.getElementById('incomeCount');
    if (incomeCountEl) {
        incomeCountEl.textContent = `${monthIncomes.length} item${monthIncomes.length !== 1 ? 's' : ''}`;
    }
}

// ===== LOAD DATA FROM SUPABASE =====
async function loadBudget(userId) {
    try {
        console.log('Loading budget for user:', userId);
        const { data, error } = await supabase
            .from('profiles')
            .select('monthly_budget')
            .eq('id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('No profile found, creating default');
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
                console.log('Default budget set to 2500');
            } else {
                throw error;
            }
        } else if (data) {
            MONTHLY_BUDGET = parseFloat(data.monthly_budget);
            console.log('Budget loaded:', MONTHLY_BUDGET);
        }
    } catch (error) {
        console.error('Error loading budget:', error);
    }
}

async function loadExpenses(userId) {
    try {
        console.log('Loading expenses for user:', userId);
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        expenses = data ? data.map(expense => ({
            id: expense.id,
            amount: parseFloat(expense.amount),
            category: expense.category,
            subcategory: expense.subcategory || null,
            payment_method: expense.payment_method || 'Cash',
            date: expense.date
        })) : [];
        
        console.log('Expenses loaded:', expenses.length);
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function loadIncomes(userId) {
    try {
        console.log('Loading incomes for user:', userId);
        const { data, error } = await supabase
            .from('incomes')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        incomes = data ? data.map(income => ({
            id: income.id,
            amount: parseFloat(income.amount),
            category: income.category,
            source: income.source || null,
            payment_method: income.payment_method,
            date: income.date
        })) : [];
        
        console.log('Incomes loaded:', incomes.length);
    } catch (error) {
        console.error('Error loading incomes:', error);
    }
}

async function loadSavingsTargets(userId) {
    try {
        console.log('Loading savings targets for user:', userId);
        const { data, error } = await supabase
            .from('savings_targets')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            if (error.code !== 'PGRST116') throw error;
        }
        
        if (data) {
            savingsTargets = data.map(goal => ({
                id: goal.id,
                name: goal.name,
                target: parseFloat(goal.target_amount),
                saved: parseFloat(goal.current_amount) || 0,
                source: goal.source_category
            }));
        } else {
            savingsTargets = [];
        }
        
        console.log('Savings targets loaded:', savingsTargets.length);
    } catch (error) {
        console.error('Error loading savings targets:', error);
        savingsTargets = [];
    }
}

// ===== LOCK ICON FUNCTIONS =====
function setupLockIcon() {
    const lockIcon = document.getElementById('budgetLockIcon');
    const budgetRemaining = document.getElementById('budgetRemaining');
    const budgetSeparator = document.getElementById('budgetSeparator');
    const budgetTotal = document.getElementById('budgetTotal');
    
    if (!lockIcon || !budgetRemaining || !budgetTotal) return;
    
    lockIcon.setAttribute('data-locked', 'true');
    lockIcon.classList.add('locked');
    
    lockIcon.addEventListener('click', function() {
        if (this.classList.contains('locked')) {
            this.classList.remove('fa-lock', 'locked');
            this.classList.add('fa-unlock', 'unlocked');
            this.setAttribute('data-locked', 'false');
            
            budgetRemaining.style.display = 'none';
            budgetSeparator.style.display = 'none';
            budgetTotal.classList.add('editable');
            budgetTotal.addEventListener('click', editBudget);
        } else {
            this.classList.remove('fa-unlock', 'unlocked');
            this.classList.add('fa-lock', 'locked');
            this.setAttribute('data-locked', 'true');
            
            budgetRemaining.style.display = 'inline';
            budgetSeparator.style.display = 'inline';
            budgetTotal.classList.remove('editable');
            budgetTotal.removeEventListener('click', editBudget);
        }
    });
}

// ===== EDIT BUDGET =====
async function editBudget() {
    const budgetTotal = document.getElementById('budgetTotal');
    const lockIcon = document.getElementById('budgetLockIcon');
    const budgetRemaining = document.getElementById('budgetRemaining');
    const budgetSeparator = document.getElementById('budgetSeparator');
    
    if (!lockIcon || lockIcon.getAttribute('data-locked') === 'true') return;
    
    const currentValue = MONTHLY_BUDGET;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.inputMode = 'decimal';
    input.className = 'budget-input';
    input.style.width = '120px';
    
    budgetTotal.style.display = 'none';
    budgetTotal.parentNode.appendChild(input);
    input.focus();
    input.select();
    
    async function finishEditing() {
        const newValue = parseFloat(input.value);
        
        if (!isNaN(newValue) && newValue >= 0) {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
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
                updateDashboard();
                
                budgetTotal.textContent = newValue.toFixed(0);
                budgetTotal.style.display = 'inline';
                
                const monthExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                           expenseDate.getFullYear() === currentYear;
                });
                const totalSpent = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                const budgetLeft = MONTHLY_BUDGET - totalSpent;
                budgetRemaining.textContent = Math.max(budgetLeft, 0).toFixed(0);
                
            } catch (error) {
                alert('Failed to update budget');
            }
        }
        
        input.remove();
        budgetTotal.style.display = 'inline';
    }
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        }
    });
    
    input.addEventListener('blur', finishEditing);
}

// ===== BUDGET CARD LOCK ICON SETUP =====
function setupBudgetCardLocks() {
    const lockIcons = document.querySelectorAll('.lock-icon[data-category]');
    
    lockIcons.forEach(lockIcon => {
        const newLockIcon = lockIcon.cloneNode(true);
        lockIcon.parentNode.replaceChild(newLockIcon, lockIcon);
        
        newLockIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleBudgetCardLock(this);
        });
    });
}

// ===== TOGGLE BUDGET CARD LOCK =====
function toggleBudgetCardLock(lockIcon) {
    const category = lockIcon.dataset.category;
    const amountEl = document.getElementById(`${category.toLowerCase()}Amount`);
    
    if (!amountEl) return;
    
    if (lockIcon.classList.contains('locked')) {
        lockIcon.className = 'fa-solid fa-unlock lock-icon unlocked';
        lockIcon.setAttribute('data-locked', 'false');
        
        amountEl.setAttribute('data-original-html', amountEl.innerHTML);
        
        const match = amountEl.innerHTML.match(/(\d+)/);
        if (match) {
            amountEl.innerHTML = `<span class="card-total">${match[1]}</span>`;
        }
        
        const handler = () => editBudgetCardAmount(category);
        amountEl._clickHandler = handler;
        amountEl.addEventListener('click', handler);
    } else {
        lockIcon.className = 'fa-solid fa-lock lock-icon locked';
        lockIcon.setAttribute('data-locked', 'true');
        
        const original = amountEl.getAttribute('data-original-html');
        if (original) amountEl.innerHTML = original;
        
        if (amountEl._clickHandler) {
            amountEl.removeEventListener('click', amountEl._clickHandler);
            delete amountEl._clickHandler;
        }
    }
}

// ===== EDIT BUDGET CARD AMOUNT =====
async function editBudgetCardAmount(category) {
    const amountEl = document.getElementById(`${category.toLowerCase()}Amount`);
    const lockIcon = document.querySelector(`.lock-icon[data-category="${category}"]`);
    
    if (!lockIcon || lockIcon.getAttribute('data-locked') === 'true') {
        return;
    }
    
    let currentTotalAllocation = 0;
    const amountText = amountEl.textContent || amountEl.innerText;
    const match = amountText.match(/(\d+(?:\.\d+)?)/);
    if (match) {
        currentTotalAllocation = parseFloat(match[1]);
    }
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentTotalAllocation;
    input.step = 'any';
    input.min = '0';
    input.className = 'budget-amount-input';
    
    amountEl.style.display = 'none';
    amountEl.parentNode.appendChild(input);
    input.focus();
    input.select();
    
    let editingCancelled = false;
    
    const finishEditing = async (saveChanges = true) => {
        if (editingCancelled) return;
        editingCancelled = true;
        
        if (saveChanges) {
            const newTotalAllocation = parseFloat(input.value);
            
            if (!isNaN(newTotalAllocation) && newTotalAllocation >= 0 && newTotalAllocation !== currentTotalAllocation) {
                await saveCategoryAmount(category, newTotalAllocation);
            }
        }
        
        input.remove();
        amountEl.style.display = 'block';
        
        if (lockIcon && lockIcon.getAttribute('data-locked') === 'false') {
            toggleBudgetCardLock(lockIcon);
        }
    };
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing(true);
        }
    });
    
    input.addEventListener('blur', () => {
        finishEditing(true);
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            finishEditing(false);
        }
    });
}

// ===== SAVE CATEGORY AMOUNT TO DATABASE =====
async function saveCategoryAmount(category, newAmount) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    const roundedAmount = Math.round(newAmount);
    
    const allocation = {
        user_id: session.user.id,
        category,
        amount: roundedAmount,
        updated_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase
            .from('budget_allocations')
            .upsert(allocation, { 
                onConflict: 'user_id, category'
            });
        
        if (error) throw error;
        
        if (!window.customBudgetAmounts) {
            window.customBudgetAmounts = {};
        }
        window.customBudgetAmounts[category] = roundedAmount;
        
        updateCategoryBudgets();
        
    } catch (error) {
        alert('Failed to save budget amount');
    }
}

// ===== ADD SAVINGS GOAL =====
async function addSavingsGoal(event) {
    event.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    const nameInput = document.getElementById('savingsName');
    const targetAmountInput = document.getElementById('savingsTargetAmount');
    const categorySelect = document.getElementById('savingsCategory');
    
    if (!nameInput || !targetAmountInput || !categorySelect) return;
    
    const name = nameInput.value;
    const targetAmount = parseFloat(targetAmountInput.value);
    const category = categorySelect.value;
    
    if (!name) {
        alert('Please enter a goal name');
        return;
    }
    
    if (isNaN(targetAmount) || targetAmount <= 0) {
        alert('Please enter a valid target amount');
        return;
    }
    
    if (!category) {
        alert('Please select a category');
        return;
    }
    
    const newGoal = {
        user_id: session.user.id,
        name: name,
        target_amount: targetAmount,
        current_amount: 0,
        target_type: 'Savings Goal',
        source_category: category,
        created_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase
            .from('savings_targets')
            .insert([newGoal])
            .select();
        
        if (error) throw error;
        
        savingsTargets.push({
            id: data[0].id,
            name: name,
            target: targetAmount,
            saved: 0,
            source: category
        });
        
        document.getElementById('savingsForm').reset();
        
        closeAddTransactionModal();
        
        updateSavingsTargetsList();
        
    } catch (error) {
        alert('Failed to add savings goal: ' + error.message);
    }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', addExpense);
    }
    
    const incomeForm = document.getElementById('incomeForm');
    if (incomeForm) {
        incomeForm.addEventListener('submit', addIncome);
    }
    
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) {
        savingsForm.addEventListener('submit', addSavingsGoal);
    }
    
    const expenseCategory = document.getElementById('expenseCategory');
    if (expenseCategory) {
        expenseCategory.addEventListener('change', updateExpenseSubcategoryDropdown);
    }
    
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
        const newPrevBtn = prevMonthBtn.cloneNode(true);
        prevMonthBtn.parentNode.replaceChild(newPrevBtn, prevMonthBtn);
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
        const newNextBtn = nextMonthBtn.cloneNode(true);
        nextMonthBtn.parentNode.replaceChild(newNextBtn, nextMonthBtn);
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
function updateExpenseSubcategoryDropdown() {
    const categorySelect = document.getElementById('expenseCategory');
    const subcategorySelect = document.getElementById('expenseSubcategory');
    
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

// ===== ADD EXPENSE =====
async function addExpense(event) {
    event.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    const amountInput = document.getElementById('expenseAmount');
    const categorySelect = document.getElementById('expenseCategory');
    const subcategorySelect = document.getElementById('expenseSubcategory');
    const paymentMethodSelect = document.getElementById('expensePaymentMethod');
    const dateInput = document.getElementById('expenseDate');
    
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
        
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        
        const subcatSelect = document.getElementById('expenseSubcategory');
        if (subcatSelect) {
            subcatSelect.disabled = true;
            subcatSelect.innerHTML = '<option value="" disabled selected>Select category first</option>';
        }
        
        closeAddTransactionModal();
        updateDashboard();
    } catch (error) {
        alert('Failed to add expense');
    }
}

// ===== ADD INCOME =====
async function addIncome(event) {
    event.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    const amountInput = document.getElementById('incomeAmount');
    const categorySelect = document.getElementById('incomeCategory');
    const sourceInput = document.getElementById('incomeSource');
    const paymentMethodSelect = document.getElementById('incomePaymentMethod');
    const dateInput = document.getElementById('incomeDate');
    
    if (!amountInput || !categorySelect || !paymentMethodSelect || !dateInput) return;
    
    const newIncome = {
        user_id: session.user.id,
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        source: sourceInput.value || null,
        payment_method: paymentMethodSelect.value,
        date: dateInput.value
    };
    
    if (isNaN(newIncome.amount) || newIncome.amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (!newIncome.category) {
        alert('Please select a category');
        return;
    }
    
    if (!newIncome.payment_method) {
        alert('Please select a payment method');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('incomes')
            .insert([newIncome])
            .select();
        
        if (error) throw error;
        
        incomes.push(data[0]);
        
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
        
        closeAddTransactionModal();
        updateDashboard();
        
    } catch (error) {
        alert('Failed to add income: ' + error.message);
    }
}

// ===== DELETE EXPENSE =====
async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
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
        alert('Failed to delete expense');
    }
}

window.deleteExpense = deleteExpense;

// ===== DELETE INCOME =====
async function deleteIncome(id) {
    if (!confirm('Delete this income?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login/login.html';
        return;
    }
    
    try {
        const { error } = await supabase
            .from('incomes')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        incomes = incomes.filter(income => income.id !== id);
        updateDashboard();
    } catch (error) {
        alert('Failed to delete income');
    }
}

window.deleteIncome = deleteIncome;

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
    console.log('Setting up tab navigation');
    
    const homeBtn = document.getElementById('homeTabBtn');
    const budgetsBtn = document.getElementById('budgetsTabBtn');
    const addBtn = document.getElementById('addTabBtn');
    const savingsBtn = document.getElementById('savingsTabBtn');
    const listBtn = document.getElementById('listTabBtn');
    
    const homeTab = document.getElementById('homeTab');
    const budgetsTab = document.getElementById('budgetsTab');
    const savingsTab = document.getElementById('savingsTab');
    const listTab = document.getElementById('listTab');
    
    console.log('Add button found:', addBtn ? 'YES' : 'NO');
    
    if (!homeBtn || !budgetsBtn || !addBtn || !savingsBtn || !listBtn) {
        console.error('Navigation buttons not found');
        return;
    }
    
    function switchTab(tabId, activeButton) {
        console.log('Switching to tab:', tabId);
        
        if (homeTab) homeTab.classList.remove('active-tab');
        if (budgetsTab) budgetsTab.classList.remove('active-tab');
        if (savingsTab) savingsTab.classList.remove('active-tab');
        if (listTab) listTab.classList.remove('active-tab');
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active-tab');
        }
        
        document.querySelectorAll('.footer-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        if (tabId === 'homeTab') currentTab = 'home';
        else if (tabId === 'budgetsTab') currentTab = 'budgets';
        else if (tabId === 'savingsTab') currentTab = 'savings';
        else if (tabId === 'listTab') currentTab = 'list';
        
        if (tabId === 'budgetsTab') {
            updateCategoryBudgets();
        } else if (tabId === 'savingsTab') {
            updateSavingsTargetsList();
        } else if (tabId === 'listTab' || tabId === 'homeTab') {
            updateDashboard();
        }
    }
    
    const newHomeBtn = homeBtn.cloneNode(true);
    const newBudgetsBtn = budgetsBtn.cloneNode(true);
    const newAddBtn = addBtn.cloneNode(true);
    const newSavingsBtn = savingsBtn.cloneNode(true);
    const newListBtn = listBtn.cloneNode(true);
    
    homeBtn.parentNode.replaceChild(newHomeBtn, homeBtn);
    budgetsBtn.parentNode.replaceChild(newBudgetsBtn, budgetsBtn);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    savingsBtn.parentNode.replaceChild(newSavingsBtn, savingsBtn);
    listBtn.parentNode.replaceChild(newListBtn, listBtn);
    
    newHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('homeTab', newHomeBtn);
    });
    
    newBudgetsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('budgetsTab', newBudgetsBtn);
    });
    
    newAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ Add button clicked - opening modal');
        openAddTransactionModal();
    });
    
    newSavingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('savingsTab', newSavingsBtn);
    });
    
    newListBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('listTab', newListBtn);
    });
    
    console.log('Tab navigation setup complete');
}

// ===== MODAL FUNCTIONS =====
function openAddTransactionModal() {
    console.log('Opening modal');
    const modal = document.getElementById('addTransactionModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    modal.style.display = 'flex';
    isModalOpen = true;
    
    const today = new Date().toISOString().split('T')[0];
    const expenseDate = document.getElementById('expenseDate');
    const incomeDate = document.getElementById('incomeDate');
    
    if (expenseDate) expenseDate.value = today;
    if (incomeDate) incomeDate.value = today;
    
    // Always start with expense form
    showExpenseForm();
}

function closeAddTransactionModal() {
    console.log('Closing modal');
    const modal = document.getElementById('addTransactionModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    isModalOpen = false;
}

// ===== MODAL TOGGLE FUNCTIONS =====
function showExpenseForm() {
    console.log('Showing expense form');
    const expenseForm = document.getElementById('expenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const savingsForm = document.getElementById('savingsForm');
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    const savingsToggle = document.getElementById('savingsToggleBtn');
    
    if (expenseForm) expenseForm.style.display = 'block';
    if (incomeForm) incomeForm.style.display = 'none';
    if (savingsForm) savingsForm.style.display = 'none';
    
    if (expenseToggle) {
        expenseToggle.classList.add('active');
        // Force inline style removal to let CSS take over
        expenseToggle.style.color = '';
        const text = expenseToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (incomeToggle) {
        incomeToggle.classList.remove('active');
        incomeToggle.style.color = '';
        const text = incomeToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (savingsToggle) {
        savingsToggle.classList.remove('active');
        savingsToggle.style.color = '';
        const text = savingsToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
}

function showIncomeForm() {
    console.log('Showing income form');
    const expenseForm = document.getElementById('expenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const savingsForm = document.getElementById('savingsForm');
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    const savingsToggle = document.getElementById('savingsToggleBtn');
    
    if (expenseForm) expenseForm.style.display = 'none';
    if (incomeForm) incomeForm.style.display = 'block';
    if (savingsForm) savingsForm.style.display = 'none';
    
    if (expenseToggle) {
        expenseToggle.classList.remove('active');
        expenseToggle.style.color = '';
        const text = expenseToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (incomeToggle) {
        incomeToggle.classList.add('active');
        incomeToggle.style.color = '';
        const text = incomeToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (savingsToggle) {
        savingsToggle.classList.remove('active');
        savingsToggle.style.color = '';
        const text = savingsToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
}

function showSavingsForm() {
    console.log('Showing savings form');
    const expenseForm = document.getElementById('expenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const savingsForm = document.getElementById('savingsForm');
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    const savingsToggle = document.getElementById('savingsToggleBtn');
    
    if (expenseForm) expenseForm.style.display = 'none';
    if (incomeForm) incomeForm.style.display = 'none';
    if (savingsForm) savingsForm.style.display = 'block';
    
    if (expenseToggle) {
        expenseToggle.classList.remove('active');
        expenseToggle.style.color = '';
        const text = expenseToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (incomeToggle) {
        incomeToggle.classList.remove('active');
        incomeToggle.style.color = '';
        const text = incomeToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
    if (savingsToggle) {
        savingsToggle.classList.add('active');
        savingsToggle.style.color = '';
        const text = savingsToggle.querySelector('.toggle-text');
        if (text) text.style.color = '';
    }
}

// ===== MODAL TOGGLE SETUP =====
function setupModalToggle() {
    console.log('Setting up modal toggle');
    
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    const savingsToggle = document.getElementById('savingsToggleBtn');
    const cancelBtn = document.getElementById('cancelAddTransaction');
    
    // Remove any existing listeners and add fresh ones
    if (expenseToggle) {
        const newExpenseToggle = expenseToggle.cloneNode(true);
        if (expenseToggle.parentNode) {
            expenseToggle.parentNode.replaceChild(newExpenseToggle, expenseToggle);
        }
        
        newExpenseToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Expense toggle clicked');
            showExpenseForm();
        });
        console.log('Expense toggle setup complete');
    }
    
    if (incomeToggle) {
        const newIncomeToggle = incomeToggle.cloneNode(true);
        if (incomeToggle.parentNode) {
            incomeToggle.parentNode.replaceChild(newIncomeToggle, incomeToggle);
        }
        
        newIncomeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Income toggle clicked');
            showIncomeForm();
        });
        console.log('Income toggle setup complete');
    }
    
    if (savingsToggle) {
        const newSavingsToggle = savingsToggle.cloneNode(true);
        if (savingsToggle.parentNode) {
            savingsToggle.parentNode.replaceChild(newSavingsToggle, savingsToggle);
        }
        
        newSavingsToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Savings toggle clicked');
            showSavingsForm();
        });
        console.log('Savings toggle setup complete');
    }
    
    // Setup cancel button
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        if (cancelBtn.parentNode) {
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        }
        
        newCancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cancel button clicked');
            closeAddTransactionModal();
        });
        console.log('Cancel button setup complete');
    }
}

// ===== INITIALIZE APP =====
async function initializeApp(user) {
    console.log('Initializing app for user:', user.id);
    try {
        await loadBudget(user.id);
        await loadExpenses(user.id);
        await loadIncomes(user.id);
        await loadSavingsTargets(user.id);
        await loadBudgetAllocations(user.id);
        await displayUserName(user.id);
        
        setMonthFromLatestExpense();
        updateMonthDisplay();
        updateDashboard();
        
        setupEventListeners();
        setupTabNavigation();
        setupLockIcon();
        setupBudgetCardLocks();
        
        // Setup modal toggles (this now includes cancel button)
        setupModalToggle();
        
        // Setup modal overlay click
        const modal = document.getElementById('addTransactionModal');
        if (modal) {
            // Don't clone the modal as it contains the toggles we just set up
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAddTransactionModal();
                }
            });
        }
        
        setupLogoutButton();
        
        console.log('App initialization complete');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}