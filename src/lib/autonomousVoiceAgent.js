// =========================================================================
// Autonomous Voice Action Engine (Universal Typing & Clicking Controller)
// Empowers the AI Voice Assistant to:
// 1. Write/Type text into any input, textarea, or active form field
// 2. Click any button, tab, link, or interactive element anywhere on screen
// =========================================================================

import soundFX from './audioFX';

export class AutonomousVoiceAgent {
  /**
   * Helper to set value on React-controlled inputs without breaking state
   */
  static setNativeValue(element, value) {
    const isTextArea = element.tagName.toLowerCase() === 'textarea';
    const prototype = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * 1. UNIVERSAL VOICE TYPING / DICTATION
   * Writes text into either the active focused element or searches for target field
   */
  static writeTextToField(textToType, fieldHint = '') {
    if (!textToType) return { success: false, message: 'No text provided to write.' };

    let targetElement = null;
    const activeEl = document.activeElement;

    // Check if user is currently focused on an editable input
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      // If no specific fieldHint was requested, or field matches active element
      if (!fieldHint) {
        targetElement = activeEl;
      }
    }

    // If no active focused element or fieldHint was specified, search DOM by hint
    if (!targetElement && fieldHint) {
      const hint = fieldHint.toLowerCase().trim();
      const allInputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'));
      
      // Match by placeholder, name, id, aria-label, or previous label
      targetElement = allInputs.find(input => {
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const aria = (input.getAttribute('aria-label') || '').toLowerCase();
        
        // Find associated label text
        let labelText = '';
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) labelText = label.innerText.toLowerCase();
        }
        if (!labelText && input.closest('label')) {
          labelText = input.closest('label').innerText.toLowerCase();
        }
        if (!labelText && input.parentElement) {
          const prev = input.previousElementSibling;
          if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
            labelText = prev.innerText.toLowerCase();
          }
        }

        return (
          placeholder.includes(hint) ||
          name.includes(hint) ||
          id.includes(hint) ||
          aria.includes(hint) ||
          labelText.includes(hint)
        );
      });
    }

    // If still no element and no hint, try finding the most relevant input on screen (search bar, message input, or modal input)
    if (!targetElement) {
      const visibleInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea'))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        });

      if (visibleInputs.length > 0) {
        // Prefer modal input if modal is open, or first visible input
        const modalInput = visibleInputs.find(el => el.closest('.fixed, .modal-content-box, [role="dialog"]'));
        targetElement = modalInput || visibleInputs[0];
      }
    }

    if (!targetElement) {
      return { 
        success: false, 
        message: fieldHint 
          ? `Could not find input field "${fieldHint}" on this page.` 
          : 'Please click or focus on an input field first to dictate into it.' 
      };
    }

    // Focus target element
    targetElement.focus();

    // Determine whether to append or replace
    const currentVal = targetElement.value || targetElement.innerText || '';
    const finalVal = currentVal ? `${currentVal} ${textToType}` : textToType;

    if (targetElement.isContentEditable) {
      targetElement.innerText = finalVal;
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      this.setNativeValue(targetElement, finalVal);
    }

    // Visual highlight ripple on target field
    this.addVisualHighlight(targetElement, '#4f46e5');
    soundFX.playSuccessTone();

    const fieldName = targetElement.getAttribute('placeholder') || targetElement.getAttribute('name') || targetFieldLabel(targetElement) || 'active field';
    return {
      success: true,
      fieldName: fieldName,
      typedText: textToType,
      message: `✓ Typed "${textToType}" into ${fieldName}.`
    };
  }

  /**
   * 2. UNIVERSAL VOICE CLICKING ENGINE
   * Finds and clicks any button, link, tab, or interactive element anywhere on the screen
   */
  static clickElement(targetQuery) {
    if (!targetQuery || !targetQuery.trim()) {
      return { success: false, message: 'Please specify which button or item to click.' };
    }

    const query = targetQuery.toLowerCase().trim();

    // Remove common prefixes
    const cleanQuery = query
      .replace(/^(click on the|click on|click the|click button|click tab|click|press the|press|tap on|tap|select the|select)\s+/i, '')
      .replace(/\s+(button|tab|link|icon|option)$/i, '')
      .trim();

    if (!cleanQuery) {
      return { success: false, message: 'No target button specified to click.' };
    }

    // Gather all candidate interactive elements
    const candidates = Array.from(document.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"], [role="tab"], .cursor-pointer, select, [tabindex="0"]'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 && 
        rect.height > 0 && 
        style.visibility !== 'hidden' && 
        style.display !== 'none' && 
        style.opacity !== '0' &&
        !el.disabled
      );
    });

    let bestMatch = null;
    let bestScore = -1;

    candidates.forEach(el => {
      const text = (el.innerText || el.textContent || '').toLowerCase().trim();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase().trim();
      const title = (el.getAttribute('title') || '').toLowerCase().trim();
      const id = (el.getAttribute('id') || '').toLowerCase().trim();
      const val = (el.getAttribute('value') || '').toLowerCase().trim();

      // Priority 1: Exact text match (Score 100)
      if (text === cleanQuery || aria === cleanQuery || title === cleanQuery || val === cleanQuery) {
        bestMatch = el;
        bestScore = 100;
        return;
      }

      // Priority 2: Text starts with or contains query (Score 80)
      if (bestScore < 80 && (text.startsWith(cleanQuery) || aria.startsWith(cleanQuery) || title.startsWith(cleanQuery))) {
        bestMatch = el;
        bestScore = 80;
        return;
      }

      // Priority 3: Substring match (Score 60)
      if (bestScore < 60 && (text.includes(cleanQuery) || aria.includes(cleanQuery) || title.includes(cleanQuery) || id.includes(cleanQuery) || val.includes(cleanQuery))) {
        bestMatch = el;
        bestScore = 60;
        return;
      }

      // Priority 4: Words overlap match (Score 40)
      const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 1);
      const matchedWords = queryWords.filter(w => text.includes(w) || aria.includes(w) || title.includes(w));
      if (matchedWords.length > 0 && matchedWords.length === queryWords.length && bestScore < 40) {
        bestMatch = el;
        bestScore = 40;
      }
    });

    if (!bestMatch) {
      return {
        success: false,
        message: `Could not find any clickable button, tab, or link matching "${cleanQuery}" on this screen.`
      };
    }

    // Scroll into view smoothly
    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add visual glowing click ripple animation
    this.addVisualHighlight(bestMatch, '#10b981');
    soundFX.playSuccessTone();

    // Trigger native click
    try {
      bestMatch.click();
      bestMatch.focus();
    } catch (err) {
      console.error('[Voice Click Error]:', err);
    }

    const clickedText = (bestMatch.innerText || bestMatch.getAttribute('aria-label') || bestMatch.getAttribute('title') || cleanQuery).trim();
    return {
      success: true,
      targetName: clickedText,
      message: `✓ Clicked "${clickedText}" on screen.`
    };
  }

  /**
   * Visual indicator ring effect on target elements
   */
  static addVisualHighlight(element, color = '#4f46e5') {
    if (!element) return;
    const prevTransition = element.style.transition;
    const prevOutline = element.style.outline;
    const prevBoxShadow = element.style.boxShadow;

    element.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    element.style.outline = `3px solid ${color}`;
    element.style.boxShadow = `0 0 20px ${color}80`;

    setTimeout(() => {
      element.style.outline = prevOutline;
      element.style.boxShadow = prevBoxShadow;
      element.style.transition = prevTransition;
    }, 1200);
  }
}

function targetFieldLabel(input) {
  if (!input) return '';
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.innerText.trim();
  }
  const prev = input.previousElementSibling;
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
    return prev.innerText.trim();
  }
  return '';
}

export default AutonomousVoiceAgent;
