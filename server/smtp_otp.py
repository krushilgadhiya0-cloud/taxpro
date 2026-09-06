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
    subject = f"{otp_code} is your TaxPro verification code"
    
    html_content = f"""<!DOCTYPE html>
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

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"TaxPro <{smtp_user or 'krushilgadhiya138@gmail.com'}>"
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
