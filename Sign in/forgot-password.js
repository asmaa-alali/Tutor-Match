import { supabase } from '../database/supaBaseClient.js'; // adjust path if needed

// Listen for form submission
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgotEmail').value;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5500/frontend/forgot-password/forgot-password.html'
        });

        if (error) throw error;

        alert('If your email exists, a reset link has been sent!');
    } catch (err) {
        console.error(err);
        alert('Error sending reset email.');
    }
});
