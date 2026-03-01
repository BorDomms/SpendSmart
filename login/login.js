// public/login/login.js
console.log('🚀 Login.js started');

// Regular import for supabase
import { supabase } from '/supabase.js';

// ===== TOGGLE PASSWORD VISIBILITY =====
document.getElementById('togglePassword')?.addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// ===== HANDLE LOGIN =====
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const originalButtonText = loginButton.innerHTML;
    
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginButton.disabled = true;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('Login successful for:', data.user.email);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            console.log('Session verified, redirecting...');
            window.location.href = '/main/main.html';
        } else {
            throw new Error('Session not established');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        loginButton.innerHTML = '<i class="fas fa-times"></i> Login Failed';
        loginButton.style.background = '#f56565';
        
        setTimeout(() => {
            loginButton.innerHTML = originalButtonText;
            loginButton.style.background = '#6a994e';
            loginButton.disabled = false;
        }, 1500);
    }
});

// ===== SIGN UP LINK =====
document.getElementById('signupLink')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'signup.html';
});