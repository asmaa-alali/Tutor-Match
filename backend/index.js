app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5500/forgot-password/forgot-password.html'
        });

        if (error) throw error;

        res.send('If your email exists, a reset link has been sent!');
    } catch (err) {
        console.log(err);
        res.status(400).send('Error sending password reset email.');
    }
});
