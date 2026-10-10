// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — ADMIN CHAT (Guest ↔ Admin)
// Aligned with index.html (sectionAdminChat / adminChat* ids)
// ═══════════════════════════════════════════════════════════════════

window.AdminChat = (function () {
    let conversations = [];
    let activeConversationId = null;
    let realtimeChannel = null;
    let pollTimer = null;

    // ───────────────────────────────────────────────────────────────
    // SUPABASE ACCESSOR
    // ───────────────────────────────────────────────────────────────
    function getSB() {
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            return window.supabaseClient;
        }
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                window.supabaseClient = supabaseClient;
                return supabaseClient;
            }
        } catch (e) {}
        return null;
    }

    // ───────────────────────────────────────────────────────────────
    // INIT
    // ───────────────────────────────────────────────────────────────
    function init() {
        const sb = getSB();
        if (!sb) {
            console.warn('💬 [AdminChat] No Supabase client');
            return;
        }
        if (typeof isAdmin === 'function' && !isAdmin()) {
            console.log('💬 [AdminChat] Skipped — user is not admin');
            return;
        }
        console.log('💬 [AdminChat] Initializing...');
        refreshAll();
        subscribeRealtime();
        pollTimer = setInterval(refreshAll, 60000);
    }

    // ───────────────────────────────────────────────────────────────
    // REFRESH
    // ───────────────────────────────────────────────────────────────
    async function refreshAll() {
        await loadConversations();
    }

    async function loadConversations() {
        const sb = getSB();
        if (!sb) return;

        const { data, error } = await sb
            .from('chat_conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('[AdminChat] Load error:', error.message);
            return;
        }

        conversations = data || [];

        for (const c of conversations) {
            const { data: msgs } = await sb
                .from('chat_messages')
                .select('content, sender_type, created_at, is_read_by_admin')
                .eq('conversation_id', c.id)
                .order('created_at', { ascending: false })
                .limit(20);

            const list = msgs || [];
            c._lastMessage = list[0] || null;
            c._unreadCount = list.filter(m => m.sender_type === 'guest' && !m.is_read_by_admin).length;
        }

        renderInbox();
        updateConvCount();
        updateNavBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // RENDER INBOX
    // ───────────────────────────────────────────────────────────────
    function renderInbox() {
        const container = document.getElementById('adminChatInboxList');
        if (!container) return;

        const searchEl = document.getElementById('adminChatSearch');
        const q = searchEl ? searchEl.value.toLowerCase().trim() : '';

        let filtered = conversations;
        if (q) {
            filtered = conversations.filter(c =>
                String(c.room).toLowerCase().includes(q) ||
                String(c.guest_name || '').toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="admin-chat-empty">
                    <i class="fas fa-inbox"></i>
                    <p>${q ? 'No matches' : 'No conversations yet'}</p>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(c => {
            const last = c._lastMessage;
            const lastText = last ? escapeHtml(last.content).substring(0, 55) : '—';
            const lastTime = last ? formatTime(last.created_at) : '';
            const unread = c._unreadCount > 0;
            const isActive = c.id === activeConversationId;
            const preview = last && last.sender_type === 'admin'
                ? `<span class="text-[#DCA773]">You: </span>${lastText}`
                : lastText;

            return `
                <div onclick="AdminChat.openConversation('${c.id}')"
                     class="admin-chat-conv-item ${isActive ? 'active' : ''} ${unread ? 'unread' : ''}">
                    <div class="admin-chat-conv-avatar">${escapeHtml(String(c.guest_name || '?').charAt(0).toUpperCase())}</div>
                    <div class="admin-chat-conv-body">
                        <div class="admin-chat-conv-header">
                            <span class="admin-chat-conv-name">${escapeHtml(c.guest_name || 'Guest')}</span>
                            <span class="admin-chat-conv-time">${lastTime}</span>
                        </div>
                        <div class="admin-chat-conv-room">🚪 Room ${escapeHtml(String(c.room))}</div>
                        <div class="admin-chat-conv-preview">${preview}</div>
                    </div>
                    ${unread ? `<div class="admin-chat-conv-badge">${c._unreadCount > 9 ? '9+' : c._unreadCount}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // ───────────────────────────────────────────────────────────────
    // OPEN CONVERSATION
    // ───────────────────────────────────────────────────────────────
    async function openConversation(convId) {
        const sb = getSB();
        if (!sb) return;

        activeConversationId = convId;
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;

        const emptyPane = document.getElementById('adminChatEmptyPane');
        const convPane = document.getElementById('adminChatConversationPane');
        if (emptyPane) emptyPane.classList.add('hidden');
        if (convPane) convPane.classList.remove('hidden');

        const titleEl = document.getElementById('adminChatConvTitle');
        const subEl = document.getElementById('adminChatConvSub');
        if (titleEl) titleEl.textContent = 'Room ' + conv.room;
        if (subEl) subEl.textContent = conv.guest_name || 'Guest';

        await loadMessages(convId);
        await markAsRead(convId);
        renderInbox();
        updateConvCount();
        updateNavBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // LOAD MESSAGES
    // ───────────────────────────────────────────────────────────────
    async function loadMessages(convId) {
        const sb = getSB();
        if (!sb) return;

        const { data, error } = await sb
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[AdminChat] Messages error:', error.message);
            return;
        }

        renderMessages(data || []);
    }

    function renderMessages(messages) {
        const container = document.getElementById('adminChatMessages');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">No messages yet</p>`;
            return;
        }

        container.innerHTML = messages.map(m => {
            const isAdmin = m.sender_type === 'admin';
            const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const align = isAdmin ? 'admin-chat-msg--admin' : 'admin-chat-msg--guest';
            const label = isAdmin ? (m.sender_name || 'You') : (m.sender_name || 'Guest');

            return `
                <div class="admin-chat-msg ${align}">
                    <div class="admin-chat-msg-label">${escapeHtml(label)} · ${time}</div>
                    <div class="admin-chat-msg-bubble">${escapeHtml(m.content)}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    // ───────────────────────────────────────────────────────────────
    // SEND MESSAGE
    // ───────────────────────────────────────────────────────────────
    async function sendMessage(text) {
        const sb = getSB();
        if (!sb || !activeConversationId) return false;

        const clean = String(text || '').trim();
        if (!clean) return false;

        const adminName = (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
            ? currentStaffUser.name
            : 'Admin';

        const { error } = await sb
            .from('chat_messages')
            .insert([{
                conversation_id: activeConversationId,
                sender_type: 'admin',
                sender_name: adminName,
                content: clean,
                is_read_by_admin: true,
                is_read_by_guest: false
            }]);

        if (error) {
            console.error('[AdminChat] Send error:', error.message);
            return false;
        }

        await loadMessages(activeConversationId);
        return true;
    }

    // ───────────────────────────────────────────────────────────────
    // MARK AS READ
    // ───────────────────────────────────────────────────────────────
    async function markAsRead(convId) {
        const sb = getSB();
        if (!sb) return;

        await sb
            .from('chat_messages')
            .update({ is_read_by_admin: true })
            .eq('conversation_id', convId)
            .eq('sender_type', 'guest')
            .eq('is_read_by_admin', false);

        const conv = conversations.find(c => c.id === convId);
        if (conv) conv._unreadCount = 0;
    }

    // ───────────────────────────────────────────────────────────────
    // BADGES
    // ───────────────────────────────────────────────────────────────
    function updateConvCount() {
        const el = document.getElementById('adminChatConvCount');
        if (el) {
            const openCount = conversations.filter(c => c.status === 'open').length;
            el.textContent = `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} (${openCount} open)`;
        }
    }

    function updateNavBadge() {
        const navBadge = document.getElementById('navChatBadge');
        if (!navBadge) return;

        const totalUnread = conversations.reduce((sum, c) => sum + (c._unreadCount || 0), 0);
        if (totalUnread > 0) {
            navBadge.textContent = totalUnread > 9 ? '9+' : String(totalUnread);
            navBadge.classList.remove('hidden');
        } else {
            navBadge.classList.add('hidden');
        }

        if (window.ChatNotifications && typeof window.ChatNotifications.updateFromConversations === 'function') {
            window.ChatNotifications.updateFromConversations(conversations, totalUnread);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // REALTIME
    // ───────────────────────────────────────────────────────────────
    function subscribeRealtime() {
        const sb = getSB();
        if (!sb || realtimeChannel) return;

        realtimeChannel = sb
            .channel('admin-chat')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' },
                () => { refreshAll(); if (activeConversationId) loadMessages(activeConversationId); }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' },
                () => { refreshAll(); }
            )
            .subscribe((status) => console.log('💬 [AdminChat] Realtime:', status));
    }

    // ───────────────────────────────────────────────────────────────
    // UTIL
    // ───────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'now';
        if (diffMin < 60) return `${diffMin}m`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h`;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    // ───────────────────────────────────────────────────────────────
    // PUBLIC API
    // ───────────────────────────────────────────────────────────────
    return {
        init,
        refreshAll,
        renderInbox,
        openConversation,
        sendMessage,
        _getConversations: () => conversations,
        _getActiveId: () => activeConversationId
    };
})();

// ───────────────────────────────────────────────────────────────
// BOOT
// ───────────────────────────────────────────────────────────────
(function bootAdminChat() {
    let attempts = 0;
    const MAX = 40;

    function tryInit() {
        attempts++;
        const sb = (window.supabaseClient) ||
                   (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
        const hasAdmin = (typeof isAdmin === 'function');

        if (sb && hasAdmin) {
            console.log(`💬 [AdminChat] Dependencies ready (attempt ${attempts})`);
            if (isAdmin()) {
                window.AdminChat.init();
            } else {
                console.log('💬 [AdminChat] Not admin — disabled');
            }
            return;
        }

        if (attempts >= MAX) {
            console.warn('[AdminChat] Gave up waiting');
            return;
        }
        setTimeout(tryInit, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 500));
    } else {
        setTimeout(tryInit, 500);
    }
})();

console.log('✅ [AdminChat] Loaded');
