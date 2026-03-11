// ===== IMPORT SUPABASE =====
import { supabase } from '/supabase.js'

// ===== CHECK SESSION =====
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

// ===== GLOBAL VARIABLES =====
let expenses = [];
let incomes = [];
let savingsTargets = [];
let MONTHLY_BUDGET = 2500;

// ===== CATEGORY PERCENTAGES =====
// Bills: 25% of total monthly budget
// Remaining 75% distributed to other categories:
const categoryPercentages = {
    'Food': 35,        // 35% of the remaining 75%
    'Transport': 20,    // 20% of the remaining 75%
    'Shopping': 20,     // 20% of the remaining 75%
    'Entertainment': 15, // 15% of the remaining 75%
    'Bills': 25,        // 25% of TOTAL budget (not of remaining)
    'Other': 10         // 10% of the remaining 75%
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB');
}

// ===== MONTH NAVIGATION =====
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
    const lockIcon = document.querySelector(`.budget-lock-icon[data-category="${category}"]`);
    
    const remaining = budget - spent;
    const progressPercent = budget > 0 ? (spent / budget) * 100 : 0;
    
    // Create the full HTML with remaining and total
    const fullHtml = `<span class="remaining-part">₱${Math.max(remaining, 0).toFixed(0)}</span><span class="separator">/</span><span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${budget.toFixed(0)}</span>`;
    
    // Update amount display
    if (amountEl) {
        // Store the full HTML as data attribute
        amountEl.setAttribute('data-original-html', fullHtml);
        
        // Check if the card is unlocked
        if (lockIcon && lockIcon.getAttribute('data-locked') === 'false') {
            // If unlocked, show only the total part with Satoshi font
            amountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${budget.toFixed(0)}</span>`;
        } else {
            // If locked, show the full display
            amountEl.innerHTML = fullHtml;
        }
    }
    
    // Update progress bar
    if (progressEl) {
        progressEl.style.width = `${Math.min(progressPercent, 100)}%`;
    }
    
    // Change progress bar color if over budget
    if (progressEl && spent > budget) {
        progressEl.style.background = 'linear-gradient(90deg, #c53030 0%, #f56565 100%)';
    } else if (progressEl) {
        progressEl.style.background = 'linear-gradient(90deg, #7b2cbf 0%, #c77dff 100%)';
    }
}

// ===== LOAD BUDGET ALLOCATIONS FROM SUPABASE =====
async function loadBudgetAllocations(userId) {
    try {
        const { data, error } = await supabase
            .from('budget_allocations')
            .select('*')
            .eq('user_id', userId);
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data && data.length > 0) {
            // Update categoryPercentages with saved values
            data.forEach(allocation => {
                if (categoryPercentages.hasOwnProperty(allocation.category)) {
                    categoryPercentages[allocation.category] = allocation.percentage;
                }
            });
            console.log('Loaded budget allocations from database:', categoryPercentages);
        }
    } catch (error) {
        console.error('Error loading budget allocations:', error);
    }
}

// ===== SAVE BUDGET ALLOCATIONS TO SUPABASE =====
async function saveBudgetAllocations(userId) {
    try {
        // Convert categoryPercentages object to array for upsert
        const allocations = Object.entries(categoryPercentages).map(([category, percentage]) => ({
            user_id: userId,
            category,
            percentage,
            updated_at: new Date().toISOString()
        }));
        
        // Upsert (insert or update) each allocation
        for (const allocation of allocations) {
            const { error } = await supabase
                .from('budget_allocations')
                .upsert(allocation, { 
                    onConflict: 'user_id, category'
                });
            
            if (error) throw error;
        }
        
        console.log('Budget allocations saved to database');
    } catch (error) {
        console.error('Error saving budget allocations:', error);
    }
}

// ===== CATEGORY BUDGETS UPDATE =====
function updateCategoryBudgets() {
    console.log('===== UPDATING CATEGORY BUDGETS =====');
    console.log('MONTHLY_BUDGET value:', MONTHLY_BUDGET);
    
    const monthlyBudget = MONTHLY_BUDGET;
    
    // Check if monthlyBudget is valid
    if (!monthlyBudget || monthlyBudget <= 0) {
        console.error('Invalid MONTHLY_BUDGET:', monthlyBudget);
        return;
    }
    
    const categorySpending = calculateCategorySpending();
    
    // Bills gets 25% of total budget directly
    const billsBudget = (categoryPercentages.Bills / 100) * monthlyBudget;
    
    // Remaining 75% goes to other categories
    const remainingBudget = monthlyBudget - billsBudget;
    
    // Distribute remaining budget according to percentages
    const foodBudget = (categoryPercentages.Food / 100) * remainingBudget;
    const transportBudget = (categoryPercentages.Transport / 100) * remainingBudget;
    const shoppingBudget = (categoryPercentages.Shopping / 100) * remainingBudget;
    const entertainmentBudget = (categoryPercentages.Entertainment / 100) * remainingBudget;
    const otherBudget = (categoryPercentages.Other / 100) * remainingBudget;
    
    console.log('Category budgets calculated:', {
        foodBudget: foodBudget.toFixed(0),
        transportBudget: transportBudget.toFixed(0),
        shoppingBudget: shoppingBudget.toFixed(0),
        entertainmentBudget: entertainmentBudget.toFixed(0),
        billsBudget: billsBudget.toFixed(0),
        otherBudget: otherBudget.toFixed(0)
    });
    
    // Update all category cards
    updateCategoryCard('Food', foodBudget, categorySpending.Food || 0);
    updateCategoryCard('Transport', transportBudget, categorySpending.Transport || 0);
    updateCategoryCard('Shopping', shoppingBudget, categorySpending.Shopping || 0);
    updateCategoryCard('Entertainment', entertainmentBudget, categorySpending.Entertainment || 0);
    updateCategoryCard('Bills', billsBudget, categorySpending.Bills || 0);
    updateCategoryCard('Other', otherBudget, categorySpending.Other || 0);
    
    // Update Savings card (showing 0 for now)
    const savingsAmountEl = document.getElementById('savingsAllocationAmount');
    const savingsPercentageEl = document.getElementById('savingsAllocationPercentage');
    const savingsProgressEl = document.getElementById('savingsAllocationProgress');
    
    if (savingsAmountEl) {
        savingsAmountEl.innerHTML = `<span class="remaining-part">₱0</span><span class="separator">/</span><span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱0</span>`;
    }
    if (savingsPercentageEl) {
        savingsPercentageEl.textContent = `0%`;
    }
    if (savingsProgressEl) {
        savingsProgressEl.style.width = `0%`;
    }
    
    // Update Remaining card
    const remainingAmountEl = document.getElementById('remainingAmount');
    const remainingPercentageEl = document.getElementById('remainingPercentage');
    const remainingProgressEl = document.getElementById('remainingProgress');
    
    const totalAllocated = foodBudget + transportBudget + shoppingBudget + 
                          entertainmentBudget + billsBudget + otherBudget;
    const unallocated = monthlyBudget - totalAllocated;
    
    if (remainingAmountEl) {
        remainingAmountEl.innerHTML = `<span class="remaining-part">₱${unallocated.toFixed(0)}</span><span class="separator">/</span><span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${monthlyBudget.toFixed(0)}</span>`;
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

// ===== SAVINGS TARGETS LIST UPDATE =====
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
        const paymentEmoji = {
            'Cash': '💵',
            'Bank Transfer': '🏦',
            'E-Wallet': '📱',
            'Check': '📝',
            'Other': '📦'
        }[income.payment_method] || '💰';
        
        return `
        <div class="income-item" data-id="${income.id}">
            <div class="income-row">
                <span class="income-category">
                    ${getCategoryEmoji(income.category)} ${income.category}
                </span>
                <span class="income-source">${income.source ? `📌 ${income.source}` : ''}</span>
            </div>
            <div class="income-row amount-date-row">
                <span class="income-amount">₱${income.amount.toFixed(2)}</span>
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

    const budgetAmountEl = document.getElementById('budgetAmount');
    if (budgetAmountEl) {
        budgetAmountEl.textContent = MONTHLY_BUDGET.toFixed(2);
    }
    
    const spentAmountEl = document.getElementById('spentAmount');
    if (spentAmountEl) {
        spentAmountEl.textContent = totalSpent.toFixed(2);
    }
    
    const budgetLeftEl = document.getElementById('budgetLeft');
    if (budgetLeftEl) {
        budgetLeftEl.textContent = `${budgetLeft.toFixed(2)} left`;
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
        console.log('Monthly budget loaded:', MONTHLY_BUDGET);
    } catch (error) {
        console.error('Error loading budget:', error);
    }
}

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

async function loadIncomes(userId) {
    try {
        const { data, error } = await supabase
            .from('incomes')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        incomes = data.map(income => ({
            id: income.id,
            amount: parseFloat(income.amount),
            category: income.category,
            source: income.source || null,
            payment_method: income.payment_method,
            date: income.date
        }));
    } catch (error) {
        console.error('Error loading incomes:', error);
    }
}

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
    
    lockIcon.setAttribute('data-locked', 'true');
    lockIcon.classList.add('locked');
    
    lockIcon.addEventListener('click', function() {
        if (this.classList.contains('locked')) {
            this.classList.remove('fa-lock', 'locked');
            this.classList.add('fa-unlock', 'unlocked');
            this.setAttribute('data-locked', 'false');
            budgetAmount.classList.add('editable');
            budgetAmount.addEventListener('click', editBudget);
        } else {
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

// ===== BUDGET CARD LOCK ICON SETUP =====
function setupBudgetCardLocks() {
    const lockIcons = document.querySelectorAll('.budget-lock-icon');
    
    lockIcons.forEach(lockIcon => {
        // Remove any existing event listeners
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
    const percentageEl = document.getElementById(`${category.toLowerCase()}Percentage`);
    
    if (!amountEl) return;
    
    if (lockIcon.classList.contains('locked')) {
        // Unlock
        lockIcon.classList.remove('fa-lock', 'locked');
        lockIcon.classList.add('fa-unlock', 'unlocked');
        lockIcon.setAttribute('data-locked', 'false');
        
        // Store the original HTML to restore later
        amountEl.setAttribute('data-original-html', amountEl.innerHTML);
        
        // Extract just the total allocation amount
        const amountHTML = amountEl.innerHTML;
        const match = amountHTML.match(/<span class="total-part"[^>]*>(₱\d+)<\/span>/);
        if (match) {
            // Replace with just the total allocation amount, keeping the same font style
            amountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">${match[1]}</span>`;
        } else {
            // Fallback if pattern doesn't match
            const textMatch = amountHTML.match(/₱(\d+)/);
            if (textMatch) {
                amountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${textMatch[1]}</span>`;
            }
        }
        
        // Remove any existing click handler before adding new one
        if (amountEl._clickHandler) {
            amountEl.removeEventListener('click', amountEl._clickHandler);
        }
        
        // Define the click handler for amount only
        const amountClickHandler = function() {
            editBudgetCardAmount(category);
        };
        
        // Store the handler on the element for later removal
        amountEl._clickHandler = amountClickHandler;
        amountEl.addEventListener('click', amountClickHandler);
        
        // Percentage is NOT editable - remove any existing classes
        if (percentageEl) {
            percentageEl.classList.remove('editable');
        }
        
        console.log(`Card unlocked for category: ${category}`);
    } else {
        // Lock
        lockIcon.classList.remove('fa-unlock', 'unlocked');
        lockIcon.classList.add('fa-lock', 'locked');
        lockIcon.setAttribute('data-locked', 'true');
        
        // Restore original HTML with remaining amount
        const originalHtml = amountEl.getAttribute('data-original-html');
        if (originalHtml) {
            amountEl.innerHTML = originalHtml;
        }
        
        if (amountEl._clickHandler) {
            amountEl.removeEventListener('click', amountEl._clickHandler);
            delete amountEl._clickHandler;
        }
        
        console.log(`Card locked for category: ${category}`);
    }
}

// ===== EDIT BUDGET CARD AMOUNT =====
function editBudgetCardAmount(category) {
    console.log(`Editing total allocation for category: ${category}`);
    
    const amountEl = document.getElementById(`${category.toLowerCase()}Amount`);
    const lockIcon = document.querySelector(`.budget-lock-icon[data-category="${category}"]`);
    
    if (!lockIcon || lockIcon.getAttribute('data-locked') === 'true') {
        console.log('Cannot edit - card is locked');
        return;
    }
    
    // Get current total allocation (now just the plain number)
    let currentTotalAllocation = 0;
    const amountText = amountEl.textContent || amountEl.innerText;
    const match = amountText.match(/₱?(\d+(?:\.\d+)?)/);
    if (match) {
        currentTotalAllocation = parseFloat(match[1]);
    }
    console.log('Current total allocation:', currentTotalAllocation);
    
    // Create input element with Satoshi font
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentTotalAllocation;
    input.step = 'any';
    input.min = '0';
    input.className = 'budget-amount-input';
    input.style.fontFamily = "'Satoshi', sans-serif";
    input.style.fontWeight = '400';
    input.style.fontSize = '16px';
    input.style.color = '#a0aec0';
    input.style.width = '100px';
    
    // Hide the original amount display
    amountEl.style.display = 'none';
    amountEl.parentNode.appendChild(input);
    input.focus();
    input.select();
    
    let editingCancelled = false;
    
    function finishEditing(saveChanges = true) {
        if (editingCancelled) return;
        editingCancelled = true;
        
        if (saveChanges) {
            const newTotalAllocation = parseFloat(input.value);
            console.log('New total allocation:', newTotalAllocation);
            
            if (!isNaN(newTotalAllocation) && newTotalAllocation >= 0 && newTotalAllocation !== currentTotalAllocation) {
                // Update the category percentage based on new total allocation
                updateCategoryPercentageFromTotalAllocation(category, newTotalAllocation);
                
                // After updateCategoryBudgets runs, we need to update the displayed total
                // But we also need to maintain the unlocked state showing only total with correct font
                setTimeout(() => {
                    // Get the updated amount element
                    const updatedAmountEl = document.getElementById(`${category.toLowerCase()}Amount`);
                    if (updatedAmountEl && lockIcon.getAttribute('data-locked') === 'false') {
                        // Store new original HTML
                        const updatedHTML = updatedAmountEl.innerHTML;
                        updatedAmountEl.setAttribute('data-original-html', updatedHTML);
                        
                        // Extract just the new total allocation and apply correct font
                        const newMatch = updatedHTML.match(/<span class="total-part"[^>]*>(₱\d+)<\/span>/);
                        if (newMatch) {
                            updatedAmountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">${newMatch[1]}</span>`;
                        } else {
                            // Fallback
                            const textMatch = updatedHTML.match(/₱(\d+)/);
                            if (textMatch) {
                                updatedAmountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${textMatch[1]}</span>`;
                            }
                        }
                    }
                }, 100);
            } else {
                // If no changes, restore the total display with correct font
                setTimeout(() => {
                    const updatedAmountEl = document.getElementById(`${category.toLowerCase()}Amount`);
                    if (updatedAmountEl && lockIcon.getAttribute('data-locked') === 'false') {
                        const currentHTML = updatedAmountEl.innerHTML;
                        const totalMatch = currentHTML.match(/₱(\d+)/);
                        if (totalMatch) {
                            updatedAmountEl.innerHTML = `<span class="total-part" style="font-family: 'Satoshi', sans-serif; font-weight: 400; color: #a0aec0;">₱${totalMatch[1]}</span>`;
                        }
                    }
                }, 100);
            }
        }
        
        // Remove input and show original element
        input.remove();
        amountEl.style.display = 'block';
    }
    
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

// ===== HELPER: UPDATE CATEGORY PERCENTAGE FROM TOTAL ALLOCATION =====
async function updateCategoryPercentageFromTotalAllocation(category, newTotalAllocation) {
    console.log(`Updating percentage for ${category} from total allocation: ${newTotalAllocation}`);
    
    const monthlyBudget = MONTHLY_BUDGET;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Please log in again');
        window.location.href = '/login/login.html';
        return;
    }
    
    if (category === 'Bills') {
        // Bills is percentage of total
        const newPercentage = (newTotalAllocation / monthlyBudget) * 100;
        categoryPercentages.Bills = Math.min(100, Math.max(0, newPercentage));
        console.log(`New Bills percentage: ${categoryPercentages.Bills}%`);
    } else {
        // Other categories are from the remaining after Bills
        const billsBudget = (categoryPercentages.Bills / 100) * monthlyBudget;
        const remainingBudget = monthlyBudget - billsBudget;
        
        if (remainingBudget > 0) {
            const newPercentage = (newTotalAllocation / remainingBudget) * 100;
            categoryPercentages[category] = Math.min(100, Math.max(0, newPercentage));
            console.log(`New ${category} percentage: ${categoryPercentages[category]}%`);
        }
    }
    
    // Save the updated allocations to database
    await saveBudgetAllocations(session.user.id);
    
    // Recalculate all budgets
    updateCategoryBudgets();
}

// ===== CREATE NEW SAVINGS TARGET =====
async function createNewGoalCompact() {
    const goalTo = document.getElementById('goalToCompact');
    const goalFrom = document.getElementById('goalFromCompact');
    const goalAmount = document.getElementById('goalAmountCompact');
    
    if (!goalTo || !goalFrom || !goalAmount) return;
    
    const goalToValue = goalTo.value;
    const goalFromValue = goalFrom.value;
    const goalAmountValue = goalAmount.value;
    
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
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', addExpense);
    }
    
    const incomeForm = document.getElementById('incomeForm');
    if (incomeForm) {
        incomeForm.addEventListener('submit', addIncome);
    }
    
    const expenseCategory = document.getElementById('expenseCategory');
    if (expenseCategory) {
        expenseCategory.addEventListener('change', updateExpenseSubcategoryDropdown);
    }
    
    const createGoalBtn = document.getElementById('createGoalCompactBtn');
    if (createGoalBtn) {
        createGoalBtn.addEventListener('click', createNewGoalCompact);
    }
    
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
        alert('Please log in again');
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
        console.error('Error adding expense:', error);
        alert('Failed to add expense');
    }
}

// ===== ADD INCOME =====
async function addIncome(event) {
    event.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('Please log in again');
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
        console.error('Error adding income:', error);
        alert('Failed to add income: ' + error.message);
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

// ===== DELETE INCOME =====
async function deleteIncome(id) {
    if (!confirm('Delete this income?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('Please log in again');
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
        console.error('Error deleting income:', error);
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
    
    const homeTab = document.getElementById('homeTab');
    const budgetsTab = document.getElementById('budgetsTab');
    const savingsTab = document.getElementById('savingsTab');
    const listTab = document.getElementById('listTab');
    
    if (!homeBtn || !budgetsBtn || !addBtn || !savingsBtn || !listBtn) {
        console.error('Tab navigation buttons not found');
        return;
    }
    
    function switchTab(tabId, activeButton) {
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
        activeButton.classList.add('active');
    }
    
    homeBtn.addEventListener('click', () => {
        switchTab('homeTab', homeBtn);
        currentTab = 'home';
    });
    
    budgetsBtn.addEventListener('click', () => {
        switchTab('budgetsTab', budgetsBtn);
        currentTab = 'budgets';
        updateCategoryBudgets();
    });
    
    addBtn.addEventListener('click', () => {
        openAddTransactionModal();
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
function openAddTransactionModal() {
    const modal = document.getElementById('addTransactionModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    isModalOpen = true;
    
    const today = new Date().toISOString().split('T')[0];
    const expenseDate = document.getElementById('expenseDate');
    const incomeDate = document.getElementById('incomeDate');
    
    if (expenseDate) expenseDate.value = today;
    if (incomeDate) incomeDate.value = today;
    
    showExpenseForm();
}

function closeAddTransactionModal() {
    const modal = document.getElementById('addTransactionModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    isModalOpen = false;
}

// ===== MODAL TOGGLE FUNCTIONS =====
function showExpenseForm() {
    const expenseForm = document.getElementById('expenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    
    if (expenseForm) expenseForm.style.display = 'block';
    if (incomeForm) incomeForm.style.display = 'none';
    
    if (expenseToggle) expenseToggle.classList.add('active');
    if (incomeToggle) incomeToggle.classList.remove('active');
}

function showIncomeForm() {
    const expenseForm = document.getElementById('expenseForm');
    const incomeForm = document.getElementById('incomeForm');
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    
    if (expenseForm) expenseForm.style.display = 'none';
    if (incomeForm) incomeForm.style.display = 'block';
    
    if (expenseToggle) expenseToggle.classList.remove('active');
    if (incomeToggle) incomeToggle.classList.add('active');
}

function setupModalToggle() {
    const expenseToggle = document.getElementById('expenseToggleBtn');
    const incomeToggle = document.getElementById('incomeToggleBtn');
    
    if (expenseToggle) {
        expenseToggle.addEventListener('click', showExpenseForm);
    }
    
    if (incomeToggle) {
        incomeToggle.addEventListener('click', showIncomeForm);
    }
}

// ===== INITIALIZE APP =====
async function initializeApp(user) {
    try {
        await loadBudget(user.id);
        await loadExpenses(user.id);
        await loadIncomes(user.id);
        await loadSavingsTargets(user.id);
        await loadBudgetAllocations(user.id); // Load saved budget allocations
        await displayUserName(user.id);
        
        setMonthFromLatestExpense();
        updateMonthDisplay();
        updateDashboard();
        setupEventListeners();
        setupTabNavigation();
        setupLockIcon();
        setupBudgetCardLocks();
        setupModalToggle();
        
        const cancelBtn = document.getElementById('cancelAddTransaction');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAddTransactionModal);
        }
        
        const modal = document.getElementById('addTransactionModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAddTransactionModal();
                }
            });
        }
        
        setupLogoutButton();
        
        console.log('App initialized successfully with MONTHLY_BUDGET:', MONTHLY_BUDGET);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}