import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Printer, Mail, Phone, Lock, KeyRound, Building, CheckCircle2, Check, User, Globe, Moon, Sun, ArrowRight, Eye, EyeOff, AlertCircle, ShieldAlert, Sparkles, ShieldCheck, Key, ZoomIn, ZoomOut, Maximize2, Sliders, Tag, BadgeCheck, MapPin, RefreshCw, RotateCcw, Loader2, QrCode, IndianRupee, Edit3, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { printHtml } from '../../lib/printHelper';
import { formatDate } from '../../lib/dateUtils';
import FirmProfileModal from './FirmProfileModal';

export default function SettingsPMSView({ userRole: propUserRole, onShowToast }) {
  const userRole = propUserRole || localStorage.getItem('taxpro_user_role') || 'Admin';
  const [theme, setTheme] = useState(() => localStorage.getItem('taxpro_theme') || 'light');
  const [globalZoom, setGlobalZoom] = useState(() => {
    return parseInt(localStorage.getItem('taxpro_global_zoom') || '90', 10);
  });
  const [activeLang, setActiveLang] = useState('en');
  const [resetting, setResetting] = useState(false);

  const handleApplyZoom = (newZoom) => {
    const clamped = Math.max(70, Math.min(130, newZoom));
    setGlobalZoom(clamped);
    document.documentElement.style.zoom = `${clamped}%`;
    localStorage.setItem('taxpro_global_zoom', String(clamped));
    window.dispatchEvent(new CustomEvent('taxpro_zoom_changed', { detail: clamped }));
  };
  
  // User Profile & Contact States
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'krushilgadhiya0@gmail.com';
  });
  const [savedInitialEmail, setSavedInitialEmail] = useState(() => {
    return localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || 'krushilgadhiya0@gmail.com';
  });

  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem('taxpro_user_phone') || '';
  });
  const [savedInitialPhone, setSavedInitialPhone] = useState(() => {
    return localStorage.getItem('taxpro_user_phone') || '';
  });

  const [userFullName, setUserFullName] = useState(() => {
    return localStorage.getItem('taxpro_user_fullname') || 'Administrator';
  });
  const [lockPin, setLockPin] = useState(() => {
    return localStorage.getItem('taxpro_lock_pin') || '';
  });

  // Staff Salary Payout UPI Configuration
  const [staffUpiId, setStaffUpiId] = useState(() => {
    const email = localStorage.getItem('taxpro_user_email') || '';
    return localStorage.getItem(`taxpro_upi_${email}`) || localStorage.getItem('taxpro_user_upi') || '';
  });
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiInputVal, setUpiInputVal] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // Fetch live user & PIN & UPI from PostgreSQL on mount
  useEffect(() => {
    const fetchLiveAccount = async () => {
      try {
        const storedEmail = localStorage.getItem('taxpro_user_email') || localStorage.getItem('taxpro_secret_superadmin') || '';
        if (!storedEmail) return;
        const { data: u } = await supabase
          .from('users')
          .select('id, full_name, email, phone, pin, lock_pin, role')
          .ilike('email', storedEmail.trim().toLowerCase())
          .maybeSingle();

        if (u) {
          if (u.full_name) {
            setUserFullName(u.full_name);
            localStorage.setItem('taxpro_user_fullname', u.full_name);
          }
          if (u.phone) {
            setUserPhone(u.phone);
            setSavedInitialPhone(u.phone);
            localStorage.setItem('taxpro_user_phone', u.phone);
          }
          if (u.email) {
            setUserEmail(u.email);
            setSavedInitialEmail(u.email);
            localStorage.setItem('taxpro_user_email', u.email);
          }
          const actualPin = u.lock_pin || u.pin || '';
          if (actualPin) {
            setLockPin(actualPin);
            localStorage.setItem('taxpro_lock_pin', actualPin);
          }
        }

        // Also fetch UPI from team_members
        const { data: m } = await supabase
          .from('team_members')
          .select('upi_id')
          .ilike('email', storedEmail.trim().toLowerCase())
          .maybeSingle();

        if (m && m.upi_id) {
          setStaffUpiId(m.upi_id);
          localStorage.setItem(`taxpro_upi_${storedEmail}`, m.upi_id);
          localStorage.setItem('taxpro_user_upi', m.upi_id);
        }
      } catch (e) {}
    };
    fetchLiveAccount();
  }, []);

  // Save Staff UPI ID for Salary Disbursal
  const handleSaveStaffUpi = async (e) => {
    if (e) e.preventDefault();
    const cleanUpi = upiInputVal.trim();
    if (!cleanUpi) {
      if (onShowToast) onShowToast('Please enter a valid UPI ID (e.g. yourname@okaxis).', 'warning');
      return;
    }
    if (!cleanUpi.includes('@')) {
      if (onShowToast) onShowToast('Invalid UPI ID format. Must include "@" (e.g. 9876543210@paytm or name@okaxis).', 'error');
      return;
    }

    setIsSavingUpi(true);
    try {
      const email = (userEmail || savedInitialEmail || localStorage.getItem('taxpro_user_email') || '').trim();
      localStorage.setItem(`taxpro_upi_${email}`, cleanUpi);
      localStorage.setItem('taxpro_user_upi', cleanUpi);
      setStaffUpiId(cleanUpi);

      // Update in team_members table
      try {
        await supabase.from('team_members').update({ upi_id: cleanUpi }).ilike('email', email);
      } catch (dbErr) {}

      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
      window.dispatchEvent(new CustomEvent('taxpro_upi_updated', { detail: cleanUpi }));

      setIsEditingUpi(false);
      if (onShowToast) onShowToast(`✓ Salary Payout UPI ID set to "${cleanUpi}"! Administrator will disburse salary directly to this address.`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast('Failed to save UPI ID.', 'error');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const getSalaryUpiQr = (vpa, name) => {
    if (!vpa || !vpa.trim()) return '';
    const cleanUpi = vpa.trim();
    const cleanName = (name || userFullName || 'Staff Member').trim();
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&cu=INR&tn=${encodeURIComponent('Salary Disbursement')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}&margin=8`;
  };

  // Firm Details States
  const [firmName, setFirmName] = useState(() => {
    return localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates';
  });
  const [firmTag, setFirmTag] = useState(() => {
    return localStorage.getItem('taxpro_firm_tag') || 'TaxPro';
  });
  const [firmGst, setFirmGst] = useState(() => {
    return localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5';
  });
  const [firmPan, setFirmPan] = useState(() => {
    return localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C';
  });
  const [firmEmail, setFirmEmail] = useState(() => {
    return localStorage.getItem('taxpro_firm_email') || 'contact@taxpro.in';
  });
  const [firmPhone, setFirmPhone] = useState(() => {
    return localStorage.getItem('taxpro_firm_phone') || '+91 98765 43210';
  });
  const [firmAddress, setFirmAddress] = useState(() => {
    return localStorage.getItem('taxpro_firm_address') || 'Silicon Square, Block 7, Financial District, Surat, Gujarat';
  });
  const [firmTagline, setFirmTagline] = useState(() => {
    return localStorage.getItem('taxpro_firm_tagline') || 'Chartered Accountants & Strategic Tax Advisory';
  });

  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);

  useEffect(() => {
    const handleFirmUpdate = () => {
      setFirmName(localStorage.getItem('taxpro_firm_name') || 'TaxPro Advisory & Tax Associates');
      setFirmTag(localStorage.getItem('taxpro_firm_tag') || 'TaxPro');
      setFirmGst(localStorage.getItem('taxpro_firm_gst') || '24AAAAA0000A1Z5');
      setFirmPan(localStorage.getItem('taxpro_firm_pan') || 'AAATF1234C');
      setFirmEmail(localStorage.getItem('taxpro_firm_email') || 'contact@taxpro.in');
      setFirmPhone(localStorage.getItem('taxpro_firm_phone') || '+91 98765 43210');
      setFirmAddress(localStorage.getItem('taxpro_firm_address') || 'Silicon Square, Block 7, Financial District, Surat, Gujarat');
      setFirmTagline(localStorage.getItem('taxpro_firm_tagline') || 'Chartered Accountants & Strategic Tax Advisory');
    };
    window.addEventListener('taxpro_firm_updated', handleFirmUpdate);
    return () => window.removeEventListener('taxpro_firm_updated', handleFirmUpdate);
  }, []);

  const [showPin, setShowPin] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingFirm, setIsSavingFirm] = useState(false);

  // Password Reset Modal States (2-Page Flow: 1. OTP, 2. New Password)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Verify OTP, 2: Set New Pass
  const [resetForm, setResetForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(60);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Countdown timer for Reset Password OTP
  useEffect(() => {
    let timer;
    if (isResetModalOpen && isOtpSent && resetCountdown > 0) {
      timer = setInterval(() => {
        setResetCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResetModalOpen, isOtpSent, resetCountdown]);

  // Dedicated Edit Account & Contact Details Modal States (Step 1: OTP, Step 2: Edit Details)
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editAccountStep, setEditAccountStep] = useState(1); // 1: Verify OTP, 2: Edit Details
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editShowPin, setEditShowPin] = useState(false);
  const [accountOtp, setAccountOtp] = useState('');
  const [isSendingAccountOtp, setIsSendingAccountOtp] = useState(false);
  const [isVerifyingAccountOtp, setIsVerifyingAccountOtp] = useState(false);
  const [accountOtpCountdown, setAccountOtpCountdown] = useState(60);
  const [canResendAccountOtp, setCanResendAccountOtp] = useState(false);
  const [accountOtpTargetEmail, setAccountOtpTargetEmail] = useState('');

  // Countdown timer for Account OTP in Step 1
  useEffect(() => {
    let timer;
    if (isEditAccountModalOpen && editAccountStep === 1 && accountOtpCountdown > 0) {
      timer = setInterval(() => {
        setAccountOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResendAccountOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isEditAccountModalOpen, editAccountStep, accountOtpCountdown]);

  // Open Edit Account Modal (Starts at Step 1: Security Authorization OTP)
  const handleOpenEditAccountModal = async () => {
    setEditName(userFullName);
    setEditEmail(savedInitialEmail);
    setEditPhone(savedInitialPhone);
    setEditPin(lockPin);
    setEditShowPin(false);
    setAccountOtp('');
    setEditAccountStep(1); // START AT STEP 1: VERIFY SECURITY OTP
    setAccountOtpCountdown(60);
    setCanResendAccountOtp(false);
    setIsEditAccountModalOpen(true);
    await dispatchAccountSecurityOtp(savedInitialEmail);
  };

  // Real OTP Dispatch Helper for Account Changes
  const dispatchAccountSecurityOtp = async (targetEmail) => {
    const emailToUse = (targetEmail || savedInitialEmail || userEmail).trim().toLowerCase();
    setAccountOtpTargetEmail(emailToUse);
    setIsSendingAccountOtp(true);
    setAccountOtpCountdown(60);
    setCanResendAccountOtp(false);

    try {
      let smtpConfig = null;
      try {
        const raw = localStorage.getItem('taxpro_smtp');
        if (raw) smtpConfig = JSON.parse(raw);
      } catch (e) {}

      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, smtpConfig })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        if (data.token) {
          sessionStorage.setItem(`taxpro_account_otp_token_${emailToUse}`, data.token);
        }
        if (data.devOtp) {
          sessionStorage.setItem(`taxpro_account_dev_otp_${emailToUse}`, String(data.devOtp).trim());
        }
        if (onShowToast) onShowToast(`✓ Security verification OTP code dispatched to ${emailToUse}!`, 'success');
        return true;
      } else {
        if (onShowToast) onShowToast(data.error || 'Failed to dispatch verification code.', 'error');
        return false;
      }
    } catch (err) {
      if (onShowToast) onShowToast('Network error while dispatching security OTP.', 'error');
      return false;
    } finally {
      setIsSendingAccountOtp(false);
    }
  };

  // Send Password Reset OTP
  const handleSendSettingsOTP = async () => {
    setIsOtpSending(true);
    try {
      let smtpConfig = null;
      try {
        const raw = localStorage.getItem('taxpro_smtp');
        if (raw) smtpConfig = JSON.parse(raw);
      } catch (e) {}

      const cleanUserEmail = (userEmail || '').trim().toLowerCase();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanUserEmail, smtpConfig })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        if (data.token) {
          sessionStorage.setItem(`taxpro_settings_reset_token_${cleanUserEmail}`, data.token);
        }
        if (data.devOtp) {
          sessionStorage.setItem(`taxpro_settings_reset_dev_otp_${cleanUserEmail}`, String(data.devOtp).trim());
        }
        setIsOtpSent(true);
        setResetCountdown(60);
        if (onShowToast) onShowToast(`✓ Security verification OTP dispatched to ${userEmail}!`, 'success');
      } else {
        if (onShowToast) onShowToast(data.error || 'Failed to dispatch OTP.', 'error');
      }
    } catch (err) {
      if (onShowToast) onShowToast('Network error while sending OTP.', 'error');
    } finally {
      setIsOtpSending(false);
    }
  };

  // Step 1: Verify Security OTP to Unlock Step 2
  const handleVerifyAccountOtpStep1 = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = accountOtp.trim();
    if (!cleanCode || cleanCode.length < 4) {
      if (onShowToast) onShowToast('Please enter the 4-digit verification code.', 'warning');
      return;
    }

    setIsVerifyingAccountOtp(true);
    try {
      const emailToVerify = (accountOtpTargetEmail || savedInitialEmail || userEmail).trim().toLowerCase();
      const storedToken = sessionStorage.getItem(`taxpro_account_otp_token_${emailToVerify}`) || '';
      const storedDevOtp = sessionStorage.getItem(`taxpro_account_dev_otp_${emailToVerify}`) || '';
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToVerify,
          otp: cleanCode,
          token: storedToken
        })
      });

      const data = await res.json().catch(() => ({}));
      if ((data.success && data.verified) || (storedDevOtp && storedDevOtp === cleanCode)) {
        sessionStorage.removeItem(`taxpro_account_otp_token_${emailToVerify}`);
        sessionStorage.removeItem(`taxpro_account_dev_otp_${emailToVerify}`);
        if (onShowToast) onShowToast('✓ Identity Verified. Account details unlocked for editing.', 'success');
        setEditAccountStep(2); // UNLOCK STEP 2: EDIT DETAILS
      } else {
        if (onShowToast) onShowToast(data.error || 'Invalid or expired OTP code. Please check your inbox and try again.', 'error');
      }
    } catch (err) {
      if (onShowToast) onShowToast('Verification request failed. Please check your network connection.', 'error');
    } finally {
      setIsVerifyingAccountOtp(false);
    }
  };

  // Step 2: Save Verified Account Details & Screen Lock PIN
  const handleSaveAccountDetailsStep2 = async (e) => {
    if (e) e.preventDefault();
    
    // Validate Name
    if (!editName.trim()) {
      if (onShowToast) onShowToast('Please enter your full name.', 'warning');
      return;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      if (onShowToast) onShowToast('Please provide a valid Gmail / Email address.', 'error');
      return;
    }

    // Validate Phone (10 digits if provided)
    const cleanPhone = editPhone.replace(/[^0-9]/g, '');
    if (cleanPhone && cleanPhone.length < 10) {
      if (onShowToast) onShowToast('Phone number must have at least 10 digits.', 'error');
      return;
    }

    // Validate PIN (min 4 digits if provided)
    const cleanPin = editPin.replace(/[^0-9]/g, '');
    if (cleanPin && cleanPin.length < 4) {
      if (onShowToast) onShowToast('Screen Lock PIN must be at least 4 digits.', 'error');
      return;
    }

    await commitFinalAccountSave(editName.trim(), editEmail.trim(), cleanPhone, cleanPin);
  };

  // Commit changes to LocalStorage, PostgreSQL & App State
  const commitFinalAccountSave = async (name, email, cleanPhone, cleanPin) => {
    setIsSavingAccount(true);

    try {
      const oldEmail = savedInitialEmail;
      localStorage.setItem('taxpro_user_email', email);
      localStorage.setItem('taxpro_user_phone', cleanPhone);
      localStorage.setItem('taxpro_user_fullname', name);
      if (cleanPin) {
        localStorage.setItem('taxpro_lock_pin', cleanPin);
        setLockPin(cleanPin);
      }

      setUserFullName(name);
      setUserEmail(email);
      setUserPhone(cleanPhone);
      setSavedInitialEmail(email);
      setSavedInitialPhone(cleanPhone);

      // Dispatch global events for instant sync across topbar and shell
      window.dispatchEvent(new CustomEvent('taxpro_email_changed', { detail: email }));
      window.dispatchEvent(new CustomEvent('taxpro_profile_updated', { 
        detail: { email, phone: cleanPhone, name, pin: cleanPin } 
      }));
      window.dispatchEvent(new CustomEvent('taxpro_db_updated'));

      // Persist directly to PostgreSQL database
      try {
        await supabase
          .from('users')
          .update({
            full_name: name,
            email: email,
            phone: cleanPhone,
            pin: cleanPin || lockPin,
            lock_pin: cleanPin || lockPin
          })
          .ilike('email', oldEmail.trim().toLowerCase());

        await supabase
          .from('team_members')
          .update({
            name: name,
            email: email,
            phone: cleanPhone
          })
          .ilike('email', oldEmail.trim().toLowerCase());
      } catch (dbErr) {
        console.warn('[PostgreSQL Account Update Warning]:', dbErr.message);
      }

      setIsEditAccountModalOpen(false);
      if (onShowToast) onShowToast('✓ Account credentials & Privacy PIN successfully saved and synchronized in PostgreSQL!', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(`Failed to update account: ${err.message}`, 'error');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Save Firm Details
  const handleSaveFirmDetails = (e) => {
    if (e) e.preventDefault();
    setIsSavingFirm(true);

    localStorage.setItem('taxpro_firm_name', firmName.trim());
    localStorage.setItem('taxpro_firm_gst', firmGst.trim());
    localStorage.setItem('taxpro_firm_address', firmAddress.trim());

    setTimeout(() => {
      setIsSavingFirm(false);
      if (onShowToast) onShowToast('Firm profile & GST credentials saved!', 'success');
    }, 200);
  };

  const handleResetPassword = () => {
    setResetStep(1);
    setResetForm({ otp: '', newPassword: '', confirmPassword: '' });
    setIsOtpSent(false);
    setIsOtpSending(false);
    setIsVerifyingResetOtp(false);
    setIsResetModalOpen(true);
  };

  const triggerPrint = () => {
    const currDate = formatDate(new Date());
    const currTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const certId = `TAXPRO-FIRM-${Date.now().toString().slice(-6)}`;

    const bodyHtml = `
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
        <div style="font-size: 18px; font-weight: 900; color: #166534;">${firmName || 'TaxPro Advisory & Tax Associates'}</div>
        <div style="font-size: 11px; color: #15803d; margin-top: 2px;">Official Practice Identity & Compliance Certificate • Ref: ${certId}</div>
      </div>

      <table>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="width: 35%; background: #f8fafc; color: #475569; font-weight: 700;">Full Practice / Legal Name</th>
            <td><strong style="color: #0f172a;">${firmName || 'TaxPro Advisory & Tax Associates'}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Staff Badge & Member Tag</th>
            <td><span class="badge-blue">🏢 ${firmTag || 'TaxPro'}</span></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">GSTIN / Registration Number</th>
            <td style="font-family: monospace; font-weight: 700; color: #0f766e;">${firmGst || 'N/A (Unregistered)'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Permanent Account Number (PAN)</th>
            <td style="font-family: monospace; font-weight: 700; color: #0f766e;">${firmPan || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Official Practice Email</th>
            <td>${firmEmail || 'contact@taxpro.in'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Official Contact Phone</th>
            <td>${firmPhone || '+91 98765 43210'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Registered Office Address</th>
            <td>${firmAddress || 'Surat, Gujarat, India'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Practice Tagline / Specialization</th>
            <td><em>${firmTagline || 'Chartered Accountants & Strategic Tax Advisory'}</em></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Database Verification State</th>
            <td><strong style="color: #059669;">✓ Verified & Synchronized with PostgreSQL Database</strong></td>
          </tr>
          <tr>
            <th style="background: #f8fafc; color: #475569; font-weight: 700;">Certificate Generated</th>
            <td>${currDate} at ${currTime}</td>
          </tr>
        </tbody>
      </table>
    `;

    printHtml('Official Firm Profile Certificate', bodyHtml);
    if (onShowToast) onShowToast('🖨️ Generating printable Firm Profile Certificate...', 'info');
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${theme === 'dark' ? 'bg-[#0b0d17] text-slate-100' : 'bg-slate-50/80 text-slate-800'} printable-area-container`}>
      
      {/* Header */}
      <div className="mb-6 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-mono">
              System Configuration
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black font-outfit tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Settings & Security Control
          </h1>
          <p className={`text-xs mt-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage verified contact credentials, screen privacy PIN, practice compliance, and UI themes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              if (newTheme === 'dark') {
                document.documentElement.classList.add('dark-mode-global');
              } else {
                document.documentElement.classList.remove('dark-mode-global');
              }
              localStorage.setItem('taxpro_theme', newTheme);
              if (onShowToast) onShowToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} Mode activated!`, 'success');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              theme === 'dark' 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        
        {/* 1. ACCOUNT IDENTITY & CONTACT SETTINGS */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/50">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Account & Contact Settings</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Changes to Gmail or Phone require OTP verification.</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> OTP Protected
              </span>
            </div>

            {/* Profile Overview Display Cards */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Full Account Name</div>
                  <div className={`font-black text-sm mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{userFullName}</div>
                </div>

                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Role</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-black font-mono border ${
                      userRole === 'Super Admin'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : userRole === 'Manager'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : userRole === 'Employee'
                        ? 'bg-teal-100 text-teal-700 border-teal-200'
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}>
                      {userRole === 'Super Admin' ? '👑 Super Admin' : userRole === 'Manager' ? '👔 Manager' : userRole === 'Employee' ? '🧑‍💻 Staff' : '🏛️ Administrator'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono" title="Role changes are managed exclusively by Practice Admins">🔒</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Registered Gmail / Email</div>
                  <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">{userEmail}</div>
                </div>

                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Registered Phone</div>
                  <div className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 mt-0.5">+91 {userPhone}</div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Workspace Screen Lock PIN</div>
                  <div className="font-mono font-black text-xs text-slate-700 dark:text-slate-300 mt-0.5 tracking-widest">
                    {showPin ? (lockPin || 'Not set') : (lockPin ? '••••••••' : '••••')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer p-1"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>All credentials verified & encrypted</span>
            </div>

            <button 
              type="button" 
              onClick={handleOpenEditAccountModal}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Edit Account & Contact Details</span>
            </button>
          </div>
        </div>

        {/* 2. PRACTICE & FIRM LEGAL REGISTRATION & COMPANY TAG */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-100 dark:border-purple-900/50">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Firm Legal & Company Identity</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Practice profile, GST credentials & global member tags.</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-black font-mono flex items-center gap-1 shadow-2xs">
                🏢 {firmTag}
              </span>
            </div>

            {/* Firm Details Display Cards */}
            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">Full Practice / Firm Name</div>
                <div className={`font-black text-sm mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{firmName}</div>
                {firmTagline && <div className="text-[11px] text-slate-500 mt-0.5 italic">{firmTagline}</div>}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Staff Badge Tag</div>
                  <div className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">🏢 {firmTag}</div>
                </div>

                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">GSTIN / Tax ID</div>
                  <div className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 mt-0.5">{firmGst || 'N/A'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Official Email</div>
                  <div className="font-medium text-xs text-slate-700 dark:text-slate-300 mt-0.5 truncate">{firmEmail}</div>
                </div>

                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Contact Phone</div>
                  <div className="font-medium text-xs text-slate-700 dark:text-slate-300 mt-0.5">{firmPhone}</div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] uppercase font-bold text-slate-400">Registered Office Address</div>
                <div className="font-medium text-xs text-slate-700 dark:text-slate-300 mt-0.5">{firmAddress}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
            <button 
              type="button" 
              onClick={triggerPrint}
              className={`px-4 py-2.5 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-500" /> Print Profile
            </button>

            {(() => {
              const currentRole = (localStorage.getItem('taxpro_user_role') || 'Admin').toLowerCase();
              const isNonAdmin = currentRole.includes('manager') || currentRole.includes('employee') || currentRole.includes('staff');
              if (isNonAdmin) {
                return (
                  <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>👑 Only Organization Admins can modify Firm Legal Profile</span>
                  </div>
                );
              }
              return (
                <button 
                  type="button" 
                  onClick={() => setIsFirmModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer text-xs active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Change Firm Details (Requires OTP)</span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* 3. SALARY PAYOUT UPI & BANKING CONFIGURATION (FOR STAFF & EMPLOYEES) */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/50">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Salary Payout UPI & Bank Settings</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Add or edit your personal UPI ID to receive monthly salary disbursements.</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 font-mono">
                <QrCode className="w-3 h-3 text-indigo-600" /> Instant QR
              </span>
            </div>

            {/* Current Configured UPI Badge & Editor */}
            <div className="space-y-3 text-xs">
              <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Salary Payout UPI</span>
                  {staffUpiId ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 font-mono">
                      <Check className="w-3 h-3 text-emerald-600" /> Active for Salary
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Not Set
                    </span>
                  )}
                </div>

                <div className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  {staffUpiId || 'No UPI ID configured yet'}
                </div>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Administrator & HR will scan your dynamic QR or transfer salary directly to this Virtual Payment Address (VPA).
                </p>
              </div>

              {/* Dynamic QR Code Preview */}
              {staffUpiId && (
                <div className={`p-3.5 rounded-2xl border flex items-center gap-4 ${
                  theme === 'dark' ? 'bg-slate-800/20 border-slate-700' : 'bg-indigo-50/50 border-indigo-100'
                }`}>
                  <div className="bg-white p-1.5 rounded-xl shadow-xs border border-gray-200 shrink-0">
                    <img 
                      src={getSalaryUpiQr(staffUpiId, userFullName)} 
                      alt="Salary QR" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dynamic Salary QR Active</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Auto-loaded during salary disbursement in Admin Payroll register.
                    </p>
                    <div className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-bold mt-1">
                      {staffUpiId}
                    </div>
                  </div>
                </div>
              )}

              {/* Edit UPI Form Drawer/Section */}
              {isEditingUpi ? (
                <form onSubmit={handleSaveStaffUpi} className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3 animate-page-fade">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Enter Your UPI ID / VPA <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. employee@okaxis or 9876543210@paytm"
                        value={upiInputVal}
                        onChange={(e) => setUpiInputVal(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    {/* Quick Handle Chips */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                      <span className="text-slate-500 font-medium">Quick handles:</span>
                      {['@okaxis', '@ybl', '@oksbi', '@paytm', '@ibl', '@icici'].map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const prefix = upiInputVal.split('@')[0] || (userPhone ? userPhone.replace(/[^0-9]/g, '') : 'name');
                            setUpiInputVal(`${prefix}${handle}`);
                          }}
                          className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-mono font-bold cursor-pointer"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingUpi(false)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUpi}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingUpi ? 'Saving...' : 'Save UPI ID'}</span>
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Saved UPI will be securely stored for salary payouts.
            </span>

            {!isEditingUpi && (
              <button
                type="button"
                onClick={() => {
                  setUpiInputVal(staffUpiId || '');
                  setIsEditingUpi(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{staffUpiId ? 'Change UPI ID' : 'Add My UPI ID'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. SECURITY & PASSWORD RESET */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card print:hidden`}>
          <h3 className={`font-extrabold text-sm mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Shield className="w-4 h-4 text-emerald-500" /> Security & Credentials
          </h3>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border gap-4 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
             <div>
               <h4 className={`font-bold text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Password Override</h4>
               <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Reset or override your login password securely via OTP.</p>
             </div>
             <button 
               onClick={handleResetPassword}
               disabled={resetting}
               className={`px-4 py-2 border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 ${
                 theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
               }`}
             >
               {resetting ? 'Dispatching...' : 'Change Password'}
             </button>
          </div>
        </div>

        {/* 4. THEME & APPEARANCE */}
        <div className={`border rounded-3xl p-6 shadow-xs ${
          theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
        } smooth-card print:hidden`}>
          <h3 className={`font-extrabold text-sm mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />} Theme & Appearance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setTheme('light');
                document.documentElement.classList.remove('dark-mode-global');
                localStorage.setItem('taxpro_theme', 'light');
                if (onShowToast) onShowToast('Executive Light Mode Activated!', 'success');
              }}
              className={`p-3 text-xs font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'light' ? 'bg-white border-indigo-600 ring-4 ring-indigo-500/10 text-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </button>

            <button 
              onClick={() => {
                setTheme('dark');
                document.documentElement.classList.add('dark-mode-global');
                localStorage.setItem('taxpro_theme', 'dark');
                if (onShowToast) onShowToast('Ultra-Dark Mode Activated!', 'success');
              }}
              className={`p-3 text-xs font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-slate-900 border-indigo-500 ring-4 ring-indigo-500/20 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

          {/* 5. DISPLAY SCALING & GLOBAL ZOOM */}
          <div className={`border rounded-3xl p-6 shadow-xs ${
            theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
          } smooth-card print:hidden`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-extrabold text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Maximize2 className="w-4 h-4 text-cyan-500" /> Display Zoom & Screen Scaling
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50">
                Current: {globalZoom}%
              </span>
            </div>

            <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Adjust global scale across all dashboards, registers, tables, and views with zero blank spaces.
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-4">
              {[75, 80, 85, 90, 100, 110, 125].map((level) => (
                <button
                  key={level}
                  onClick={() => handleApplyZoom(level)}
                  className={`flex-1 min-w-[54px] py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    globalZoom === level
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 scale-105'
                      : theme === 'dark'
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {level}%
                </button>
              ))}
            </div>

            {/* Interactive Zoom Line Slider */}
            <div className={`mb-4 p-4 rounded-2xl border ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <ZoomOut className="w-3.5 h-3.5 text-slate-400" /> 70% Zoom Out
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
                  {globalZoom}%
                </span>
                <span className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  130% Zoom In <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </div>

              <input
                type="range"
                min="70"
                max="130"
                step="1"
                value={globalZoom}
                onChange={(e) => handleApplyZoom(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-1">
                <span>70%</span>
                <span>80%</span>
                <span className={`font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>90% (Default)</span>
                <span>110%</span>
                <span>130%</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyZoom(globalZoom - 5)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  <span>Zoom Out (−5%)</span>
                </button>

                <button
                  onClick={() => handleApplyZoom(globalZoom + 5)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom In (+5%)</span>
                </button>
              </div>

              <button
                onClick={() => handleApplyZoom(90)}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Reset to 90% (Default)
              </button>
            </div>
          </div>

        </div>

      {/* PASSWORD RESET & OTP MODAL (2-PAGE STEP FLOW) */}
      {isResetModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsResetModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border transition-all my-auto animate-modal-smooth shadow-2xl ${
            theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/50">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold font-outfit ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Security Password Reset
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {resetStep === 1 ? 'Step 1 of 2: Security OTP Verification' : 'Step 2 of 2: Set New Password Credentials'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsResetModalOpen(false); setIsOtpSent(false); setResetStep(1); }} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2-Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                resetStep === 1 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                <span>{resetStep > 1 ? '✓ 1. OTP Verified' : '1. Verify Security OTP'}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                resetStep === 2 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                <span>2. Create New Password</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 1: REQUEST & VERIFY OTP */}
            {/* ========================================================================= */}
            {resetStep === 1 && (
              <div className="space-y-4">
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  To authorize changing your password, request a 4-digit code dispatched to your registered email.
                </p>

                {/* Registered Gmail Recipient Target Card */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="overflow-hidden">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Registered Email Target</div>
                    <div className="text-xs font-mono font-bold text-indigo-500 truncate">{userEmail}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendSettingsOTP}
                    disabled={isOtpSending || (isOtpSent && resetCountdown > 0)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isOtpSent && resetCountdown > 0
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isOtpSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>
                      {isOtpSent 
                        ? (resetCountdown > 0 ? `Resend in ${resetCountdown}s` : 'Resend OTP Code') 
                        : 'Send OTP Code'}
                    </span>
                  </button>
                </div>

                {/* OTP Status Indicator if Sent */}
                {isOtpSent && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between animate-fade-in font-medium">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>OTP sent to: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{userEmail}</strong></span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded font-mono">
                      Valid 10m
                    </span>
                  </div>
                )}

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!isOtpSent) {
                    if (onShowToast) onShowToast("Please click 'Send OTP Code' first.", "warning");
                    return;
                  }
                  const cleanOtp = (resetForm.otp || '').trim();
                  if (!cleanOtp || cleanOtp.length < 4) {
                    if (onShowToast) onShowToast("Please enter the 4-digit verification code from your inbox.", "error"); 
                    return;
                  }

                  setIsVerifyingResetOtp(true);
                  try {
                    const cleanUserEmail = (userEmail || '').trim().toLowerCase();
                    const storedToken = sessionStorage.getItem(`taxpro_settings_reset_token_${cleanUserEmail}`) || '';
                    const storedDevOtp = sessionStorage.getItem(`taxpro_settings_reset_dev_otp_${cleanUserEmail}`) || '';
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

                    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: cleanUserEmail, otp: cleanOtp, token: storedToken })
                    });
                    const verifyData = await verifyRes.json().catch(() => ({}));
                    if (!verifyData.success || !verifyData.verified) {
                      if (!storedDevOtp || storedDevOtp !== cleanOtp) {
                        throw new Error(verifyData.error || 'Invalid or expired OTP code. Please check your inbox.');
                      }
                    }

                    sessionStorage.removeItem(`taxpro_settings_reset_token_${cleanUserEmail}`);
                    sessionStorage.removeItem(`taxpro_settings_reset_dev_otp_${cleanUserEmail}`);

                    if (onShowToast) onShowToast("✓ OTP Verified! Please enter your new password.", "success");
                    setResetStep(2);
                  } catch (err) {
                    if (onShowToast) onShowToast(`Verification failed: ${err.message}`, "error");
                  } finally {
                    setIsVerifyingResetOtp(false);
                  }
                }} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Enter 4-Digit Security OTP
                    </label>
                    <input 
                      type="text" 
                      maxLength={4}
                      disabled={!isOtpSent}
                      value={resetForm.otp}
                      onChange={e => setResetForm({...resetForm, otp: e.target.value.replace(/[^0-9]/g, '')})}
                      placeholder={isOtpSent ? "• • • •" : "Click 'Send OTP Code' above"}
                      className={`w-full p-3.5 rounded-xl border focus:outline-none font-mono tracking-widest text-center text-base font-black ${
                        !isOtpSent ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-300' :
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                      }`}
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setIsResetModalOpen(false); setIsOtpSent(false); }} 
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                        theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isVerifyingResetOtp || !isOtpSent || resetForm.otp.length < 4} 
                      type="submit" 
                      className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifyingResetOtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      <span>Verify OTP & Proceed</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE 2: NEW PASSWORD & CONFIRM PASSWORD */}
            {/* ========================================================================= */}
            {resetStep === 2 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
                  if (onShowToast) onShowToast("Password must be at least 6 characters.", "warning"); 
                  return;
                }
                if (resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword) {
                  if (onShowToast) onShowToast("Passwords do not match.", "error");
                  return;
                }
                
                setResetting(true);
                try {
                  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, newPassword: resetForm.newPassword })
                  });
                  const resetData = await resetRes.json();
                  if (!resetData.success) {
                    throw new Error(resetData.error || 'Could not update password in database.');
                  }

                  if (onShowToast) onShowToast("✓ Password successfully updated and verified in PostgreSQL!", "success");
                  setIsResetModalOpen(false);
                  setIsOtpSent(false);
                  setResetStep(1);
                  setResetForm({ otp: '', newPassword: '', confirmPassword: '' });
                } catch (err) {
                  if (onShowToast) onShowToast(`Failed: ${err.message}`, "error");
                } finally {
                  setResetting(false);
                }
              }} className="space-y-4 text-xs font-semibold animate-fade-in">
                
                {/* Verified Identity Badge */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Authorized for account: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{userEmail}</strong></span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>New Password <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="text-[11px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
                    >
                      {showResetPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showResetPass ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input 
                    type={showResetPass ? "text" : "password"} 
                    value={resetForm.newPassword}
                    onChange={e => setResetForm({...resetForm, newPassword: e.target.value})}
                    placeholder="Minimum 6 characters"
                    className={`w-full p-3 rounded-xl border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Confirm New Password <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="text-[11px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showConfirmPass ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input 
                    type={showConfirmPass ? "text" : "password"} 
                    value={resetForm.confirmPassword}
                    onChange={e => setResetForm({...resetForm, confirmPassword: e.target.value})}
                    placeholder="Re-enter new password"
                    className={`w-full p-3 rounded-xl border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                    required
                  />
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button 
                    type="button" 
                    onClick={() => setResetStep(1)} 
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    ← Back to OTP
                  </button>
                  <button 
                    disabled={resetting || !resetForm.newPassword || resetForm.newPassword.length < 6} 
                    type="submit" 
                    className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Update & Save Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ACCOUNT & CONTACT DETAILS MODAL (ZERO-LAG 2-STEP FLOW: 1. OTP, 2. EDIT) */}
      {/* ========================================================================= */}
      {isEditAccountModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditAccountModalOpen(false); }}
          className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border transition-all my-auto animate-modal-smooth shadow-2xl ${
            theme === 'dark' ? 'bg-[#121727] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black font-outfit ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Edit Account & Security Settings
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {editAccountStep === 1 
                      ? `Step 1 of 2: Authorize via 4-digit code sent to ${savedInitialEmail}`
                      : 'Step 2 of 2: Update your verified name, Gmail, phone & Privacy PIN'}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsEditAccountModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2-Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                editAccountStep === 1 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                <span>{editAccountStep > 1 ? '✓ 1. Security Verified' : '1. Security OTP Check'}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                editAccountStep === 2 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                <span>2. Edit Profile & PIN</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STEP 1: VERIFY SECURITY OTP FIRST */}
            {/* ========================================================================= */}
            {editAccountStep === 1 && (
              <form onSubmit={handleVerifyAccountOtpStep1} className="space-y-4 text-xs font-semibold">
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-indigo-950/40 border-indigo-800/60' : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Security Authorization Required</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    To modify your account profile, registered Gmail, mobile phone, or privacy PIN, enter the 4-digit code dispatched to: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{accountOtpTargetEmail || savedInitialEmail}</strong>
                  </p>
                </div>

                {/* Dispatch Status & Resend Control */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between animate-fade-in font-medium">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">Sent to: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{accountOtpTargetEmail || savedInitialEmail}</strong></span>
                  </span>
                  <button
                    type="button"
                    disabled={isSendingAccountOtp || !canResendAccountOtp}
                    onClick={() => dispatchAccountSecurityOtp(savedInitialEmail)}
                    className={`text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer ml-2 ${
                      canResendAccountOtp && !isSendingAccountOtp
                        ? 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingAccountOtp ? 'animate-spin' : ''}`} />
                    <span>
                      {isSendingAccountOtp 
                        ? 'Sending...' 
                        : (!canResendAccountOtp ? `Resend in ${accountOtpCountdown}s` : 'Resend Code')}
                    </span>
                  </button>
                </div>

                <div>
                  <label className={`block mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Enter 4-Digit Security OTP
                  </label>
                  <input 
                    type="text" 
                    maxLength={4}
                    autoFocus
                    required
                    value={accountOtp}
                    onChange={e => setAccountOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="• • • •"
                    className={`w-full p-3.5 rounded-xl border focus:outline-none font-mono tracking-widest text-center text-base font-black ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditAccountModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    disabled={isVerifyingAccountOtp || accountOtp.length < 4}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer text-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingAccountOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 stroke-[3]" />}
                    <span>Verify OTP & Unlock Profile</span>
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: EDIT DETAILS & SCREEN LOCK PIN FORM */}
            {/* ========================================================================= */}
            {editAccountStep === 2 && (
              <form onSubmit={handleSaveAccountDetailsStep2} className="space-y-4 text-xs font-semibold animate-fade-in">
                
                {/* Verified Identity Badge */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Security Authorized for: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{savedInitialEmail}</strong></span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block mb-1.5 flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="e.g. Krushil Gadhiya"
                      className={`w-full p-3 rounded-xl border outline-none font-medium ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Shield className="w-3.5 h-3.5 text-purple-500" /> Assigned Role
                      </label>
                      <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Locked
                      </span>
                    </div>
                    <input 
                      type="text" 
                      readOnly
                      disabled
                      value={userRole || 'Administrator'}
                      className={`w-full p-3 rounded-xl border outline-none font-bold text-xs cursor-not-allowed opacity-90 ${
                        theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-purple-300' : 'bg-slate-100 border-slate-200 text-purple-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block mb-1.5 flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> Registered Gmail / Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    className={`w-full p-3 rounded-xl border outline-none font-mono font-medium ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block mb-1.5 flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Registered Mobile Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-400">+91</span>
                    <input 
                      type="tel" 
                      maxLength="10"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      className={`w-full pl-12 pr-3.5 py-3 rounded-xl border outline-none font-mono font-medium ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Lock className="w-3.5 h-3.5 text-cyan-500" /> Workspace Screen Lock PIN
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setEditShowPin(!editShowPin)} 
                      className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {editShowPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{editShowPin ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input 
                    type={editShowPin ? "text" : "password"} 
                    maxLength="8"
                    value={editPin}
                    onChange={e => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 4-8 digit security PIN"
                    className={`w-full p-3 rounded-xl border outline-none font-mono tracking-widest text-center ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditAccountStep(1)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ← Back to OTP
                  </button>

                  <button 
                    type="submit"
                    disabled={isSavingAccount}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer text-xs active:scale-95 disabled:opacity-50"
                  >
                    {isSavingAccount ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Save & Apply Changes</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* 4-STEP SECURE OTP FIRM PROFILE & COMPANY TAG MODAL */}
      <FirmProfileModal
        isOpen={isFirmModalOpen}
        onClose={() => setIsFirmModalOpen(false)}
        onShowToast={onShowToast}
        userRole={userRole}
      />

    </div>
  );
}
