// Listen for form submission
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgotEmail').value;

    try {
        const response = await fetch('http://localhost:3000/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const message = await response.text();
        alert(message); // or use your notification function
    } catch (error) {
        console.error(error);
        alert('Error sending reset email.');
    }
});
