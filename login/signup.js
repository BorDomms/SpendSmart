// public/login/signup.js
import { supabase } from '../supabase.js'

// ===== TOGGLE PASSWORD VISIBILITY =====
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
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
});

// ===== PASSWORD STRENGTH INDICATOR =====
const passwordInput = document.getElementById('password');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.querySelector('.strength-text');

if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        strengthBar.classList.remove('weak', 'medium', 'strong');
        
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthBar.style.background = '#e2e8f0';
            strengthText.textContent = 'Use at least 6 characters';
        } else if (password.length < 6) {
            strengthBar.style.width = '33%';
            strengthBar.style.background = '#f56565';
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Weak - too short';
        } else if (password.length < 10) {
            strengthBar.style.width = '66%';
            strengthBar.style.background = '#edb458';
            strengthBar.classList.add('medium');
            strengthText.textContent = 'Medium - getting better';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.background = '#6a994e';
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Strong - good job!';
        }
    });
}

// ===== CONFIRM PASSWORD MATCHING =====
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordMatchDiv = document.getElementById('passwordMatch');

if (confirmPasswordInput && passwordMatchDiv && passwordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    passwordInput.addEventListener('input', checkPasswordMatch);
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchDiv = document.getElementById('passwordMatch');
    
    if (!matchDiv) return;
    
    if (confirmPassword.length === 0) {
        matchDiv.textContent = '';
        matchDiv.className = 'password-match';
    } else if (password === confirmPassword) {
        matchDiv.textContent = '✓ Passwords match';
        matchDiv.className = 'password-match match';
    } else {
        matchDiv.textContent = '✗ Passwords do not match';
        matchDiv.className = 'password-match nomatch';
    }
}

// ===== HANDLE SIGNUP =====
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const firstName = document.getElementById('firstName')?.value;
        const lastName = document.getElementById('lastName')?.value;
        const termsChecked = document.getElementById('terms')?.checked;
        
        // Validation
        if (!email || !password || !confirmPassword || !firstName || !lastName) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        if (!termsChecked) {
            alert('You must agree to the Terms of Service');
            return;
        }
        
        const signupButton = document.getElementById('signupButton');
        const originalButtonText = signupButton.innerHTML;
        signupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        signupButton.disabled = true;
        
        try {
            // Create user in Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName
                    }
                }
            });
            
            if (error) throw error;
            
            if (data.user) {
                console.log('Account created successfully for:', data.user.email);
                
                // Small delay to ensure auth session is established
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Create profile entry
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            monthly_budget: 2500
                        }
                    ]);
                
                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Still redirect to login even if profile fails
                    window.location.href = 'login.html';
                    return;
                }
                
                // Redirect to login page without alert
                window.location.href = 'login.html';
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            
            if (error.message?.includes('User already registered')) {
                alert('This email is already registered. Please login instead.');
            } else if (error.message?.includes('429')) {
                alert('Too many attempts. Please wait a moment and try again.');
            } else {
                alert('Signup failed: ' + (error.message || 'Unknown error'));
            }
            
            signupButton.innerHTML = originalButtonText;
            signupButton.disabled = false;
        }
    });
}

// ===== LINK TO LOGIN PAGE =====
const loginLink = document.getElementById('loginLink');
if (loginLink) {
    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'login.html';
    });
}

// ===== TERMS AND PRIVACY LINKS =====
const termsLink = document.getElementById('termsLink');
if (termsLink) {
    termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Terms of Service will be here soon!');
    });
}

const privacyLink = document.getElementById('privacyLink');
if (privacyLink) {
    privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Privacy Policy will be here soon!');
    });
}