import sys
import json
import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_smtp_credentials(custom_config=None):
    """
    Resolves SMTP credentials from custom config, environment variables, or defaults.
    """
    config = custom_config or {}
    
    host = config.get("host") or os.environ.get("SMTP_HOST") or "smtp.gmail.com"
    port = int(config.get("port") or os.environ.get("SMTP_PORT") or 587)
    user = config.get("user") or os.environ.get("SMTP_USER") or "krushilgadhiya0@gmail.com"
    password = config.get("pass") or os.environ.get("SMTP_PASS") or ""
    sender_name = config.get("sender_name") or os.environ.get("SMTP_SENDER_NAME") or "TaxPro AI Enterprise"
    
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
        .tagline {{ font-size: 11px; color: #7e8695; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; font-mono; }}
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

def build_invite_html(name, email, role, password, origin):
    portal_name = "Department Manager Portal" if "manager" in role.lower() else ("Administrator Portal" if "admin" in role.lower() else "Team Member Portal")
    accent_color = "#A855F7" if "manager" in role.lower() else ("#00F0FF" if "admin" in role.lower() else "#00FFA3")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0d12; color: #ffffff; margin: 0; padding: 24px; }}
        .card {{ max-width: 500px; margin: 0 auto; background: #13141f; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 26px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #00FFA3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }}
        .tagline {{ font-size: 11px; color: #7e8695; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 4px; }}
        .role-pill {{ display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid {accent_color}; color: {accent_color}; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 20px; }}
        .creds-box {{ background: rgba(255, 255, 255, 0.04); border: 1.5px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 20px; margin: 24px 0; text-align: left; }}
        .cred-item {{ margin: 8px 0; font-size: 13px; color: #b5bac5; }}
        .cred-val {{ font-family: monospace; font-weight: 800; color: #FFFFFF; font-size: 14px; background: rgba(0,0,0,0.4); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #00F0FF, #0066FF); color: #000000; padding: 14px 32px; border-radius: 14px; font-weight: 800; font-size: 13px; text-decoration: none; box-shadow: 0 10px 25px rgba(0, 240, 255, 0.3); }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 11px; color: #5a606d; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">❖ TAXPRO WORKSPACE</div>
        <div class="tagline">Official Administrator Invitation</div>
        
        <p style="margin-top: 24px; font-size: 14px; color: #e2e8f0; text-align: center;">
          Hello <b>{name}</b>, an Administrator has invited you to join the firm workspace as a:
        </p>
        
        <div style="text-align: center; margin: 12px 0;">
          <span class="role-pill">{role} ({portal_name})</span>
        </div>
        
        <div class="creds-box">
          <div class="cred-item">📧 <b>Login ID (Email):</b> <span class="cred-val">{email}</span></div>
          <div class="cred-item">🔑 <b>Temporary Password:</b> <span class="cred-val">{password or 'password123'}</span></div>
          <div class="cred-item">🌐 <b>Designated Portal:</b> <span class="cred-val">{portal_name}</span></div>
        </div>
        
        <p style="font-size: 12px; color: #8a909d; text-align: center; line-height: 1.5;">
          Direct login is enabled. Use the link below, select the <b>{role} Portal</b>, and enter your credentials.
        </p>
        
        <div style="text-align: center; margin-top: 24px;">
          <a href="{origin or 'http://localhost:3000'}" class="btn">Open Direct Login Portal</a>
        </div>
        
        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Python smtplib Dispatch
        </div>
      </div>
    </body>
    </html>
    """

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

        if action == "otp":
            otp_code = payload.get("otp", "1234")
            html = build_otp_html(otp_code, target_email)
            subject = f"Your TaxPro Verification Code: {otp_code}"
            result = send_email_via_smtplib(target_email, subject, html, f"Your TaxPro verification code is {otp_code}", custom_config)
            print(json.dumps(result))

        elif action == "invite":
            name = payload.get("name", "Team Member")
            role = payload.get("role", "Employee")
            password = payload.get("password", "")
            origin = payload.get("origin", "http://localhost:3000")
            html = build_invite_html(name, target_email, role, password, origin)
            subject = f"Invitation: Join TaxPro Workspace as {role}"
            result = send_email_via_smtplib(target_email, subject, html, f"You are invited to TaxPro as {role}. Login at {origin}", custom_config)
            print(json.dumps(result))

        elif action == "welcome":
            name = payload.get("name", "User")
            subject = "Welcome to TaxPro AI Enterprise Platform"
            html = f"<h2>Welcome to TaxPro, {name}!</h2><p>Your account is active.</p>"
            result = send_email_via_smtplib(target_email, subject, html, f"Welcome to TaxPro, {name}!", custom_config)
            print(json.dumps(result))

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
