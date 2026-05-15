/**
 * UI Quality of Life Options
 *
 * Collection of small UI improvements for Foundry VTT V13+.
 */

// ============================================================
// Sidebar gradient helpers
// ============================================================

/** Convert a 6-digit hex color (#rrggbb) to [r, g, b] integers. */
function _hexToRgb(hex) {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

/**
 * Read the gradient settings and write --uiqol-sidebar-top / --uiqol-sidebar-bottom
 * CSS custom properties onto :root so sidebar-fix.css picks them up.
 */
function _applyGradient(overrides) {
    if (!game?.settings) return;
    const get = k => game.settings.get('ui-qol-options', k);
    const mode = overrides?.mode ?? get('sidebarGradientMode');
    const root = document.documentElement;

    let topVal, bottomVal;
    if (mode === 'custom') {
        const topColor = overrides?.topColor ?? get('sidebarGradientTopColor');
        const topAlpha = (overrides?.topAlpha ?? get('sidebarGradientTopAlpha')) / 100;
        const bottomColor = overrides?.bottomColor ?? get('sidebarGradientBottomColor');
        const bottomAlpha = (overrides?.bottomAlpha ?? get('sidebarGradientBottomAlpha')) / 100;
        const [tr, tg, tb] = _hexToRgb(topColor);
        const [br, bg, bb] = _hexToRgb(bottomColor);
        topVal = `rgba(${tr},${tg},${tb},${topAlpha})`;
        bottomVal = `rgba(${br},${bg},${bb},${bottomAlpha})`;
    } else {
        // Theme defaults — dark: medium grey; light: darker grey to stand out on a light canvas.
        const isLight = document.querySelector('#interface')?.classList.contains('theme-light');
        topVal = isLight ? 'rgba(155,153,146,0.9)' : 'rgba(123,130,136,0.855)';
        bottomVal = isLight ? 'rgba(134,133,127,0.7)' : 'rgba(123,130,136,0)';
    }
    root.style.setProperty('--uiqol-sidebar-top', topVal);
    root.style.setProperty('--uiqol-sidebar-bottom', bottomVal);
}

// ============================================================
// Settings
// ============================================================
Hooks.on('init', () => {
    game.settings.register('ui-qol-options', 'dragFromAnywhere', {
        name: 'Drag windows from anywhere',
        hint: 'When enabled, any Foundry window can be dragged by clicking and holding on its ' +
            'content area, not just from the title bar.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register('ui-qol-options', 'doubleClickDelay', {
        name: 'Double-click (ms)',
        hint: 'Maximum time between two clicks on the canvas to count as a double-click ' +
            '(opens token sheets, places objects, etc.). Foundry default is 250 ms. ' +
            'Increase this if double-clicks feel missed.',
        scope: 'client',
        config: true,
        type: Number,
        default: 250,
        range: { min: 100, max: 1000, step: 50 },
        onChange: value => {
            if (MouseInteractionManager) MouseInteractionManager.DOUBLE_CLICK_TIME_MS = value;
        },
    });

    game.settings.register('ui-qol-options', 'tooltipResetDelay', {
        name: 'Next tooltip delay (ms)',
        hint: 'How long to wait before showing a tooltip when moving to a new element. ' +
            '0 = Foundry default (instant once any tooltip has fired). ' +
            '500 = full reset to the same delay as the very first tooltip.',
        scope: 'client',
        config: true,
        type: Number,
        default: 100,
        range: { min: 0, max: 500, step: 50 },
    });

    game.settings.register('ui-qol-options', 'tooltipHideDelay', {
        name: 'Tooltip linger after mouse-out (ms)',
        hint: 'How long a tooltip stays visible after the mouse has left the element. ' +
            'Foundry default is 500 ms. 0 = hide immediately on mouse-out.',
        scope: 'client',
        config: true,
        type: Number,
        default: 500,
        range: { min: 0, max: 1000, step: 50 },
    });
    
    game.settings.register('ui-qol-options', 'chatContextMenuLeft', {
        name: 'Chat card context menu',
        hint: 'Open the right-click context menu to the left side of the chat card, outside the chat log area.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register('ui-qol-options', 'hotbarSlotScale', {
        name: 'Hotbar slot button scale (%)',
        hint: 'Scale hotbar slot buttons to a smaller size. 100 = default size.',
        scope: 'client',
        config: true,
        type: Number,
        default: 100,
        range: { min: 50, max: 100, step: 5 },
        onChange: () => _applyHotbarSlotZoom(),
    });

    game.settings.register('ui-qol-options', 'clearCompendiumTabs', {
        name: 'Clear Compendium Tabs',
        hint: 'Tidies up the compendium sidebar: left-aligns the pack name, moves the footer label to the right, ' +
              'and adds a black fade overlay on the left side of banner images.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            const styleId = 'ui-qol-compendium-clear-style';
            if (value) {
                if (!document.getElementById(styleId)) {
                    const link = document.createElement('link');
                    link.id = styleId;
                    link.rel = 'stylesheet';
                    link.type = 'text/css';
                    link.href = 'modules/ui-qol-options/styles/compendium-clear.css';
                    document.head.appendChild(link);
                }
            } else {
                document.getElementById(styleId)?.remove();
            }
        },
    });

    game.settings.register('ui-qol-options', 'fixedSidebarButtons', {
        name: 'Fix sidebar menu buttons to right',
        hint: 'Sidebar menu buttons will stay fixed on the right side and the menu will expand under them.\nNot compatible with "Classic UI" module\'s "Tabs On Top" option.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            const styleId = 'ui-qol-sidebar-fix-style';
            if (value) {
                if (!document.getElementById(styleId)) {
                    const link = document.createElement('link');
                    link.id = styleId;
                    link.rel = 'stylesheet';
                    link.type = 'text/css';
                    link.href = 'modules/ui-qol-options/styles/sidebar-fix.css';
                    document.head.appendChild(link);
                }
            } else {
                document.getElementById(styleId)?.remove();
            }
            ui?.chat?._toggleNotifications();
        }
    });

    // Patch sidebar toggle button tooltip to update immediately on expand/collapse
    Hooks.on('renderSidebar', (app) => {
        if (!game.settings.get('ui-qol-options', 'fixedSidebarButtons')) return;
        const expander = app.element.querySelector('.tabs [data-action="toggleState"]');
        if (!expander) return;
        // Update tooltip immediately when expanded state changes
        const updateTooltip = () => {
            const expanded = app.expanded;
            expander.dataset.tooltip = expanded ? 'Collapse' : 'Expand';
            expander.setAttribute('aria-label', game.i18n.localize(expander.dataset.tooltip));
            // If tooltip is visible, update it immediately
            if (game.tooltip?.element && game.tooltip.element.isConnected && game.tooltip.element.innerText) {
                game.tooltip.deactivate();
                game.tooltip.activate(expander);
            }
        };
        updateTooltip();
        // Listen for expand/collapse events
        const origExpand = app.expand;
        const origCollapse = app.collapse;
        app.expand = function (...args) {
            const result = origExpand.apply(this, args);
            setTimeout(updateTooltip, 0);
            return result;
        };
        app.collapse = function (...args) {
            const result = origCollapse.apply(this, args);
            setTimeout(updateTooltip, 0);
            return result;
        };
        // Also update on click
        expander.addEventListener('click', () => setTimeout(updateTooltip, 0));
    });

    // ── Sidebar gradient color settings ───────────────────────
    game.settings.register('ui-qol-options', 'sidebarGradientMode', {
        scope: 'client', config: false, type: String, default: 'theme',
    });
    game.settings.register('ui-qol-options', 'sidebarGradientTopColor', {
        scope: 'client', config: false, type: String, default: '#7b8288',
    });
    game.settings.register('ui-qol-options', 'sidebarGradientTopAlpha', {
        scope: 'client', config: false, type: Number, default: 85,
    });
    game.settings.register('ui-qol-options', 'sidebarGradientBottomColor', {
        scope: 'client', config: false, type: String, default: '#7b8288',
    });
    game.settings.register('ui-qol-options', 'sidebarGradientBottomAlpha', {
        scope: 'client', config: false, type: Number, default: 0,
    });
});

// ============================================================
// Sidebar gradient inline settings injection
// ============================================================
Hooks.on('renderSettingsConfig', (_app, html) => {
    const section = html.querySelector
        ? html.querySelector('section[data-category="ui-qol-options"]')
        : html.find('section[data-category="ui-qol-options"]')[0];
    if (!section) return;

    const get = k => game.settings.get('ui-qol-options', k);
    const mode = get('sidebarGradientMode');
    const topColor = get('sidebarGradientTopColor');
    const topAlpha = get('sidebarGradientTopAlpha');
    const bottomColor = get('sidebarGradientBottomColor');
    const bottomAlpha = get('sidebarGradientBottomAlpha');
    const isCustom = mode === 'custom';

    const block = document.createElement('div');
    block.className = 'uiqol-gradient-block';
    block.innerHTML = `
        <div class="form-group">
            <label>^^^ Fixed Sidebar gradient colors</label>
            <div class="form-fields" style="flex-direction:row; gap:4px; align-items:flex-start;">
                <label style="font-weight:normal; cursor:pointer; display:flex; gap:6px; align-items:center;">
                    <input type="radio" name="uiqol-gradient-mode" value="theme" ${!isCustom ? 'checked' : ''}>
                    Theme default
                </label>
                <label style="font-weight:normal; cursor:pointer; display:flex; gap:6px; align-items:center;">
                    <input type="radio" name="uiqol-gradient-mode" value="custom" ${isCustom ? 'checked' : ''}>
                    Custom
                </label>
            </div>
            <p class="hint">Gradient background of the left and right sidebar button strips.\nCan be set to transparent with custom color option.</p>
        </div>
        <div class="uiqol-gradient-custom" style="${isCustom ? '' : 'display:none'}">
            <div class="form-group">
                <label style="padding-left:1em;">Top color</label>
                <div class="form-fields">
                    <input type="color" name="uiqol-gradient-top-color" value="${topColor}">
                    <input type="range"  name="uiqol-gradient-top-alpha" min="0" max="100" step="1" value="${topAlpha}" style="flex:1">
                    <span class="uiqol-alpha-label" style="min-width:3.2em; text-align:right;">${topAlpha}%</span>
                </div>
            </div>
            <div class="form-group">
                <label style="padding-left:1em;">Bottom color</label>
                <div class="form-fields">
                    <input type="color" name="uiqol-gradient-bottom-color" value="${bottomColor}">
                    <input type="range"  name="uiqol-gradient-bottom-alpha" min="0" max="100" step="1" value="${bottomAlpha}" style="flex:1">
                    <span class="uiqol-alpha-label" style="min-width:3.2em; text-align:right;">${bottomAlpha}%</span>
                </div>
            </div>
        </div>`;

    section.appendChild(block);

    // Show/hide custom section on radio change.
    block.querySelectorAll('[name=uiqol-gradient-mode]').forEach(r =>
        r.addEventListener('change', ev =>
            block.querySelector('.uiqol-gradient-custom').style.display =
            ev.target.value === 'custom' ? '' : 'none'
        )
    );

    // Live alpha label updates.
    block.querySelectorAll('[name=uiqol-gradient-top-alpha], [name=uiqol-gradient-bottom-alpha]')
        .forEach(range => range.addEventListener('input', ev =>
            ev.target.nextElementSibling.textContent = ev.target.value + '%'
        ));

    // Live gradient preview while color/alpha controls change.
    const livePreview = () => _applyGradient(_readGradientFromDOM(block));
    block.querySelectorAll('input[type=color], input[type=range]')
        .forEach(inp => inp.addEventListener('input', livePreview));

    // Intercept the Settings Config submit to save custom inputs before
    // Foundry processes the form.
    const form = section.closest('form');
    if (form && !form._uiqolGradientBound) {
        form._uiqolGradientBound = true;
        form.addEventListener('submit', async () => {
            await _saveGradientFromDOM(block);
        }, { capture: true });
    }
});

/** Read gradient values from the injected DOM block. */
function _readGradientFromDOM(block) {
    const mode = block.querySelector('[name=uiqol-gradient-mode]:checked')?.value ?? 'theme';
    const topColor = block.querySelector('[name=uiqol-gradient-top-color]')?.value ?? '#7b8288';
    const topAlpha = Number(block.querySelector('[name=uiqol-gradient-top-alpha]')?.value ?? 85);
    const bottomColor = block.querySelector('[name=uiqol-gradient-bottom-color]')?.value ?? '#7b8288';
    const bottomAlpha = Number(block.querySelector('[name=uiqol-gradient-bottom-alpha]')?.value ?? 0);
    return { mode, topColor, topAlpha, bottomColor, bottomAlpha };
}

/** Save gradient values from the injected DOM block to settings. */
async function _saveGradientFromDOM(block) {
    const { mode, topColor, topAlpha, bottomColor, bottomAlpha } = _readGradientFromDOM(block);
    const set = (k, v) => game.settings.set('ui-qol-options', k, v);
    await set('sidebarGradientMode', mode);
    await set('sidebarGradientTopColor', topColor);
    await set('sidebarGradientTopAlpha', topAlpha);
    await set('sidebarGradientBottomColor', bottomColor);
    await set('sidebarGradientBottomAlpha', bottomAlpha);
    _applyGradient();
}

// ============================================================
// Drag from anywhere
// ============================================================
Hooks.on('ready', () => {
    // Interactive elements that should keep their own pointer behaviour
    // and never start a window drag.  Resize handles (.window-resize-handle
    // for ApplicationV2, .window-resizable-handle for ApplicationV1) must
    // be excluded so corner-dragging does not hijack the resize interaction.
    // Disabled inputs (e.g. .sheet-name in SR5 play mode) are non-interactive
    // by definition and are intentionally left draggable.
    const INTERACTIVE = 'input:not([disabled]), select, textarea, button, a, label, [contenteditable], canvas, ' +
        '[draggable="true"], ' +
        '.window-resize-handle, .window-resizable-handle';

    // Inject compendium-clear CSS if enabled
    if (game.settings.get('ui-qol-options', 'clearCompendiumTabs')) {
        const styleId = 'ui-qol-compendium-clear-style';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'modules/ui-qol-options/styles/compendium-clear.css';
            document.head.appendChild(link);
        }
    }

    // Inject sidebar fix CSS if enabled
    if (game.settings.get('ui-qol-options', 'fixedSidebarButtons')) {
        const styleId = 'ui-qol-sidebar-fix-style';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'modules/ui-qol-options/styles/sidebar-fix.css';
            document.head.appendChild(link);
        }
    }

    document.addEventListener('pointerdown', (event) => {
        // Ignore synthetic events.
        if (!event.isTrusted) return;

        // Left button only – right/middle have their own behaviours.
        if (event.button !== 0) return;
        if (!game.settings.get('ui-qol-options', 'dragFromAnywhere')) return;
        if (event.target.closest(INTERACTIVE)) return;
        const windowEl = event.target.closest('.window-app, .application');
        if (!windowEl) return;
        const header = windowEl.querySelector('.window-header');
        if (!header) return;

        // Skip if the click is already on the header (already draggable).
        if (header.contains(event.target)) return;

        // Suppress text-selection while the user drags.
        event.preventDefault();

        // Dispatch synthetic pointerdown on the header with the real
        // event's coordinates. 
        header.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            screenX: event.screenX,
            screenY: event.screenY,
            button: 0,
            buttons: 1,
        }));
    }, { capture: true });
});

// ============================================================
// Tooltip delay reset  +  tooltip linger after mouse-out
// ============================================================
Hooks.on('ready', () => {
    let pendingEl = null;   // element waiting for activation
    let pendingTimer = null;   // activation timer id
    let lingerTimer = null;   // hide (linger) timer id

    // ── Shared helpers ──────────────────────────────────────────────────────
    function clearPending() {
        if (pendingTimer !== null) { clearTimeout(pendingTimer); pendingTimer = null; }
        if (pendingEl) { pendingEl.removeEventListener('pointerleave', onLeaveBeforeActivate); pendingEl = null; }
    }

    function clearLinger() {
        if (lingerTimer !== null) { clearTimeout(lingerTimer); lingerTimer = null; }
    }

    // Fires when the cursor leaves a pending (not-yet-activated) target.
    function onLeaveBeforeActivate(event) {
        if (event.target === pendingEl) clearPending();
    }

    // ── Linger: intercept pointerleave ──────────────────────────────────────
    document.addEventListener('pointerleave', (event) => {
        const el = event.target;
        if (!(el instanceof Element)) return;

        // Only intercept when leaving the currently active tooltip element.
        if (!game.tooltip.element || el !== game.tooltip.element) return;

        // Preserve Foundry behavior: if there's a parent tooltip element,
        // don't intercept — Foundry will activate the parent instead.
        if (el.parentElement?.closest('[data-tooltip],[data-tooltip-text],[data-tooltip-html]')) return;

        const hideDelayMs = game.settings.get('ui-qol-options', 'tooltipHideDelay');

        // Prevent Foundry's own 500 ms deactivation timer from starting.
        event.stopImmediatePropagation();

        if (hideDelayMs <= 0) {
            // 0 ms: hide immediately (overrides Foundry's 500 ms default).
            game.tooltip.deactivate();
            return;
        }

        // Keep the tooltip visible for the configured linger duration.
        lingerTimer = setTimeout(() => {
            lingerTimer = null;
            game.tooltip.deactivate();
        }, hideDelayMs);
    }, { capture: true });

    // ── Reset-delay: intercept pointerenter ─────────────────────────────────
    document.addEventListener('pointerenter', (event) => {
        const el = event.target;
        if (!(el instanceof Element)) return;

        const tooltipHost = el.closest('[data-tooltip],[data-tooltip-text],[data-tooltip-html]');

        // If entering a tooltipped element while a linger is active, cancel
        // the linger and immediately hide the old tooltip so the new one
        // can activate cleanly.
        if (lingerTimer !== null && tooltipHost) {
            clearLinger();
            if (game.tooltip.element) game.tooltip.deactivate();
        }

        // Bail out if no tooltip is currently showing (nothing further to do).
        if (!game.tooltip.element) return;

        const delayMs = game.settings.get('ui-qol-options', 'tooltipResetDelay');
        if (delayMs <= 0) return;

        // Bail out if the pointer is still within the current tooltip's host element.
        if (game.tooltip.element.contains(el)) return;

        // Only intercept if the new target is inside a tooltipped element.
        if (!tooltipHost) return;

        // Cancel a previously queued activation (cursor moved through quickly).
        clearPending();

        // Hide the current tooltip and reset Foundry's internal #active flag.
        game.tooltip.deactivate();

        // Prevent Foundry's #onActivate from starting its own 500ms timer.
        event.stopImmediatePropagation();

        // Queue activation with the configured delay.
        pendingEl = el;
        el.addEventListener('pointerleave', onLeaveBeforeActivate);
        pendingTimer = setTimeout(() => {
            pendingTimer = null;
            if (pendingEl === el && el.isConnected) {
                el.removeEventListener('pointerleave', onLeaveBeforeActivate);
                pendingEl = null;
                const hasDataTooltip = el.dataset.tooltipHtml || el.dataset.tooltipText || el.dataset.tooltip;
                const options = hasDataTooltip ? {} : { text: el.ariaLabel };
                game.tooltip.activate(el, options);
            }
        }, delayMs);
    }, { capture: true });
});

// ============================================================
// Hotbar slot scale
// ============================================================

/**
 * Apply #action-bar zoom from the scale slider setting.
 * @param {number} [overrideScale]  0–1 fraction for live preview
 *   (passed before the setting is saved on every drag tick).
 */
function _applyHotbarSlotZoom(overrideScale) {
    const actionBar = document.querySelector('#hotbar #action-bar');
    const hotbar = actionBar?.closest('#hotbar');
    if (!actionBar || !hotbar) return;

    const scale = overrideScale ?? (game.settings.get('ui-qol-options', 'hotbarSlotScale') / 100);
    const zoomed = scale < 1.0;

    hotbar.classList.toggle('ui-qol-hotbar-zoomed', zoomed);
    actionBar.style.zoom = zoomed ? String(Math.max(0.1, scale)) : '';
}

Hooks.on('ready', () => {
    _applyHotbarSlotZoom();
    _applyGradient();

    // Apply double-click delay — MouseInteractionManager is available from 'ready' onwards.
    const delay = game.settings.get('ui-qol-options', 'doubleClickDelay');
    if (delay !== 250) MouseInteractionManager.DOUBLE_CLICK_TIME_MS = delay;

    // ── Chat context-menu: float outside sidebar, open to the left of the card ──
    {
        const observer = new MutationObserver((mutations) => {
            if (!game.settings.get('ui-qol-options', 'chatContextMenuLeft')) return;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1 || node.id !== 'context-menu') continue;
                    if (!mutation.target.classList.contains('chat-message')) continue;

                    const rect = mutation.target.getBoundingClientRect();
                    document.body.appendChild(node); // escapes overflow:hidden ancestors
                    Object.assign(node.style, {
                        position: 'fixed',
                        top:      rect.top + 'px',
                        bottom:   'auto',
                        left:     'auto',
                        right:    (window.innerWidth - rect.left) + 'px',
                        width:    'max-content',
                        minWidth: 'unset',
                        maxWidth: '360px',
                    });
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
});

Hooks.on('renderHotbar', () => {
    _applyHotbarSlotZoom();
});

Hooks.on('renderSettingsConfig', (_app, html) => {
    const picker = html.querySelector('range-picker[name="ui-qol-options.hotbarSlotScale"]');
    if (!picker) return;
    const rangeInput = picker.querySelector('input[type="range"]');
    if (!rangeInput) return;
    rangeInput.addEventListener('input', () => {
        _applyHotbarSlotZoom(rangeInput.valueAsNumber / 100);
    });
});

// ============================================================
// Chat controls layout fix
// ============================================================
Hooks.on('renderChatInput', (_app, _elements, { previousParent }) => {
    if (!game.settings.get('ui-qol-options', 'fixedSidebarButtons')) return;

    // Strip the vertical class Foundry sets on #roll-privacy in notification mode.
    document.getElementById('roll-privacy')?.classList.remove('vertical');

    const inputEl = document.getElementById('chat-message');
    const controlsEl = document.getElementById('chat-controls');
    const notifEl = document.getElementById('chat-notifications');

    const movingToNotifications = inputEl?.parentElement === notifEl
        && previousParent?.id !== 'chat-notifications';

    if (movingToNotifications && inputEl && controlsEl) {
        inputEl.style.visibility = 'hidden';
        controlsEl.style.visibility = 'hidden';
        setTimeout(() => {
            inputEl.style.visibility = '';
            controlsEl.style.visibility = '';
        }, 260);  // slightly longer than the 250 ms sidebar transition
    }
});
