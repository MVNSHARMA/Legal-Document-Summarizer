"""
email_service.py — Gmail SMTP email service for sending analysis reports.

Requires GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env.
Gmail App Password setup:
  1. Enable 2-Factor Authentication on your Gmail account
  2. Go to: https://myaccount.google.com/apppasswords
  3. Create an App Password for "Mail"
  4. Paste the 16-character password (no spaces) into GMAIL_APP_PASSWORD
"""

from __future__ import annotations

import os
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

GMAIL_USER         = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")


def send_analysis_email(
    recipient_email: str,
    recipient_name: str,
    case_data: dict,
    pdf_bytes: bytes | None = None,
) -> bool:
    """
    Send an HTML analysis report email with an optional PDF attachment.

    Args:
        recipient_email: Destination email address.
        recipient_name:  Display name of the recipient.
        case_data:       Merged dict of case_overview + case_details fields.
        pdf_bytes:       Optional PDF bytes to attach.

    Returns:
        True on success.

    Raises:
        ValueError: If Gmail credentials are not configured.
        Exception:  If sending fails (caller should handle).
    """
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        raise ValueError(
            "Gmail credentials not configured. "
            "Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env"
        )

    # ── Extract fields ──────────────────────────────────────────────────────
    complainant      = case_data.get("complainant", "Unknown")
    accused          = case_data.get("accused", "Unknown")
    case_title       = f"{complainant} vs {accused}"
    crime            = case_data.get("crime_or_issue", "Legal Analysis")
    judgment         = case_data.get("judgment", "Not available")
    judgment_outcome = case_data.get("judgment_outcome", "Unknown")
    judgment_date    = case_data.get("judgment_date", "Not identified")
    court            = case_data.get("court", "Not identified")
    case_number      = case_data.get("case_number", "Not identified")
    sections         = case_data.get("sections_involved", [])
    what_happened    = case_data.get("what_happened", "Not available")
    penalty          = case_data.get("penalty_or_relief", "Not available")

    # ── Outcome colour ──────────────────────────────────────────────────────
    outcome_colors: dict[str, str] = {
        "Convicted":        "#dc2626",
        "Acquitted":        "#16a34a",
        "Bail Granted":     "#2563eb",
        "Bail Rejected":    "#dc2626",
        "Allowed":          "#16a34a",
        "Dismissed":        "#d97706",
        "Directions Issued":"#0f2744",
    }
    outcome_color = outcome_colors.get(judgment_outcome, "#6b7280")

    # ── Section pills HTML ──────────────────────────────────────────────────
    sections_html = "".join([
        f'<span style="display:inline-block;margin:2px;padding:2px 8px;'
        f'border:1px solid #dc2626;border-radius:99px;font-size:12px;color:#dc2626">'
        f'{s}</span>'
        for s in sections[:8]
    ])

    # ── HTML body ───────────────────────────────────────────────────────────
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9">

  <!-- Header -->
  <div style="background:#0f2744;padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#c9a84c;margin:0;font-size:22px">⚖ LexAnalyze</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0">Legal Document Intelligence</p>
  </div>

  <!-- Case Title -->
  <div style="background:white;padding:24px;border-left:4px solid #0f2744">
    <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase">Case Analysis Report</p>
    <h2 style="color:#0f2744;margin:0 0 8px;font-size:18px">{case_title}</h2>
    <p style="color:#6b7280;margin:0;font-size:13px">{court} | {case_number}</p>
  </div>

  <!-- Outcome Badge -->
  <div style="background:white;padding:16px 24px;border-top:1px solid #f0f0f0">
    <span style="background:{outcome_color};color:white;padding:4px 16px;border-radius:99px;font-size:13px;font-weight:bold">{judgment_outcome}</span>
    <span style="color:#6b7280;font-size:13px;margin-left:12px">{judgment_date}</span>
  </div>

  <!-- What Happened -->
  <div style="background:white;padding:24px;border-top:1px solid #f0f0f0">
    <h3 style="color:#0f2744;font-size:14px;text-transform:uppercase;margin:0 0 8px">What Happened</h3>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0">{what_happened}</p>
  </div>

  <!-- Crime/Issue -->
  <div style="background:white;padding:16px 24px;border-top:1px solid #f0f0f0">
    <h3 style="color:#0f2744;font-size:14px;text-transform:uppercase;margin:0 0 8px">Legal Issue</h3>
    <span style="background:rgba(217,119,6,0.1);color:#d97706;padding:4px 12px;border-radius:99px;font-size:13px">{crime}</span>
  </div>

  <!-- Sections -->
  <div style="background:white;padding:16px 24px;border-top:1px solid #f0f0f0">
    <h3 style="color:#0f2744;font-size:14px;text-transform:uppercase;margin:0 0 8px">Sections Involved</h3>
    {sections_html if sections_html else '<p style="color:#6b7280;font-size:13px">None identified</p>'}
  </div>

  <!-- Judgment -->
  <div style="background:#0f2744;padding:24px;border-radius:0 0 12px 12px">
    <h3 style="color:#c9a84c;font-size:14px;text-transform:uppercase;margin:0 0 8px">Judgment</h3>
    <p style="color:white;font-size:14px;line-height:1.6;margin:0 0 12px">{judgment}</p>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">
      <strong style="color:#c9a84c">Penalty/Relief:</strong> {penalty}
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px">
    <p style="margin:0">Generated by LexAnalyze | <strong>Not legal advice.</strong> Always consult a qualified lawyer.</p>
    <p style="margin:4px 0 0">This report was sent to {recipient_email}</p>
  </div>

</body>
</html>"""

    # ── Plain text fallback ─────────────────────────────────────────────────
    plain_text = f"""LEXANALYZE - LEGAL DOCUMENT ANALYSIS REPORT

Case: {case_title}
Court: {court}
Case Number: {case_number}

OUTCOME: {judgment_outcome} ({judgment_date})

WHAT HAPPENED:
{what_happened}

LEGAL ISSUE: {crime}

SECTIONS: {', '.join(sections) if sections else 'None identified'}

JUDGMENT:
{judgment}

PENALTY/RELIEF: {penalty}

---
Generated by LexAnalyze | Not legal advice.
Always consult a qualified lawyer."""

    # ── Build MIME message ──────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"LexAnalyze Report: {case_title}"
    msg["From"]    = f"LexAnalyze <{GMAIL_USER}>"
    msg["To"]      = recipient_email

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    # ── Optional PDF attachment ─────────────────────────────────────────────
    if pdf_bytes:
        attachment = MIMEBase("application", "octet-stream")
        attachment.set_payload(pdf_bytes)
        encoders.encode_base64(attachment)
        safe_title = case_title.replace(" ", "_").replace("/", "-")[:50]
        attachment.add_header(
            "Content-Disposition",
            f'attachment; filename="LexAnalyze_{safe_title}.pdf"',
        )
        msg.attach(attachment)

    # ── Send via Gmail SMTP SSL ─────────────────────────────────────────────
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, recipient_email, msg.as_string())

    return True
