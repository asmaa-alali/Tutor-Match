# Tutor-Match

## Local Login & OTP Verification

- Run the backend from the project root with `cd backend && node server.js`, then open `http://localhost:3000/Sign%20in/signin.html`.
- Student and tutor logins require a 6-digit OTP that is emailed after `/api/login`. You have three options for local delivery:
  1. **Brevo (production)** – add `BREVO_API_KEY` to `backend/.env`.
  2. **Gmail fallback** – if you do not have Brevo, set `EMAIL_USER` + `EMAIL_PASS` (app password) in `backend/.env` and the OTP will be sent through Gmail SMTP.
  3. **Dev console** – if neither credential is provided, the server logs the code so you can copy it during development.
- When the console fallback is active you’ll see lines like:
  ```
  [login-otp] Dev fallback OTP for student@mail.aub.edu: 123456
  ```
  Enter that code in the modal to finish signing in.
- Always configure Brevo (or a real mailer) before deploying so real users continue receiving OTP emails.
