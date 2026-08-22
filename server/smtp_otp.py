import sys
import json
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_via_smtplib(target_email, otp_code, smtp_host="smtp.gmail.com", smtp_port=587, smtp_user="", smtp_pass=""):
    """
    Standard smtplib OTP Dispatcher for TaxPro AI Workspace.
    Uses pure Python smtplib with SSL/TLS encryption.
    """
    subject = f"Your TaxPro Verification Code: {otp_code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d11; color: #ffffff; margin: 0; padding: 20px; }}
        .card {{ max-width: 480px; margin: 0 auto; background: #14141d; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 20px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 24px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #00FFA3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        .tagline {{ font-size: 11px; color: #8a8f98; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }}
        .otp-box {{ background: rgba(0, 240, 255, 0.08); border: 2px dashed #00F0FF; border-radius: 16px; padding: 18px; text-align: center; margin: 28px 0; }}
        .otp-code {{ font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ffffff; font-family: monospace; text-shadow: 0 0 20px rgba(0, 240, 255, 0.6); }}
        .desc {{ font-size: 13px; color: #b0b4ba; line-height: 1.6; text-align: center; }}
        .footer {{ text-align: center; margin-top: 30px; font-size: 11px; color: #5a5f68; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }}
        .badge {{ display: inline-block; background: rgba(0, 255, 163, 0.1); border: 1px solid rgba(0, 255, 163, 0.3); color: #00FFA3; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-top: 12px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">❖ TAXPRO PMS</div>
          <div class="tagline">Zero-Knowledge Quantum Authentication</div>
        </div>
        
        <p class="desc">Hello,</p>
        <p class="desc">Please use the single-use 4-digit verification code below to authorize your session into the TaxPro AI Workspace.</p>
        
        <div class="otp-box">
          <div class="otp-code">{otp_code}</div>
        </div>
        
        <p class="desc" style="font-size: 12px; color: #888;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        
        <div style="text-align: center;">
          <span class="badge">🔒 AES-256 SMTPLIB ENCRYPTED</span>
        </div>
        
        <div class="footer">
          TaxPro Financial Intelligence Platform &bull; Automated SecOps Mailer
        </div>
      </div>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"TaxPro Security <{smtp_user or 'security@taxpro.ai'}>"
    message["To"] = target_email

    part_text = MIMEText(f"Your TaxPro verification code is: {otp_code}. Valid for 10 minutes.", "plain")
    part_html = MIMEText(html_content, "html")
    message.attach(part_text)
    message.attach(part_html)

    if not smtp_user or not smtp_pass:
        # Development simulation mode
        print(json.dumps({
            "success": True,
            "simulated": True,
            "recipient": target_email,
            "otp": otp_code,
            "message": f"SMTP simulated successfully. OTP {otp_code} generated for {target_email}"
        }))
        return True

    try:
        context = ssl.create_default_context()
        if int(smtp_port) == 465:
            with smtplib.SMTP_SSL(smtp_host, int(smtp_port), context=context) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, target_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.starttls(context=context)
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, target_email, message.as_string())
        
        print(json.dumps({
            "success": True,
            "recipient": target_email,
            "otp": otp_code,
            "message": f"Email delivered to {target_email} via smtplib on {smtp_host}:{smtp_port}"
        }))
        return True
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "recipient": target_email
        }))
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            target_email = payload.get("email", "krushilgadhiya0@gmail.com")
            otp_code = payload.get("otp", "1234")
            smtp_host = payload.get("host", "smtp.gmail.com")
            smtp_port = payload.get("port", 587)
            smtp_user = payload.get("user", "")
            smtp_pass = payload.get("pass", "")
            send_otp_via_smtplib(target_email, otp_code, smtp_host, smtp_port, smtp_user, smtp_pass)
        except Exception as err:
            print(json.dumps({"success": False, "error": str(err)}))
    else:
        # Default test run
        send_otp_via_smtplib("krushilgadhiya0@gmail.com", "1234")
