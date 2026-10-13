"""Transactional email: password reset delivery with a console fallback."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from ..config import get_settings

logger = logging.getLogger("resume_aid")


class EmailSendError(RuntimeError):
    """Raised when SMTP is configured but the message could not be delivered."""


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send the reset link. Returns True if delivered, False if skipped (dev).

    When SMTP is not configured the link is logged to the server console so the
    flow can still be completed locally without a mail server.
    """
    settings = get_settings()

    if not settings.email_configured:
        logger.warning(
            "SMTP not configured - password reset link for %s: %s", to_email, reset_url
        )
        return False

    sender = settings.smtp_from or settings.smtp_user
    message = EmailMessage()
    message["Subject"] = "Reset your ResumeAid password"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(
        "We received a request to reset your ResumeAid password.\n\n"
        f"Reset it here (link expires in {settings.password_reset_expire_minutes} minutes):\n"
        f"{reset_url}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    message.add_alternative(
        f"""\
<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
  <h2 style="color:#1d4ed8">Reset your ResumeAid password</h2>
  <p>We received a request to reset your password. Click the button below to choose a new one.</p>
  <p style="margin:24px 0">
    <a href="{reset_url}"
       style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;
              text-decoration:none;font-weight:600">Reset password</a>
  </p>
  <p style="font-size:13px;color:#64748b">
    This link expires in {settings.password_reset_expire_minutes} minutes. If you didn't request
    this, you can safely ignore this email.
  </p>
</div>""",
        subtype="html",
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:  # pragma: no cover - network path
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)
        raise EmailSendError("Could not send the recovery email. Please try again later.")

    logger.info("Password reset email sent to %s", to_email)
    return True
