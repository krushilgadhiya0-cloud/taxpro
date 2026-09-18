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
    message["From"] = f"{sender_name or 'TaxPro'} <{user}>"
    message["To"] = to_email
    message["Reply-To"] = user
    message["Date"] = email.utils.formatdate(localtime=True)
    message["MIME-Version"] = "1.0"

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
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaxPro Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
    <tr>
      <td>
        <div style="font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; margin-bottom: 20px;">TaxPro</div>
        <h1 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Your Verification Code</h1>
        <p style="font-size: 14px; line-height: 22px; color: #4b5563; margin: 0 0 20px 0;">
          Use the following code to complete your verification on TaxPro. This code will expire in 10 minutes.
        </p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0284c7; display: inline-block;">{otp_code}</span>
        </div>
        <p style="font-size: 13px; line-height: 20px; color: #6b7280; margin: 0 0 24px 0;">
          If you did not request this verification code, you can safely ignore this email. Someone may have entered your email address by mistake.
        </p>
        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: left;">
          TaxPro Practice Management Platform &bull; Automated Account Security
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""

# =========================================================================
# 3. SUBSCRIPTION PURCHASE & PAYMENT RECEIPT EMAIL TEMPLATE
# =========================================================================
def build_subscription_html(name, email, plan_name, amount, payment_id, billing_cycle, expiry_date, origin, receipt_number=None, order_id=None):
    user_name = name or "Valued Subscriber"
    plan = plan_name or "TaxPro Enterprise Professional"
    amt = amount or "₹14,999.00"
    tx_id = payment_id or f"TXN-{os.urandom(4).hex().upper()}"
    rcpt_no = receipt_number or f"REC-RZP-{tx_id[-8:]}"
    ord_id = order_id or f"order_{tx_id[-8:]}"
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
        <div class="tagline">Official Razorpay Payment & Tax Receipt</div>

        <div class="congrats-hero">
          <span class="congrats-badge">🎉 Payment Verified & Confirmed</span>
          <div class="h1-title">Congratulations, {user_name}!</div>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">
            Thank you for purchasing your <b>{plan}</b> subscription via <b>Razorpay Gateway</b>. Your receipt voucher and tax invoice are confirmed below.
          </p>
        </div>

        <div class="receipt-box">
          <div style="font-size: 12px; font-weight: 800; color: #00F0FF; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Official Razorpay Tax Receipt Details</div>
          <div class="receipt-row">
            <span class="receipt-label">Receipt Number</span>
            <span class="receipt-val" style="color: #00FFA3;">{rcpt_no}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Razorpay Order ID</span>
            <span class="receipt-val">{ord_id}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Razorpay Payment ID</span>
            <span class="receipt-val">{tx_id}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Subscribed Plan</span>
            <span class="receipt-val" style="color: #00FFA3;">{plan}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Payment Channel</span>
            <span class="receipt-val">Razorpay (UPI / Card / NetBanking)</span>
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
            <span class="receipt-val" style="color: #00FFA3;">✓ Success (Settled via Razorpay)</span>
          </div>
          <div class="total-row">
            <span style="color: #ffffff;">Total Amount Paid</span>
            <span class="total-val">{amt}</span>
          </div>
        </div>

        <a href="{portal_url}" class="btn">🚀 Access Premium Workspace</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Razorpay Automated Gateway<br>
          Support: support@taxpro.com &bull; Authorized GST Invoice Generated
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 3B. SUBSCRIPTION VALIDITY EXTENSION EMAIL (Remaining + Added = Total Days)
# =========================================================================
def build_validity_update_html(name, email, plan_name, prev_days, added_days, total_days, bonus_days, expiry_date, origin):
    user_name = name or "Valued Subscriber"
    plan = plan_name or "TaxPro Enterprise Professional"
    p_days = int(prev_days or 0)
    a_days = int(added_days or 0)
    t_days = int(total_days or (p_days + a_days))
    bonus = int(bonus_days or 0)
    expiry = expiry_date or "August 23, 2027"
    portal_url = origin or "http://localhost:3000"

    bonus_banner = ""
    if bonus > 0:
        bonus_banner = f"""
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 88, 12, 0.2)); border: 2px solid #f59e0b; border-radius: 18px; padding: 18px; margin: 20px 0; text-align: center;">
          <div style="font-size: 22px; margin-bottom: 4px;">🎁 🌟 10th CUSTOMER MILESTONE UNLOCKED! 🌟 🎁</div>
          <div style="font-size: 14px; font-weight: 900; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">+{bonus} EXTRA BONUS DAY ADDED FREE!</div>
          <p style="font-size: 12px; color: #fef3c7; margin: 6px 0 0 0; line-height: 1.5;">
            Congratulations! You are our <b>10th Customer</b>! In honor of this milestone, we have gifted you <b>+1 Extra Free Day</b> on top of your plan days!
          </p>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #131828; border: 1px solid rgba(91, 82, 224, 0.4); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .hero {{ background: linear-gradient(135deg, rgba(91, 82, 224, 0.18), rgba(0, 240, 255, 0.1)); border: 1px solid rgba(91, 82, 224, 0.35); border-radius: 20px; padding: 24px; margin: 24px 0; text-align: center; }}
        .badge {{ display: inline-block; background: rgba(91, 82, 224, 0.25); border: 1px solid #818cf8; color: #818cf8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 20px; margin-bottom: 10px; }}
        .calc-box {{ background: rgba(0, 0, 0, 0.35); border: 2px dashed rgba(91, 82, 224, 0.55); border-radius: 20px; padding: 24px; margin: 24px 0; text-align: center; }}
        .formula-table {{ width: 100%; border-collapse: collapse; margin: 14px 0; }}
        .formula-cell {{ text-align: center; vertical-align: middle; padding: 6px; font-family: monospace; }}
        .num-box {{ display: inline-block; padding: 8px 14px; border-radius: 12px; font-size: 18px; font-weight: 900; }}
        .summary-list {{ background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 20px; margin: 20px 0; text-align: left; }}
        .summary-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; }}
        .summary-row:last-child {{ border-bottom: none; }}
        .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #5b52e0, #00F0FF); color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(91, 82, 224, 0.4); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO AI ENTERPRISE</div>
        <div class="tagline">Official Workspace Validity Calculation</div>

        <div class="hero">
          <span class="badge">📅 Days Added Successfully</span>
          <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-bottom: 8px;">Subscription Extended, {user_name}!</div>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.5;">
            Your payment for <b>{plan}</b> has been settled and your workspace subscription period has been updated.
          </p>
        </div>

        {bonus_banner}

        <div class="calc-box">
          <div style="font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 2px;">
            Accredited Days Calculation
          </div>
          
          <table class="formula-table">
            <tr>
              <td class="formula-cell">
                <span class="num-box" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15);">
                  {p_days} Days
                </span>
                <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Remaining</div>
              </td>
              <td class="formula-cell" style="font-size: 24px; color: #818cf8; font-weight: 900;">+</td>
              <td class="formula-cell">
                <span class="num-box" style="background: rgba(0,255,163,0.12); color: #00FFA3; border: 1px solid rgba(0,255,163,0.35);">
                  +{a_days} Days
                </span>
                <div style="font-size: 10px; color: #00FFA3; margin-top: 4px;">Added</div>
              </td>
              <td class="formula-cell" style="font-size: 24px; color: #818cf8; font-weight: 900;">=</td>
              <td class="formula-cell">
                <span class="num-box" style="background: rgba(0,240,255,0.18); color: #00F0FF; border: 2px solid #00F0FF; font-size: 24px;">
                  {t_days} Days
                </span>
                <div style="font-size: 10px; color: #00F0FF; margin-top: 4px; font-weight: bold;">Total Active</div>
              </td>
            </tr>
          </table>

          <div style="font-size: 13px; color: #e2e8f0; margin-top: 10px; font-weight: 700;">
            {p_days} Remaining Days + {a_days} Added Days = {t_days} Total Days
          </div>
        </div>

        <div class="summary-list">
          <div style="font-size: 12px; font-weight: 800; color: #00F0FF; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Active Workspace Status</div>
          <div class="summary-row">
            <span style="color: #94a3b8;">Workspace Tier</span>
            <span style="font-weight: 700; color: #ffffff;">{plan}</span>
          </div>
          <div class="summary-row">
            <span style="color: #94a3b8;">Previous Balance</span>
            <span style="font-weight: 700; font-family: monospace; color: #ffffff;">{p_days} Days</span>
          </div>
          <div class="summary-row">
            <span style="color: #94a3b8;">Days Credited This Payment</span>
            <span style="font-weight: 700; font-family: monospace; color: #00FFA3;">+{a_days} Days</span>
          </div>
          <div class="summary-row">
            <span style="color: #94a3b8;">New Total Active Validity</span>
            <span style="font-weight: 900; font-family: monospace; color: #00F0FF; font-size: 15px;">{t_days} Days</span>
          </div>
          <div class="summary-row">
            <span style="color: #94a3b8;">Valid Until</span>
            <span style="font-weight: 700; color: #ffffff;">{expiry}</span>
          </div>
        </div>

        <a href="{portal_url}" class="btn">🚀 Open TaxPro Practice Suite</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Automated Subscription Engine<br>
          Account: {email} &bull; 256-Bit SSL Encrypted
        </div>
      </div>
    </body>
    </html>
    """

# =========================================================================
# 3C. PAYMENT FAILED / DECLINED EMAIL TEMPLATE
# =========================================================================
def build_payment_failed_html(name, email, plan_name, amount, order_id, failure_reason, origin):
    user_name = name or "Valued Client"
    plan = plan_name or "TaxPro Subscription"
    amt = amount or "₹1,999.00"
    o_id = order_id or f"ORD-{os.urandom(4).hex().upper()}"
    reason = failure_reason or "Transaction was cancelled or declined by your bank / UPI app"
    portal_url = origin or "http://localhost:3000"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #18141f; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 24px; padding: 40px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }}
        .logo {{ font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #f87171, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #f87171; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-weight: 700; }}
        .fail-hero {{ background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.08)); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 20px; padding: 24px; margin: 24px 0; text-align: center; }}
        .fail-badge {{ display: inline-block; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 20px; margin-bottom: 10px; }}
        .details-box {{ background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 20px; margin: 20px 0; text-align: left; }}
        .detail-row {{ display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; }}
        .detail-row:last-child {{ border-bottom: none; }}
        .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 14px; text-decoration: none; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4); margin: 28px 0 16px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO PAYMENT NOTICE</div>
        <div class="tagline">Official Payment Status Alert</div>

        <div class="fail-hero">
          <span class="fail-badge">⚠️ Transaction Incomplete</span>
          <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-bottom: 8px;">Payment Could Not Be Processed</div>
          <p style="font-size: 13px; color: #fca5a5; margin: 0; line-height: 1.5;">
            Hello <b>{user_name}</b>, your payment attempt on Razorpay for <b>{plan}</b> was not completed.
          </p>
        </div>

        <div class="details-box">
          <div style="font-size: 12px; font-weight: 800; color: #f87171; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Transaction Details</div>
          <div class="detail-row">
            <span style="color: #94a3b8;">Order ID</span>
            <span style="font-weight: 700; font-family: monospace; color: #ffffff;">{o_id}</span>
          </div>
          <div class="detail-row">
            <span style="color: #94a3b8;">Target Plan</span>
            <span style="font-weight: 700; color: #ffffff;">{plan}</span>
          </div>
          <div class="detail-row">
            <span style="color: #94a3b8;">Amount</span>
            <span style="font-weight: 700; font-family: monospace; color: #fb923c;">{amt}</span>
          </div>
          <div class="detail-row">
            <span style="color: #94a3b8;">Failure Reason</span>
            <span style="font-weight: 700; color: #f87171;">{reason}</span>
          </div>
          <div class="detail-row">
            <span style="color: #94a3b8;">Status</span>
            <span style="font-weight: 800; color: #ef4444;">✕ Failed / Unsettled</span>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px; margin-top: 14px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          🛡️ <b>Safe & Protected:</b> If any amount was deducted by your bank, it will be automatically refunded by Razorpay to your original payment source within 2 to 4 business days.
        </div>

        <a href="{portal_url}" class="btn">🔄 Retry Payment with Razorpay</a>

        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Razorpay Payment Engine<br>
          Need assistance? Contact support@taxpro.com &bull; SSL Secured
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
            subject = f"{otp_code} is your TaxPro verification code"
            plain_text = f"Your TaxPro verification code is: {otp_code}\n\nThis code is valid for 10 minutes. If you did not request this code, you can safely ignore this message.\n\n— TaxPro Support"
            result = send_email_via_smtplib(target_email, subject, html, plain_text, custom_config)
            print(json.dumps(result))

        # 3. SUBSCRIPTION PURCHASE & PAYMENT RECEIPT CONFIRMATION
        elif action in ["subscription", "payment_receipt"]:
            name = payload.get("name", "Valued Subscriber")
            plan_name = payload.get("plan_name", "TaxPro Enterprise Professional Plan")
            amount = payload.get("amount", "₹14,999.00")
            payment_id = payload.get("payment_id", f"PAY-{os.urandom(4).hex().upper()}")
            receipt_number = payload.get("receipt_number") or f"REC-RZP-{payment_id[-8:]}"
            order_id = payload.get("order_id") or f"order_{payment_id[-8:]}"
            billing_cycle = payload.get("billing_cycle", "Annual Billing")
            expiry_date = payload.get("expiry_date", "August 23, 2027")
            origin = payload.get("origin", "http://localhost:3000")
            html = build_subscription_html(name, target_email, plan_name, amount, payment_id, billing_cycle, expiry_date, origin, receipt_number, order_id)
            subject = f"🎉 Payment Confirmed: Welcome to TaxPro {plan_name}! (Receipt #{receipt_number[-8:]})"
            result = send_email_via_smtplib(target_email, subject, html, f"Congratulations {name}! Your {plan_name} subscription is active. Receipt: {receipt_number}, Payment ID: {payment_id}", custom_config)
            print(json.dumps(result))

        # 3B. SUBSCRIPTION VALIDITY UPDATE EMAIL (Remaining Days + Added Days = Total Days)
        elif action in ["validity_update", "days_update"]:
            name = payload.get("name", "Valued Subscriber")
            plan_name = payload.get("plan_name", "TaxPro Enterprise Plan")
            prev_days = payload.get("prev_days") or payload.get("remaining_days") or 0
            added_days = payload.get("added_days", 30)
            total_days = payload.get("total_days") or (int(prev_days) + int(added_days))
            bonus_days = payload.get("bonus_days", 0)
            expiry_date = payload.get("expiry_date", "August 23, 2027")
            origin = payload.get("origin", "http://localhost:3000")
            html = build_validity_update_html(name, target_email, plan_name, prev_days, added_days, total_days, bonus_days, expiry_date, origin)
            subject = f"📅 Workspace Validity Updated: {prev_days} + {added_days} = {total_days} Days ({plan_name})"
            plain_text = f"Hello {name},\n\nYour workspace subscription validity has been updated:\nRemaining Days ({prev_days}) + Added Days ({added_days}) = Total Days ({total_days})\n\nValid Until: {expiry_date}\n\n— TaxPro Billing Team"
            result = send_email_via_smtplib(target_email, subject, html, plain_text, custom_config)
            print(json.dumps(result))

        # 3C. PAYMENT FAILED / DECLINED ALERT EMAIL
        elif action in ["payment_failed", "payment_error", "payment_declined"]:
            name = payload.get("name", "Valued Client")
            plan_name = payload.get("plan_name", "TaxPro Subscription")
            amount = payload.get("amount", "₹1,999.00")
            order_id = payload.get("order_id", f"ORD-{os.urandom(4).hex().upper()}")
            failure_reason = payload.get("failure_reason") or payload.get("reason") or "Transaction cancelled or declined by bank"
            origin = payload.get("origin", "http://localhost:3000")
            html = build_payment_failed_html(name, target_email, plan_name, amount, order_id, failure_reason, origin)
            subject = f"⚠️ Action Required: Payment Unsuccessful for TaxPro {plan_name}"
            plain_text = f"Hello {name},\n\nYour payment attempt for {plan_name} ({amount}) could not be completed.\nOrder ID: {order_id}\nReason: {failure_reason}\n\nPlease retry your payment on TaxPro. No funds were debited.\n\n— TaxPro Billing Desk"
            result = send_email_via_smtplib(target_email, subject, html, plain_text, custom_config)
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
            origin = payload.get("origin", "https://taxpro-nine.vercel.app")
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
