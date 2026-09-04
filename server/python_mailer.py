import sys
import json
import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import email.utils
import time

def get_smtp_credentials(custom_config=None):
    """
    Resolves SMTP credentials from custom config, environment variables, or defaults.
    """
    config = custom_config or {}
    
    host = config.get("host") or os.environ.get("SMTP_HOST") or "smtp.gmail.com"
    port = int(config.get("port") or os.environ.get("SMTP_PORT") or 587)
    user = config.get("user") or os.environ.get("SMTP_USER") or "krushilgadhiya138@gmail.com"
    password = config.get("pass") or os.environ.get("SMTP_PASS") or "zxzqedanapymshgm"
    sender_name = config.get("sender_name") or os.environ.get("SMTP_SENDER_NAME") or "TaxPro Enterprise"
    
    return host, port, user, password, sender_name

def send_email_via_smtplib(to_email, subject, html_content, text_content=None, custom_config=None):
    """
    Core Python smtplib execution engine.
    Establishes secure TLS/SSL socket and transmits RFC 5322 MIME messages.
    """
    host, port, user, password, sender_name = get_smtp_credentials(custom_config)
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{sender_name} <{user}>"
    message["To"] = to_email
    message["Reply-To"] = user
    message["Date"] = email.utils.formatdate(localtime=True)
    message["Message-ID"] = email.utils.make_msgid(domain="taxpro.com")
    message["MIME-Version"] = "1.0"
    message["X-Mailer"] = "TaxPro Enterprise Platform"
    message["X-Priority"] = "1 (Highest)"
    message["Importance"] = "High"

    if text_content:
        message.attach(MIMEText(text_content, "plain"))
    if html_content:
        message.attach(MIMEText(html_content, "html"))

    if not password:
        # If no SMTP app password configured, log and report clean status
        return {
            "success": True,
            "simulated": True,
            "to": to_email,
            "subject": subject,
            "message": f"[Python smtplib] Prepared message for {to_email}. Configure SMTP_PASS in .env or Settings for direct inbox delivery."
        }

    try:
        context = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                server.login(user, password)
                server.sendmail(user, to_email, message.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.sendmail(user, to_email, message.as_string())
        
        return {
            "success": True,
            "to": to_email,
            "subject": subject,
            "host": host,
            "message": f"Successfully delivered via Python smtplib to {to_email}"
        }
    except Exception as err:
        return {
            "success": False,
            "error": str(err),
            "to": to_email,
            "host": host
        }

# =========================================================================
# 1. WELCOME EMAIL TEMPLATE
# =========================================================================
def build_welcome_html(name, email, role, origin):
    user_name = name or "Valued Partner"
    portal_url = origin or "http://localhost:3000"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #131828; border: 1px solid rgba(91, 82, 224, 0.3); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #00FFA3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .hero-banner {{ background: linear-gradient(135deg, rgba(91, 82, 224, 0.15), rgba(0, 240, 255, 0.1)); border: 1px solid rgba(91, 82, 224, 0.3); border-radius: 20px; padding: 24px; margin: 28px 0; text-align: center; }}
        .h1-title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 8px; }}
        .feature-grid {{ margin: 24px 0; }}
        .feature-item {{ background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px; margin-bottom: 12px; }}
        .feature-title {{ font-size: 13px; font-weight: 700; color: #00F0FF; margin-bottom: 3px; }}
        .feature-desc {{ font-size: 12px; color: #94a3b8; line-height: 1.4; }}
        .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #5b52e0, #00F0FF); color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(91, 82, 224, 0.4); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO AI ENTERPRISE</div>
        <div class="tagline">Official Practice Management & Financial Super-Intelligence</div>
        
        <div class="hero-banner">
          <div class="h1-title">Welcome to the Firm Workspace, {user_name}! 👋</div>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">
            Your account is officially active. You now have complete access to autonomous practice management, client registers, and financial intelligence.
          </p>
        </div>

        <div class="feature-grid">
          <div class="feature-item">
            <div class="feature-title">⚡ TaxPro ASI Cognitive Core</div>
            <div class="feature-desc">Continuous real-time memory and intelligence grounded directly in your active PostgreSQL database.</div>
          </div>
          <div class="feature-item">
            <div class="feature-title">📊 Client Directory & Compliance Ledger</div>
            <div class="feature-desc">High-density A4 master registers, PAN/GSTIN verification, and instant compliance tracking.</div>
          </div>
          <div class="feature-item">
            <div class="feature-title">💳 Automated Fees, Invoicing & Payroll</div>
            <div class="feature-desc">Real-time payment verification, Razorpay integration, and instant receipt generation.</div>
          </div>
        </div>

        <a href="{portal_url}" class="btn">🚀 Open TaxPro Dashboard</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Python smtplib Secure Dispatch<br>
          Account Email: {email} &bull; Security Status: Active
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 2. OTP VERIFICATION EMAIL TEMPLATE
# =========================================================================
def build_otp_html(otp_code, target_email):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 480px; margin: 0 auto; background: #13141f; border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 26px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #00FFA3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #7e8695; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; }}
        .otp-box {{ background: rgba(0, 240, 255, 0.06); border: 2px dashed #00F0FF; border-radius: 18px; padding: 20px; text-align: center; margin: 28px 0; }}
        .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 14px; color: #FFFFFF; font-family: monospace; text-shadow: 0 0 25px rgba(0, 240, 255, 0.7); }}
        .desc {{ font-size: 14px; color: #b5bac5; line-height: 1.6; text-align: center; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #5a606d; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; }}
        .badge {{ display: inline-block; background: rgba(0, 255, 163, 0.12); border: 1px solid rgba(0, 255, 163, 0.35); color: #00FFA3; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 20px; margin-top: 12px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO AI</div>
        <div class="tagline">Python smtplib Security Dispatch</div>
        
        <p class="desc" style="margin-top: 24px;">Hello <b>{target_email}</b>,</p>
        <p class="desc">Here is your single-use 4-digit verification code to access your TaxPro AI account:</p>
        
        <div class="otp-box">
          <div class="otp-code">{otp_code}</div>
        </div>
        
        <p class="desc" style="font-size: 12px; color: #8a909d;">
          This code expires in <b>10 minutes</b>. Never share this code with anyone.
        </p>
        
        <div style="text-align: center;">
          <span class="badge">🔒 Python smtplib TLS Encrypted</span>
        </div>
        
        <div class="footer">
          TaxPro Financial Operations &bull; Automated SecOps Mailer
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 3. SUBSCRIPTION PURCHASE & PAYMENT RECEIPT EMAIL TEMPLATE
# =========================================================================
def build_subscription_html(name, email, plan_name, amount, payment_id, billing_cycle, expiry_date, origin):
    user_name = name or "Valued Subscriber"
    plan = plan_name or "TaxPro Enterprise Professional"
    amt = amount or "₹14,999.00"
    tx_id = payment_id or f"TXN-{os.urandom(4).hex().upper()}"
    cycle = billing_cycle or "Annual License"
    expiry = expiry_date or "August 23, 2027"
    portal_url = origin or "http://localhost:3000"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #131828; border: 1px solid rgba(0, 255, 163, 0.35); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #00FFA3, #00F0FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #00FFA3; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .congrats-hero {{ background: linear-gradient(135deg, rgba(0, 255, 163, 0.12), rgba(0, 240, 255, 0.08)); border: 1px solid rgba(0, 255, 163, 0.3); border-radius: 20px; padding: 24px; margin: 24px 0; text-align: center; }}
        .congrats-badge {{ display: inline-block; background: rgba(0, 255, 163, 0.18); border: 1px solid #00FFA3; color: #00FFA3; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 20px; margin-bottom: 10px; }}
        .h1-title {{ font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 8px; }}
        .receipt-box {{ background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 20px; margin: 24px 0; text-align: left; }}
        .receipt-row {{ display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; }}
        .receipt-label {{ color: #94a3b8; }}
        .receipt-val {{ font-weight: 700; color: #ffffff; font-family: monospace; }}
        .total-row {{ display: flex; justify-content: space-between; padding: 14px 0 4px; border-top: 2px dashed rgba(255, 255, 255, 0.2); font-size: 15px; font-weight: 800; }}
        .total-val {{ color: #00FFA3; font-size: 20px; font-family: monospace; font-weight: 900; }}
        .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #00FFA3, #00F0FF); color: #0b0f19; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(0, 255, 163, 0.35); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO AI ENTERPRISE</div>
        <div class="tagline">Official Subscription & Payment Confirmation</div>

        <div class="congrats-hero">
          <span class="congrats-badge">🎉 Payment Verified & Confirmed</span>
          <div class="h1-title">Congratulations, {user_name}!</div>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">
            Thank you for purchasing your <b>{plan}</b> subscription. Your premium workspace features, AI engines, and unlimited firm capacity are fully unlocked!
          </p>
        </div>

        <div class="receipt-box">
          <div style="font-size: 12px; font-weight: 800; color: #00F0FF; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Official Tax Invoice & Receipt Details</div>
          <div class="receipt-row">
            <span class="receipt-label">Invoice Number</span>
            <span class="receipt-val">INV-{tx_id[-6:]}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Transaction Reference</span>
            <span class="receipt-val">{tx_id}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Subscribed Plan</span>
            <span class="receipt-val" style="color: #00FFA3;">{plan}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Billing Cycle</span>
            <span class="receipt-val">{cycle}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Active Period Valid Until</span>
            <span class="receipt-val">{expiry}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Payment Status</span>
            <span class="receipt-val" style="color: #00FFA3;">✓ Success (Paid)</span>
          </div>
          <div class="total-row">
            <span style="color: #ffffff;">Total Amount Paid</span>
            <span class="total-val">{amt}</span>
          </div>
        </div>

        <a href="{portal_url}" class="btn">🚀 Access Premium Workspace</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Python smtplib Automated Billing<br>
          Support: support@taxpro.com &bull; Authorized GST Invoice Generated
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 4. LAST 5-DAY DUE REMINDER EMAIL TEMPLATE
# =========================================================================
def build_due_reminder_html(name, email, item_name, due_date, amount_due, client_name, days_left, origin):
    user_name = name or "Valued Client"
    item = item_name or "Monthly GST Compliance / Retainer Fee"
    due = due_date or "August 28, 2026"
    amt = amount_due or "₹7,500.00"
    days = days_left or 5
    client = client_name or "TaxPro Enterprise Client"
    portal_url = origin or "http://localhost:3000"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #1a1523; border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #f87171, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #f87171; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .due-hero {{ background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.08)); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 20px; padding: 24px; margin: 24px 0; text-align: center; }}
        .due-badge {{ display: inline-block; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 6px 18px; border-radius: 20px; margin-bottom: 12px; }}
        .countdown-box {{ background: rgba(0, 0, 0, 0.35); border: 2px dashed rgba(239, 68, 68, 0.5); border-radius: 18px; padding: 18px; text-align: center; margin: 18px 0; }}
        .days-big {{ font-size: 40px; font-weight: 900; color: #ef4444; font-family: monospace; text-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }}
        .due-details {{ background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 20px; margin: 24px 0; text-align: left; }}
        .due-row {{ display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; }}
        .due-row:last-child {{ border-bottom: none; }}
        .due-label {{ color: #94a3b8; }}
        .due-val {{ font-weight: 700; color: #ffffff; font-family: monospace; }}
        .btn-urgent {{ display: block; text-align: center; background: linear-gradient(135deg, #ef4444, #f97316); color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.45); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO COMPLIANCE ALERT</div>
        <div class="tagline">Automated Due Date & Deadline Notice</div>

        <div class="due-hero">
          <span class="due-badge">⚠️ Action Required</span>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">Notice: 5 Days Remaining Before Due Date</div>
          <p style="font-size: 13px; color: #fca5a5; margin: 0; line-height: 1.5;">
            Hello <b>{user_name}</b>, this is an automated priority notice regarding your upcoming compliance deadline and fee payment.
          </p>

          <div class="countdown-box">
            <div style="font-size: 11px; font-weight: 800; color: #fca5a5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">Time Remaining</div>
            <div class="days-big">{days} DAYS LEFT</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">Due on <b>{due}</b></div>
          </div>
        </div>

        <div class="due-details">
          <div style="font-size: 12px; font-weight: 800; color: #fca5a5; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Invoice & Deadline Summary</div>
          <div class="due-row">
            <span class="due-label">Client / Account</span>
            <span class="due-val">{client}</span>
          </div>
          <div class="due-row">
            <span class="due-label">Subject / Deliverable</span>
            <span class="due-val" style="color: #f87171;">{item}</span>
          </div>
          <div class="due-row">
            <span class="due-label">Final Due Date</span>
            <span class="due-val">{due}</span>
          </div>
          <div class="due-row">
            <span class="due-label">Outstanding Amount</span>
            <span class="due-val" style="color: #fb923c; font-size: 15px;">{amt}</span>
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
          Please settle this invoice or submit the required compliance documents to prevent statutory late fees or service interruption.
        </p>

        <a href="{portal_url}" class="btn-urgent">💳 Pay Invoice & Settle Now</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Python smtplib Automated Alerts<br>
          Automated System Dispatch &bull; Confidential
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 5. INVITATION EMAIL TEMPLATE
# =========================================================================
def build_invite_html(name, email, role, password, origin, member_id=""):
    user_name = name or "Team Member"
    user_role = role or "Employee"
    user_pass = password or "TaxPro@1234"
    portal_url = origin or "http://localhost:3000"
    emp_id = member_id or "EMP-100000"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #131828; border: 1px solid rgba(91, 82, 224, 0.4); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #00FFA3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .hero-banner {{ background: linear-gradient(135deg, rgba(91, 82, 224, 0.2), rgba(0, 240, 255, 0.12)); border: 1px solid rgba(91, 82, 224, 0.4); border-radius: 20px; padding: 24px; margin: 28px 0; text-align: center; }}
        .role-badge {{ display: inline-block; background: rgba(0, 240, 255, 0.15); border: 1px solid #00F0FF; color: #00F0FF; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 6px 16px; border-radius: 20px; margin-bottom: 12px; }}
        .creds-box {{ background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 20px; margin: 24px 0; text-align: left; }}
        .cred-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-size: 13px; }}
        .cred-row:last-child {{ border-bottom: none; }}
        .cred-label {{ color: #94a3b8; font-weight: 500; }}
        .cred-val {{ font-weight: 800; color: #ffffff; font-family: monospace; }}
        .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #5b52e0, #00F0FF); color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(91, 82, 224, 0.4); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">TAXPRO AI ENTERPRISE</div>
        <div class="tagline">Official Workspace Invitation</div>
        
        <div class="hero-banner">
          <span class="role-badge">{user_role} INVITATION</span>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
            You are Invited to Join the Firm Workspace, {user_name}!
          </div>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">
            An Administrator has provisioned your TaxPro account. Use the credentials below to sign in directly to your assigned workspace.
          </p>
        </div>

        <div class="creds-box">
          <div style="font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Your Access Credentials</div>
          <div class="cred-row">
            <span class="cred-label">Employee ID</span>
            <span class="cred-val" style="color: #00F0FF; font-size: 14px;">{emp_id}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label">Login Email</span>
            <span class="cred-val">{email}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label">Temporary Password</span>
            <span class="cred-val" style="color: #00FFA3;">{user_pass}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label">Assigned Role</span>
            <span class="cred-val" style="color: #818cf8;">{user_role}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label">Login Portal</span>
            <span class="cred-val">{portal_url}</span>
          </div>
        </div>

        <a href="{portal_url}" class="btn">Access Workspace &rarr;</a>
        <div class="footer">TaxPro Financial Intelligence Suite &bull; TLS Protected</div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# MAIN JSON-RPC STDIN / ARGV INTERFACE
# =========================================================================
def main():
    payload_str = ""
    if len(sys.argv) > 1 and sys.argv[1].strip():
        payload_str = sys.argv[1].strip()
    elif not sys.stdin.isatty():
        payload_str = sys.stdin.read().strip()

    if not payload_str:
        print(json.dumps({"success": False, "error": "Missing payload"}))
        return

    try:
        payload = json.loads(payload_str)
        action = payload.get("action", "otp")
        target_email = payload.get("email")
        custom_config = payload.get("smtp_config")

        if not target_email:
            print(json.dumps({"success": False, "error": "Recipient email is required"}))
            return

        # 1. WELCOME EMAIL DISPATCH
        if action == "welcome":
            name = payload.get("name", "Team Member")
            role = payload.get("role", "Employee")
            origin = payload.get("origin", "http://localhost:3000")
            html = build_welcome_html(name, target_email, role, origin)
            subject = f"Welcome to TaxPro AI Enterprise, {name}!"
            result = send_email_via_smtplib(target_email, subject, html, f"Welcome to TaxPro AI, {name}! Your account is active.", custom_config)
            print(json.dumps(result))

        # 2. OTP EMAIL DISPATCH
        elif action == "otp":
            otp_code = payload.get("otp", "1234")
            html = build_otp_html(otp_code, target_email)
            subject = f"Your TaxPro Verification Code: {otp_code}"
            result = send_email_via_smtplib(target_email, subject, html, f"Your TaxPro verification code is {otp_code}", custom_config)
            print(json.dumps(result))

        # 3. SUBSCRIPTION PURCHASE & PAYMENT RECEIPT CONFIRMATION
        elif action in ["subscription", "payment_receipt"]:
            name = payload.get("name", "Valued Subscriber")
            plan_name = payload.get("plan_name", "TaxPro Enterprise Professional Plan")
            amount = payload.get("amount", "₹14,999.00")
            payment_id = payload.get("payment_id", f"PAY-{os.urandom(4).hex().upper()}")
            billing_cycle = payload.get("billing_cycle", "Annual Billing")
            expiry_date = payload.get("expiry_date", "August 23, 2027")
            origin = payload.get("origin", "http://localhost:3000")
            html = build_subscription_html(name, target_email, plan_name, amount, payment_id, billing_cycle, expiry_date, origin)
            subject = f"🎉 Payment Confirmed: Welcome to TaxPro {plan_name}! (Receipt #{payment_id[-8:]})"
            result = send_email_via_smtplib(target_email, subject, html, f"Congratulations {name}! Your {plan_name} subscription is active. Receipt: {payment_id}", custom_config)
            print(json.dumps(result))

        # 4. LAST 5-DAY DUE REMINDER
        elif action in ["due_reminder", "deadline_alert"]:
            name = payload.get("name", "Valued Client")
            item_name = payload.get("item_name", "Monthly GST Compliance / Retainer Fee")
            due_date = payload.get("due_date", "August 28, 2026")
            amount_due = payload.get("amount_due", "₹7,500.00")
            client_name = payload.get("client_name", "TaxPro Enterprise Client")
            days_left = payload.get("days_left", 5)
            origin = payload.get("origin", "http://localhost:3000")
            html = build_due_reminder_html(name, target_email, item_name, due_date, amount_due, client_name, days_left, origin)
            subject = f"⚠️ Notice: 5 Days Remaining Before Due Date ({item_name})"
            result = send_email_via_smtplib(target_email, subject, html, f"Urgent Notice: 5 days remaining before due date for {item_name}. Amount due: {amount_due}", custom_config)
            print(json.dumps(result))

        # 5. INVITATION DISPATCH
        elif action == "invite":
            name = payload.get("name", "Team Member")
            role = payload.get("role", "Employee")
            password = payload.get("password", "")
            emp_id = payload.get("id") or payload.get("member_id") or payload.get("employeeId") or "EMP-100000"
            origin = payload.get("origin", "https://taxpro-suite.vercel.app")
            html = build_invite_html(name, target_email, role, password, origin, emp_id)
            subject = f"TaxPro Workspace Invitation for {name} ({emp_id})"
            plain_text = f"""Hello {name},

You have been invited to join the TaxPro Practice Management Platform as an authorized {role}.

ACCOUNT ACCESS CREDENTIALS:
--------------------------------------------------
Assigned Role:       {role}
Employee ID:         {emp_id}
Login Email:         {target_email}
Temporary Password:  {password}
Login Portal:        {origin}
--------------------------------------------------

Please sign in using either your Employee ID ({emp_id}) or your Email ({target_email}) with your Temporary Password ({password}) to access firm clients, projects, and tasks.
For security, please update your password after your initial login.

TaxPro Practice Management Platform & Practice Intelligence
Secured via Google SMTP TLS
"""
            result = send_email_via_smtplib(target_email, subject, html, plain_text, custom_config)
            print(json.dumps(result))

        # 6. RESET PASSWORD DISPATCH
        elif action == "reset_password":
            token = payload.get("token", "")
            subject = "TaxPro: Reset Your Password"
            html = f"<h2>Password Reset Request</h2><p>Use code {token} to reset your password.</p>"
            result = send_email_via_smtplib(target_email, subject, html, f"Reset code: {token}", custom_config)
            print(json.dumps(result))

        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
