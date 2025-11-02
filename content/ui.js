const LOG_NS = "[ChaserOSS UI]";

class ChaserUI {
  constructor() {
    this.isMinimized = true;
    this.isVisible = true;
    this.settings = null;
    this.status = null;
    this.currencies = [];
    this.container = null;
    this.toastQueue = [];
    this.isShowingToast = false;
    this.init();
  }

  init() {
    this.injectStyles();
    this.createUI();
    this.bindEvents();
    this.loadData();
    this.subscribeToUpdates();
  }

  injectStyles() {
    if (document.getElementById("chaser-ui-styles")) return;

    const style = document.createElement("style");
    style.id = "chaser-ui-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      #chaser-ui-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        pointer-events: none;
      }

      #chaser-ui-container * {
        box-sizing: border-box;
        pointer-events: auto;
      }

      /* Minimized state - sleek pill */
      .chaser-pill {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
        border-radius: 100px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 8px 32px rgba(34, 211, 238, 0.35),
                    0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(34, 211, 238, 0.3);
      }

      .chaser-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(34, 211, 238, 0.45),
                    0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .chaser-pill-logo {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chaser-pill-logo svg {
        width: 100%;
        height: 100%;
      }

      .chaser-pill-status {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
        box-shadow:
          0 0 0 2px rgba(16, 185, 129, 0.2),
          0 0 8px rgba(16, 185, 129, 0.8),
          0 0 16px rgba(16, 185, 129, 0.6),
          0 0 24px rgba(16, 185, 129, 0.4);
        animation: pulse-glow 2s ease-in-out infinite;
      }

      .chaser-pill-status.offline {
        background: #ef4444;
        box-shadow:
          0 0 0 2px rgba(239, 68, 68, 0.2),
          0 0 8px rgba(239, 68, 68, 0.6);
        animation: none;
      }

      @keyframes pulse-glow {
        0%, 100% {
          opacity: 1;
          box-shadow:
            0 0 0 2px rgba(16, 185, 129, 0.2),
            0 0 8px rgba(16, 185, 129, 0.8),
            0 0 16px rgba(16, 185, 129, 0.6),
            0 0 24px rgba(16, 185, 129, 0.4);
        }
        50% {
          opacity: 0.8;
          box-shadow:
            0 0 0 2px rgba(16, 185, 129, 0.3),
            0 0 12px rgba(16, 185, 129, 1),
            0 0 20px rgba(16, 185, 129, 0.8),
            0 0 28px rgba(16, 185, 129, 0.6);
        }
      }

      .chaser-pill-text {
        color: white;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      /* Expanded panel - premium card */
      .chaser-panel {
        background: linear-gradient(135deg, #1a1d29 0%, #1b252d 100%);
        border-radius: 16px;
        width: 380px;
        max-height: 600px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(34, 211, 238, 0.15);
        backdrop-filter: blur(20px);
        display: flex;
        flex-direction: column;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Header */
      .chaser-header {
        padding: 20px 24px;
        background: linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%);
        border-bottom: 1px solid rgba(34, 211, 238, 0.12);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .chaser-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chaser-logo {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }

      .chaser-logo svg {
        width: 100%;
        height: 100%;
      }

      .chaser-title {
        color: white;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
      }

      .chaser-subtitle {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        margin: 0;
        font-weight: 500;
      }

      .chaser-header-actions {
        display: flex;
        gap: 8px;
      }

      .chaser-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        color: rgba(255, 255, 255, 0.8);
      }

      .chaser-icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      /* Content area */
      .chaser-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .chaser-content::-webkit-scrollbar {
        width: 6px;
      }

      .chaser-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .chaser-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .chaser-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Section */
      .chaser-section {
        margin-bottom: 24px;
      }

      .chaser-section:last-child {
        margin-bottom: 0;
      }

      .chaser-section-title {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 12px 0;
      }

      /* Status card */
      .chaser-status-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chaser-status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #10b981;
        animation: pulse 2s ease-in-out infinite;
        flex-shrink: 0;
      }

      .chaser-status-indicator.offline {
        background: #ef4444;
        animation: none;
      }

      .chaser-status-text {
        color: white;
        font-size: 14px;
        font-weight: 600;
        flex: 1;
      }

      /* Toggle switch */
      .chaser-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        margin-bottom: 8px;
        transition: all 0.2s;
      }

      .chaser-toggle:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .chaser-toggle-label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 500;
      }

      .chaser-switch {
        position: relative;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }

      .chaser-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .chaser-switch-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 24px;
        transition: all 0.3s;
      }

      .chaser-switch-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: all 0.3s;
      }

      .chaser-switch input:checked + .chaser-switch-slider {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
      }

      .chaser-switch input:checked + .chaser-switch-slider:before {
        transform: translateX(20px);
      }

      /* Select dropdown */
      .chaser-select-wrapper {
        margin-bottom: 12px;
      }

      .chaser-select-label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        display: block;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .chaser-select {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.2s;
      }

      .chaser-select:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .chaser-select:focus {
        outline: none;
        border-color: #22d3ee;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
      }

      .chaser-select option {
        background: #1a1d29;
        color: white;
      }

      /* Collapsible section */
      .chaser-collapsible {
        margin-top: 16px;
      }

      .chaser-collapsible-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 10px 0;
        user-select: none;
        transition: all 0.2s;
      }

      .chaser-collapsible-header:hover .chaser-collapsible-title {
        color: #22d3ee;
      }

      .chaser-collapsible-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        transition: color 0.2s;
      }

      .chaser-collapsible-chevron {
        width: 16px;
        height: 16px;
        color: rgba(255, 255, 255, 0.5);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s;
      }

      .chaser-collapsible-header:hover .chaser-collapsible-chevron {
        color: #22d3ee;
      }

      .chaser-collapsible.expanded .chaser-collapsible-chevron {
        transform: rotate(180deg);
      }

      .chaser-collapsible-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
        opacity: 0;
      }

      .chaser-collapsible.expanded .chaser-collapsible-content {
        max-height: 500px;
        opacity: 1;
      }

      /* Input fields */
      .chaser-input-wrapper {
        margin-bottom: 14px;
      }

      .chaser-input-label {
        display: block;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
      }

      .chaser-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        transition: all 0.2s;
        box-sizing: border-box;
      }

      .chaser-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }

      .chaser-input:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .chaser-input:focus {
        outline: none;
        border-color: #22d3ee;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
        background: rgba(255, 255, 255, 0.06);
      }

      .chaser-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chaser-input.loading {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.04) 25%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0.04) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        pointer-events: none;
      }

      /* Stats grid */
      .chaser-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .chaser-stat {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 14px;
      }

      .chaser-stat-label {
        color: rgba(255, 255, 255, 0.6);
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }

      .chaser-stat-value {
        color: white;
        font-size: 15px;
        font-weight: 600;
        word-break: break-all;
      }

      .chaser-stat-value.success {
        color: #10b981;
      }

      .chaser-stat-value.error {
        color: #ef4444;
      }

      /* Buttons */
      .chaser-btn {
        width: 100%;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        font-family: 'Inter', sans-serif;
        position: relative;
        overflow: hidden;
      }

      .chaser-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chaser-btn-primary {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
        color: white;
      }

      .chaser-btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(34, 211, 238, 0.5);
      }

      .chaser-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }

      .chaser-btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
      }

      /* Loading spinner */
      .chaser-btn-loading {
        opacity: 0.7;
        pointer-events: none;
      }

      .chaser-btn-loading::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        top: 50%;
        left: 50%;
        margin-left: -8px;
        margin-top: -8px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Activity log */
      .chaser-activity {
        max-height: 200px;
        overflow-y: auto;
      }

      .chaser-activity-item {
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .chaser-activity-item:last-child {
        margin-bottom: 0;
      }

      .chaser-activity-time {
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        margin-bottom: 4px;
      }

      .chaser-activity-message {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
      }

      .chaser-activity-item.success {
        border-color: rgba(16, 185, 129, 0.3);
        background: rgba(16, 185, 129, 0.05);
      }

      .chaser-activity-item.error {
        border-color: rgba(239, 68, 68, 0.3);
        background: rgba(239, 68, 68, 0.05);
      }

      /* Toast notifications */
      .chaser-toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      }

      .chaser-toast {
        background: rgba(26, 29, 41, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 300px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
        animation: toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .chaser-toast.removing {
        animation: toastSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes toastSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      .chaser-toast-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }

      .chaser-toast.success .chaser-toast-icon {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .chaser-toast.error .chaser-toast-icon {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .chaser-toast.info .chaser-toast-icon {
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
      }

      .chaser-toast.loading .chaser-toast-icon {
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
      }

      .chaser-toast-content {
        flex: 1;
      }

      .chaser-toast-title {
        color: white;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .chaser-toast-message {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
      }

      .chaser-toast-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(34, 211, 238, 0.3);
        border-top-color: #22d3ee;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      /* Ripple effect */
      .chaser-ripple {
        position: relative;
        overflow: hidden;
      }

      .chaser-ripple::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s, opacity 0.6s;
        opacity: 0;
      }

      .chaser-ripple:active::after {
        width: 300px;
        height: 300px;
        opacity: 1;
        transition: 0s;
      }

      /* Button loading overlay */
      .chaser-btn-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
      }

      .chaser-btn-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      /* Switch loading */
      .chaser-switch.loading .chaser-switch-slider {
        opacity: 0.6;
        pointer-events: none;
      }

      .chaser-switch.loading .chaser-switch-slider:before {
        animation: switchPulse 1s ease-in-out infinite;
      }

      @keyframes switchPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Select loading shimmer */
      .chaser-select.loading {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.04) 25%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0.04) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        pointer-events: none;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Success checkmark animation */
      @keyframes checkmark {
        0% {
          transform: scale(0) rotate(45deg);
        }
        50% {
          transform: scale(1.2) rotate(45deg);
        }
        100% {
          transform: scale(1) rotate(45deg);
        }
      }

      .chaser-success-check {
        display: inline-block;
        animation: checkmark 0.3s ease-out;
      }

      /* Animations */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .chaser-panel {
        animation: slideIn 0.3s ease-out;
      }

      /* Stat value update animation */
      @keyframes statUpdate {
        0% {
          background: rgba(34, 211, 238, 0.3);
        }
        100% {
          background: transparent;
        }
      }

      .chaser-stat-value.updating {
        animation: statUpdate 0.5s ease-out;
      }

      /* Hidden states */
      .chaser-hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  createUI() {
    // Create toast container
    const toastContainer = document.createElement("div");
    toastContainer.className = "chaser-toast-container";
    toastContainer.id = "chaser-toast-container";
    document.body.appendChild(toastContainer);

    this.container = document.createElement("div");
    this.container.id = "chaser-ui-container";
    this.container.innerHTML = `
      <div class="chaser-pill" id="chaser-pill">
        <div class="chaser-pill-logo">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 20 L20 10 L80 10 L90 20 L90 80 L80 90 L20 90 L10 80 Z" stroke="url(#gradient1)" stroke-width="1.5" fill="#000000"></path>
            <path d="M20 28 L28 20 L72 20 L80 28 L80 72 L72 80 L28 80 L20 72 Z" stroke="url(#gradient2)" stroke-width="1" fill="none" opacity="0.5"></path>
            <path d="M 60 35 L 65 35 L 65 40 L 60 40 L 55 45 L 55 55 L 60 60 L 65 60 L 65 65 L 60 65 L 50 60 L 45 55 L 45 45 L 50 40 Z" fill="url(#gradient3)"></path>
            <rect x="18" y="18" width="4" height="4" fill="#06b6d4"></rect>
            <rect x="78" y="18" width="4" height="4" fill="#06b6d4"></rect>
            <rect x="18" y="78" width="4" height="4" fill="#fbbf24"></rect>
            <rect x="78" y="78" width="4" height="4" fill="#fbbf24"></rect>
            <circle cx="50" cy="50" r="2" fill="#06b6d4"></circle>
            <line x1="50" y1="42" x2="50" y2="48" stroke="#06b6d4" stroke-width="1"></line>
            <line x1="50" y1="52" x2="50" y2="58" stroke="#06b6d4" stroke-width="1"></line>
            <line x1="42" y1="50" x2="48" y2="50" stroke="#06b6d4" stroke-width="1"></line>
            <line x1="52" y1="50" x2="58" y2="50" stroke="#06b6d4" stroke-width="1"></line>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee"></stop>
                <stop offset="100%" stop-color="#fbbf24"></stop>
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.5"></stop>
                <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.5"></stop>
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee"></stop>
                <stop offset="100%" stop-color="#06b6d4"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="chaser-pill-status" id="chaser-pill-status"></div>
        <span class="chaser-pill-text">Chaser</span>
      </div>

      <div class="chaser-panel chaser-hidden" id="chaser-panel">
        <div class="chaser-header">
          <div class="chaser-header-left">
            <div class="chaser-logo">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 20 L20 10 L80 10 L90 20 L90 80 L80 90 L20 90 L10 80 Z" stroke="url(#gradient1-panel)" stroke-width="1.5" fill="#000000"></path>
                <path d="M20 28 L28 20 L72 20 L80 28 L80 72 L72 80 L28 80 L20 72 Z" stroke="url(#gradient2-panel)" stroke-width="1" fill="none" opacity="0.5"></path>
                <path d="M 60 35 L 65 35 L 65 40 L 60 40 L 55 45 L 55 55 L 60 60 L 65 60 L 65 65 L 60 65 L 50 60 L 45 55 L 45 45 L 50 40 Z" fill="url(#gradient3-panel)"></path>
                <rect x="18" y="18" width="4" height="4" fill="#06b6d4"></rect>
                <rect x="78" y="18" width="4" height="4" fill="#06b6d4"></rect>
                <rect x="18" y="78" width="4" height="4" fill="#fbbf24"></rect>
                <rect x="78" y="78" width="4" height="4" fill="#fbbf24"></rect>
                <circle cx="50" cy="50" r="2" fill="#06b6d4"></circle>
                <line x1="50" y1="42" x2="50" y2="48" stroke="#06b6d4" stroke-width="1"></line>
                <line x1="50" y1="52" x2="50" y2="58" stroke="#06b6d4" stroke-width="1"></line>
                <line x1="42" y1="50" x2="48" y2="50" stroke="#06b6d4" stroke-width="1"></line>
                <line x1="52" y1="50" x2="58" y2="50" stroke="#06b6d4" stroke-width="1"></line>
                <defs>
                  <linearGradient id="gradient1-panel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#22d3ee"></stop>
                    <stop offset="100%" stop-color="#fbbf24"></stop>
                  </linearGradient>
                  <linearGradient id="gradient2-panel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.5"></stop>
                    <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.5"></stop>
                  </linearGradient>
                  <linearGradient id="gradient3-panel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#22d3ee"></stop>
                    <stop offset="100%" stop-color="#06b6d4"></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div class="chaser-title">Chaser OSS</div>
              <div class="chaser-subtitle">chasing.codes</div>
            </div>
          </div>
          <div class="chaser-header-actions">
            <div class="chaser-icon-btn" id="chaser-minimize" title="Minimize">−</div>
          </div>
        </div>

        <div class="chaser-content">
          <div class="chaser-section">
            <div class="chaser-status-card">
              <div class="chaser-status-indicator" id="chaser-status-indicator"></div>
              <span class="chaser-status-text" id="chaser-status-text">Connecting...</span>
            </div>
          </div>

          <div class="chaser-section">
            <div class="chaser-section-title">Automation</div>
            <div class="chaser-toggle">
              <span class="chaser-toggle-label">Auto-claim bonuses</span>
              <label class="chaser-switch">
                <input type="checkbox" id="chaser-toggle-bonus">
                <span class="chaser-switch-slider"></span>
              </label>
            </div>
            <div class="chaser-toggle">
              <span class="chaser-toggle-label">Auto-claim reloads</span>
              <label class="chaser-switch">
                <input type="checkbox" id="chaser-toggle-reloads">
                <span class="chaser-switch-slider"></span>
              </label>
            </div>
            <div class="chaser-select-wrapper">
              <label class="chaser-select-label">Currency</label>
              <select class="chaser-select" id="chaser-currency-select">
                <option value="">Loading...</option>
              </select>
            </div>

            <div class="chaser-collapsible" id="chaser-advanced-section">
              <div class="chaser-collapsible-header" id="chaser-advanced-header">
                <span class="chaser-collapsible-title">Advanced Settings</span>
                <svg class="chaser-collapsible-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
              <div class="chaser-collapsible-content">
                <div style="padding-top: 8px;">
                  <div class="chaser-input-wrapper">
                    <label class="chaser-input-label">Event Stream URL</label>
                    <input type="url" class="chaser-input" id="chaser-stream-url" placeholder="https://pub.chasing.codes/stream">
                  </div>
                  <div class="chaser-input-wrapper">
                    <label class="chaser-input-label">Reload Check Interval (minutes)</label>
                    <input type="number" min="5" class="chaser-input" id="chaser-reload-interval" placeholder="60">
                  </div>
                  <div class="chaser-input-wrapper">
                    <label class="chaser-input-label">Short Reload Threshold (minutes)</label>
                    <input type="number" min="5" class="chaser-input" id="chaser-short-threshold" placeholder="10">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chaser-section">
            <div class="chaser-section-title">Latest Activity</div>
            <div class="chaser-stats-grid">
              <div class="chaser-stat">
                <div class="chaser-stat-label">Last Bonus</div>
                <div class="chaser-stat-value" id="chaser-last-bonus">—</div>
              </div>
              <div class="chaser-stat">
                <div class="chaser-stat-label">Result</div>
                <div class="chaser-stat-value" id="chaser-last-result">—</div>
              </div>
              <div class="chaser-stat">
                <div class="chaser-stat-label">Last Reload</div>
                <div class="chaser-stat-value" id="chaser-last-reload">—</div>
              </div>
              <div class="chaser-stat">
                <div class="chaser-stat-label">Next Reload</div>
                <div class="chaser-stat-value" id="chaser-next-reload">—</div>
              </div>
            </div>
          </div>

          <div class="chaser-section">
            <div class="chaser-section-title">Actions</div>
            <button class="chaser-btn chaser-btn-primary chaser-ripple" id="chaser-claim-bonus">Trigger Bonus Claim</button>
            <div style="height: 8px;"></div>
            <button class="chaser-btn chaser-btn-secondary chaser-ripple" id="chaser-refresh-reload">Refresh Reload Status</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  bindEvents() {
    const pill = document.getElementById("chaser-pill");
    const panel = document.getElementById("chaser-panel");
    const minimize = document.getElementById("chaser-minimize");
    const toggleBonus = document.getElementById("chaser-toggle-bonus");
    const toggleReloads = document.getElementById("chaser-toggle-reloads");
    const currencySelect = document.getElementById("chaser-currency-select");
    const claimBonus = document.getElementById("chaser-claim-bonus");
    const refreshReload = document.getElementById("chaser-refresh-reload");

    // Advanced settings elements
    const advancedSection = document.getElementById("chaser-advanced-section");
    const advancedHeader = document.getElementById("chaser-advanced-header");
    const streamUrl = document.getElementById("chaser-stream-url");
    const reloadInterval = document.getElementById("chaser-reload-interval");
    const shortThreshold = document.getElementById("chaser-short-threshold");

    pill.addEventListener("click", () => this.expand());
    minimize.addEventListener("click", () => this.minimize());

    // Advanced settings toggle
    advancedHeader.addEventListener("click", () => {
      advancedSection.classList.toggle("expanded");
    });

    // Toggle bonus - instant feedback + optimistic update
    toggleBonus.addEventListener("change", async (e) => {
      const newValue = e.target.checked;
      const switchEl = e.target.closest('.chaser-switch');

      // Instant feedback
      switchEl.classList.add('loading');

      try {
        await this.saveSettings({ autoClaimBonus: newValue });

        // Success feedback
        switchEl.classList.remove('loading');
        this.showToast('success', 'Settings saved', `Auto-claim bonuses ${newValue ? 'enabled' : 'disabled'}`);
      } catch (error) {
        // Revert on error
        e.target.checked = !newValue;
        switchEl.classList.remove('loading');
        this.showToast('error', 'Failed to save', 'Please try again');
      }
    });

    // Toggle reloads - instant feedback + optimistic update
    toggleReloads.addEventListener("change", async (e) => {
      const newValue = e.target.checked;
      const switchEl = e.target.closest('.chaser-switch');

      // Instant feedback
      switchEl.classList.add('loading');

      try {
        await this.saveSettings({ autoClaimReloads: newValue });

        // Success feedback
        switchEl.classList.remove('loading');
        this.showToast('success', 'Settings saved', `Auto-claim reloads ${newValue ? 'enabled' : 'disabled'}`);
      } catch (error) {
        // Revert on error
        e.target.checked = !newValue;
        switchEl.classList.remove('loading');
        this.showToast('error', 'Failed to save', 'Please try again');
      }
    });

    // Currency select - instant feedback
    currencySelect.addEventListener("change", async (e) => {
      const newValue = e.target.value;
      const oldValue = this.settings?.currency;

      // Instant feedback
      currencySelect.classList.add('loading');
      currencySelect.disabled = true;

      try {
        await this.saveSettings({ currency: newValue });

        // Success feedback
        currencySelect.classList.remove('loading');
        currencySelect.disabled = false;
        this.showToast('success', 'Currency updated', `Now using ${newValue.toUpperCase()}`);
      } catch (error) {
        // Revert on error
        currencySelect.value = oldValue;
        currencySelect.classList.remove('loading');
        currencySelect.disabled = false;
        this.showToast('error', 'Failed to update', 'Please try again');
      }
    });

    // Advanced settings inputs with debouncing
    let advancedDebounceTimer = null;

    const saveAdvancedSetting = async (inputEl, key, value) => {
      inputEl.classList.add('loading');
      inputEl.disabled = true;

      try {
        await this.saveSettings({ [key]: value });
        inputEl.classList.remove('loading');
        inputEl.disabled = false;
        this.showToast('success', 'Setting saved', `${key} updated`);
      } catch (error) {
        inputEl.classList.remove('loading');
        inputEl.disabled = false;
        this.showToast('error', 'Failed to save', 'Please try again');
      }
    };

    const debouncedSave = (inputEl, key, value) => {
      clearTimeout(advancedDebounceTimer);
      advancedDebounceTimer = setTimeout(() => {
        saveAdvancedSetting(inputEl, key, value);
      }, 800); // Save 800ms after user stops typing
    };

    streamUrl.addEventListener("input", (e) => {
      const value = e.target.value.trim();
      debouncedSave(streamUrl, 'streamUrl', value || 'https://pub.chasing.codes/stream');
    });

    reloadInterval.addEventListener("input", (e) => {
      const value = Math.max(5, Number(e.target.value) || 60);
      debouncedSave(reloadInterval, 'reloadCheckIntervalMinutes', value);
    });

    shortThreshold.addEventListener("input", (e) => {
      const value = Math.max(5, Number(e.target.value) || 10);
      debouncedSave(shortThreshold, 'shortReloadThresholdMinutes', value);
    });

    // Add blur event to save immediately when user leaves field
    streamUrl.addEventListener("blur", () => {
      if (advancedDebounceTimer) {
        clearTimeout(advancedDebounceTimer);
        const value = streamUrl.value.trim();
        saveAdvancedSetting(streamUrl, 'streamUrl', value || 'https://pub.chasing.codes/stream');
      }
    });

    reloadInterval.addEventListener("blur", () => {
      if (advancedDebounceTimer) {
        clearTimeout(advancedDebounceTimer);
        const value = Math.max(5, Number(reloadInterval.value) || 60);
        saveAdvancedSetting(reloadInterval, 'reloadCheckIntervalMinutes', value);
      }
    });

    shortThreshold.addEventListener("blur", () => {
      if (advancedDebounceTimer) {
        clearTimeout(advancedDebounceTimer);
        const value = Math.max(5, Number(shortThreshold.value) || 10);
        saveAdvancedSetting(shortThreshold, 'shortReloadThresholdMinutes', value);
      }
    });

    claimBonus.addEventListener("click", () => this.handleClaimBonus());
    refreshReload.addEventListener("click", () => this.handleRefreshReload());
  }

  expand() {
    this.isMinimized = false;
    const pill = document.getElementById("chaser-pill");
    const panel = document.getElementById("chaser-panel");

    // Instant visual feedback
    pill.style.transform = 'scale(0.95)';
    setTimeout(() => {
      pill.style.transform = '';
      pill.classList.add("chaser-hidden");
      panel.classList.remove("chaser-hidden");
    }, 100);
  }

  minimize() {
    this.isMinimized = true;
    const panel = document.getElementById("chaser-panel");
    const pill = document.getElementById("chaser-pill");

    // Instant visual feedback
    const minimize = document.getElementById("chaser-minimize");
    minimize.style.transform = 'scale(0.9)';
    setTimeout(() => {
      minimize.style.transform = '';
      panel.classList.add("chaser-hidden");
      pill.classList.remove("chaser-hidden");
    }, 100);
  }

  async loadData() {
    await Promise.all([
      this.loadSettings(),
      this.loadStatus(),
      this.loadCurrencies()
    ]);
  }

  async loadSettings(retryCount = 0) {
    try {
      const response = await this.sendMessage({ type: "GET_SETTINGS" });
      if (response?.ok) {
        this.settings = response.settings;
        this.updateSettingsUI();
      } else {
        throw new Error(response?.error || 'Failed to load settings');
      }
    } catch (error) {
      console.warn(LOG_NS, 'Failed to load settings:', error);

      // Retry logic
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.loadSettings(retryCount + 1);
      }

      // Use defaults on final failure
      this.settings = {
        autoClaimBonus: false,
        autoClaimReloads: false,
        currency: 'usdt'
      };
      this.updateSettingsUI();
      this.showToast('info', 'Using defaults', 'Could not load saved settings');
    }
  }

  async loadStatus(retryCount = 0) {
    try {
      const response = await this.sendMessage({ type: "GET_STATUS" });
      if (response?.ok) {
        this.status = response.status;
        this.updateStatusUI();
      } else {
        throw new Error(response?.error || 'Failed to load status');
      }
    } catch (error) {
      console.warn(LOG_NS, 'Failed to load status:', error);

      // Retry logic
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.loadStatus(retryCount + 1);
      }

      // Use empty status on final failure
      this.status = {
        connected: false,
        lastBonusCode: null,
        lastBonusResult: null,
        lastReloadClaim: null,
        nextReloadAt: null
      };
      this.updateStatusUI();
    }
  }

  async loadCurrencies(retryCount = 0) {
    try {
      const response = await this.sendMessage({
        type: "GRAPHQL_REQUEST",
        payload: {
          body: {
            operationName: "CurrencyConfiguration",
            query: `query CurrencyConfiguration($isAcp: Boolean!) {
              currencyConfiguration(isAcp: $isAcp) {
                currencies {
                  name
                }
              }
            }`,
            variables: { isAcp: false }
          },
          headers: {}
        }
      });

      if (response?.ok && response?.data?.data?.currencyConfiguration?.currencies) {
        this.currencies = response.data.data.currencyConfiguration.currencies.map(c => c.name);
      } else if (response?.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.warn(LOG_NS, 'Failed to load currencies:', error);

      // Retry logic
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.loadCurrencies(retryCount + 1);
      }

      // Fallback to common currencies
      this.currencies = ['btc', 'eth', 'ltc', 'doge', 'bch', 'usdt', 'usdc', 'usd'];
    } finally {
      this.updateCurrencySelect();
    }
  }

  updateSettingsUI() {
    if (!this.settings) return;

    document.getElementById("chaser-toggle-bonus").checked = Boolean(this.settings.autoClaimBonus);
    document.getElementById("chaser-toggle-reloads").checked = Boolean(this.settings.autoClaimReloads);

    if (this.settings.currency) {
      document.getElementById("chaser-currency-select").value = this.settings.currency;
    }

    // Advanced settings
    const streamUrl = document.getElementById("chaser-stream-url");
    const reloadInterval = document.getElementById("chaser-reload-interval");
    const shortThreshold = document.getElementById("chaser-short-threshold");

    if (streamUrl) {
      streamUrl.value = this.settings.streamUrl || 'https://pub.chasing.codes/stream';
    }
    if (reloadInterval) {
      reloadInterval.value = this.settings.reloadCheckIntervalMinutes ?? 60;
    }
    if (shortThreshold) {
      shortThreshold.value = this.settings.shortReloadThresholdMinutes ?? 10;
    }
  }

  updateStatusUI() {
    if (!this.status) return;

    const connected = this.status.connected;
    const pillStatus = document.getElementById("chaser-pill-status");
    const indicator = document.getElementById("chaser-status-indicator");
    const statusText = document.getElementById("chaser-status-text");

    if (connected) {
      pillStatus.classList.remove("offline");
      indicator.classList.remove("offline");
      statusText.textContent = "Connected";
    } else {
      pillStatus.classList.add("offline");
      indicator.classList.add("offline");
      statusText.textContent = "Offline";
    }

    // Animate value updates
    const lastBonusEl = document.getElementById("chaser-last-bonus");
    const newBonusValue = this.status.lastBonusCode || "—";
    if (lastBonusEl.textContent !== newBonusValue) {
      this.animateValueUpdate(lastBonusEl, newBonusValue);
    }

    const resultEl = document.getElementById("chaser-last-result");
    const newResultValue = this.formatResult(this.status.lastBonusResult);
    if (resultEl.textContent !== newResultValue) {
      this.animateValueUpdate(resultEl, newResultValue);
      resultEl.className = "chaser-stat-value";
      if (this.status.lastBonusResult?.includes("success")) {
        resultEl.classList.add("success");
      } else if (this.status.lastBonusResult?.includes("failed")) {
        resultEl.classList.add("error");
      }
    }

    const lastReloadEl = document.getElementById("chaser-last-reload");
    const newLastReload = this.formatTime(this.status.lastReloadClaim);
    if (lastReloadEl.textContent !== newLastReload) {
      this.animateValueUpdate(lastReloadEl, newLastReload);
    }

    const nextReloadEl = document.getElementById("chaser-next-reload");
    const newNextReload = this.formatTime(this.status.nextReloadAt);
    if (nextReloadEl.textContent !== newNextReload) {
      this.animateValueUpdate(nextReloadEl, newNextReload);
    }
  }

  animateValueUpdate(element, newValue) {
    element.classList.add('updating');
    setTimeout(() => {
      element.textContent = newValue;
      setTimeout(() => {
        element.classList.remove('updating');
      }, 500);
    }, 100);
  }

  updateCurrencySelect() {
    const select = document.getElementById("chaser-currency-select");
    select.innerHTML = this.currencies.map(c =>
      `<option value="${c}">${c.toUpperCase()}</option>`
    ).join('');

    if (this.settings?.currency) {
      select.value = this.settings.currency;
    }
  }

  formatTime(iso) {
    if (!iso) return "—";
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return "—";
      const now = new Date();
      const diff = Math.abs(now - date);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);

      if (hours > 24) {
        return `${Math.floor(hours / 24)}d ago`;
      } else if (hours > 0) {
        return `${hours}h ago`;
      } else if (minutes > 0) {
        return `${minutes}m ago`;
      } else {
        return "Just now";
      }
    } catch (error) {
      return "—";
    }
  }

  formatResult(result) {
    if (!result) return "—";
    if (result.includes("success")) return "✓ Success";
    if (result.includes("failed")) return "✗ Failed";
    if (result === "pending") return "⋯ Pending";
    return result;
  }

  async saveSettings(patch, retryCount = 0) {
    try {
      const response = await this.sendMessage({
        type: "SAVE_SETTINGS",
        payload: patch
      });

      if (response?.ok) {
        this.settings = response.settings;
        return response.settings;
      } else {
        throw new Error(response?.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error(LOG_NS, 'Save settings error:', error);

      // Retry logic
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.saveSettings(patch, retryCount + 1);
      }

      // Re-throw on final failure
      throw error;
    }
  }

  async handleClaimBonus() {
    const code = prompt("Enter bonus code:");
    if (!code) return;

    const btn = document.getElementById("chaser-claim-bonus");
    const originalText = btn.textContent;

    // Instant loading state
    btn.disabled = true;
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'chaser-btn-loading-overlay';
    loadingOverlay.innerHTML = '<div class="chaser-btn-spinner"></div>';
    btn.appendChild(loadingOverlay);

    // Show starting toast
    const loadingToast = this.showToast('loading', 'Claiming bonus', `Attempting to claim: ${code.trim()}`);

    try {
      // Listen for result
      const resultPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ timeout: true });
        }, 15000);

        const handleStatusChange = (changes, area) => {
          if (area !== 'local' || !changes.chaserStatus) return;

          const newStatus = changes.chaserStatus.newValue;
          if (newStatus.lastBonusCode === code.trim()) {
            clearTimeout(timeout);
            chrome.storage.onChanged.removeListener(handleStatusChange);
            resolve({
              success: newStatus.lastBonusResult?.includes('success'),
              result: newStatus.lastBonusResult
            });
          }
        };

        chrome.storage.onChanged.addListener(handleStatusChange);
      });

      window.dispatchEvent(new CustomEvent("chaser-manual-claim", {
        detail: { code: code.trim() }
      }));

      // Wait for result
      const result = await resultPromise;

      // Remove loading toast
      this.removeToast(loadingToast);

      // Success feedback
      btn.disabled = false;
      loadingOverlay.remove();

      if (result.timeout) {
        this.showToast('info', 'Claim in progress', 'Check status above for results');
      } else if (result.success) {
        this.showToast('success', 'Bonus claimed!', `Code ${code.trim()} was successful`);
      } else {
        const errorMsg = result.result?.replace('failed: ', '') || 'Claim unsuccessful';
        this.showToast('error', 'Claim failed', errorMsg);
      }
    } catch (error) {
      // Remove loading toast
      this.removeToast(loadingToast);

      // Error feedback
      btn.disabled = false;
      loadingOverlay.remove();
      this.showToast('error', 'Claim failed', error.message || 'Please try again');
    }
  }

  async handleRefreshReload() {
    const btn = document.getElementById("chaser-refresh-reload");
    const originalText = btn.textContent;

    // Instant loading state
    btn.disabled = true;
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'chaser-btn-loading-overlay';
    loadingOverlay.innerHTML = '<div class="chaser-btn-spinner"></div>';
    btn.appendChild(loadingOverlay);

    // Show starting toast
    const loadingToast = this.showToast('loading', 'Checking reload status', 'Fetching latest data from Stake...');

    try {
      // Listen for the result
      const resultPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reload check timed out'));
        }, 10000);

        const handleResult = (event) => {
          clearTimeout(timeout);
          window.removeEventListener('chaser-reload-check-result', handleResult);
          resolve(event.detail);
        };

        window.addEventListener('chaser-reload-check-result', handleResult);
      });

      // Trigger the check
      window.dispatchEvent(new CustomEvent("chaser-refresh-reload"));

      // Wait for result
      const result = await resultPromise;

      // Remove loading toast
      this.removeToast(loadingToast);

      // Success feedback
      btn.disabled = false;
      loadingOverlay.remove();

      if (result.success) {
        if (result.reloadAvailable) {
          // Reload is available
          const amount = result.amount ? `${result.amount} ${result.currency?.toUpperCase() || ''}` : 'Unknown amount';
          this.showToast('success', 'Reload available!', `You can claim ${amount} now`);
        } else if (result.nextReloadAt) {
          // Reload not available yet, but we know when
          const timeUntil = this.getTimeUntil(result.nextReloadAt);
          this.showToast('info', 'No reload available', `Next reload in ${timeUntil}`);
        } else {
          // No reload data at all
          this.showToast('info', 'Status checked', 'No reload available at this time');
        }
      } else {
        // Check completed but with issues
        this.showToast('error', 'Check completed with errors', result.error || 'Could not fetch reload data');
      }

    } catch (error) {
      // Remove loading toast
      this.removeToast(loadingToast);

      // Error feedback
      btn.disabled = false;
      loadingOverlay.remove();
      this.showToast('error', 'Refresh failed', error.message || 'Please try again');
    }
  }

  getTimeUntil(futureDate) {
    try {
      const now = new Date();
      const future = new Date(futureDate);
      const diff = future - now;

      if (diff <= 0) return 'now';

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      return 'unknown';
    }
  }

  // Toast notification system
  showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `chaser-toast ${type}`;

    const icon = type === 'success' ? '✓' :
                 type === 'error' ? '✕' :
                 type === 'loading' ? '<div class="chaser-toast-spinner"></div>' : 'ℹ';

    toast.innerHTML = `
      <div class="chaser-toast-icon">${icon}</div>
      <div class="chaser-toast-content">
        <div class="chaser-toast-title">${title}</div>
        ${message ? `<div class="chaser-toast-message">${message}</div>` : ''}
      </div>
    `;

    const container = document.getElementById('chaser-toast-container');
    container.appendChild(toast);

    // Auto remove after 3 seconds (unless it's a loading toast)
    if (type !== 'loading') {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    return toast;
  }

  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }

  subscribeToUpdates() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;

      if (changes.chaserSettings) {
        this.settings = changes.chaserSettings.newValue;
        this.updateSettingsUI();
      }

      if (changes.chaserStatus) {
        this.status = changes.chaserStatus.newValue;
        this.updateStatusUI();
      }
    });
  }

  async sendMessage(message, timeout = 5000) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      // Race between message and timeout
      const response = await Promise.race([
        chrome.runtime.sendMessage(message),
        timeoutPromise
      ]);

      return response;
    } catch (error) {
      console.warn(LOG_NS, "Message failed:", error);

      // Detect specific error types
      let errorMessage = String(error);
      if (error.message === 'Request timeout') {
        errorMessage = 'Request took too long. Please check your connection.';
      } else if (error.message.includes('Extension context invalidated')) {
        errorMessage = 'Extension was reloaded. Please refresh the page.';
      } else if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Extension connection lost. Please refresh the page.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      }

      return { ok: false, error: errorMessage };
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new ChaserUI());
} else {
  new ChaserUI();
}
