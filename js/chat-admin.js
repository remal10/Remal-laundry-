// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — ADMIN CHAT (Guest ↔ Admin)
// Admin only. Uses existing isAdmin() / requireAdmin() from ui-modules.js
// ═══════════════════════════════════════════════════════════════════

window.ChatAdmin = (function () {
    let conversations = [];
    let activeConversationId = null;
    let realtimeChannel = null;
    let pollTimer = null;

    // ───────────────────────────────────────────────────────────────
    // INIT — called on DOMContentLoaded (admin only)
    // ───────────────────────────────────────────────────────────────
    function init() {
        if (!isAdmin()) {
            console.log('💬 [ChatAdmin] Skipped — user is not admin');
            return;
        }
        if (!window.supabaseClient) {
            console.warn('💬 [ChatAdmin] No Supabase client');
            return;
        }
        console.log('💬 [ChatAdmin] Initializing for admin...');
        refreshAll();
        subscribeRealtime();
        // Auto-refresh every 60s as fallback
        pollTimer = setInterval(refreshAll, 60000);
    }

    // ───────────────────────────────────────────────────────────────
    // REFRESH ALL — reload conversations + update badges
    // ───────────────────────────────────────────────────────────────
    async function refreshAll() {
        await loadConversations();
        updateNavBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // LOAD CONVERSATIONS
    // ───────────────────────────────────────────────────────────────
    async function loadConversations() {
        const { data, error } = await window.supabaseClient
            .from('chat_conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('[ChatAdmin] Load conversations error:', error.message);
            return;
        }

        conversations = data || [];

        // Fetch last message + unread count for each
        for (const c of conversations) {
            const { data: msgs } = await window.supabaseClient
                .from('chat_messages')
                .select('content, sender_type, created_at, is_read_by_admin')
                .eq('conversation_id', c.id)
                .order('created_at', { ascending: false })
                .limit(20);

            const list = msgs || [];
            c._lastMessage = list[0] || null;
            c._unreadCount = list.filter(m => m.sender_type === 'guest' && !m.is_read_by_admin).length;
        }

        renderConversations();
        updateStatsBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // RENDER CONVERSATIONS LIST
    // ───────────────────────────────────────────────────────────────
    function renderConversations() {
        const container = document.getElementById('chatConversationsList');
        if (!container) return;

        const searchEl = document.getElementById('chatSearchInput');
        const q = searchEl ? searchEl.value.toLowerCase().trim() : '';

        let filtered = conversations;
        if (q) {
            filtered = conversations.filter(c =>
                String(c.room).toLowerCase().includes(q) ||
                String(c.guest_name).toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">${q ? 'No matches' : 'No conversations yet'}</p>`;
            return;
        }

        container.innerHTML = filtered.map(c => {
            const last = c._lastMessage;
            const lastText = last ? escapeHtml(last.content).substring(0, 60) : '—';
            const lastTime = last ? formatTime(last.created_at) : '';
            const unread = c._unreadCount > 0;
            const isArchived = c.status === 'archived';
            const isActive = c.id === activeConversationId;

            const preview = last && last.sender_type === 'admin'
                ? `<span class="text-[#DCA773]">You: </span>${lastText}`
                : lastText;

            return `
                <div onclick="ChatAdmin.openConversation('${c.id}')"
                     class="chat-conv-item ${isActive ? 'active' : ''} ${unread ? 'unread' : ''} ${isArchived ? 'archived' : ''}">
                    <div class="chat-conv-avatar">${escapeHtml(String(c.guest_name || '?').charAt(0).toUpperCase())}</div>
                    <div class="chat-conv-body">
                        <div class="chat-conv-header">
                            <span class="chat-conv-name">${escapeHtml(c.guest_name || 'Guest')}</span>
                            <span class="chat-conv-time">${lastTime}</span>
                        </div>
                        <div class="chat-conv-room">🚪 Room ${escapeHtml(String(c.room))} ${isArchived ? '· <span class="text-stone-500">archived</span>' : ''}</div>
                        <div class="chat-conv-preview">${preview}</div>
                    </div>
                    ${unread ? `<div class="chat-conv-badge">${c._unreadCount > 9 ? '9+' : c._unreadCount}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // ───────────────────────────────────────────────────────────────
    // OPEN CONVERSATION
    // ───────────────────────────────────────────────────────────────
    async function openConversation(convId) {
        activeConversationId = convId;
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;

        document.getElementById('chatEmptyState').classList.add('hidden');
        document.getElementById('chatActiveHeader').classList.remove('hidden');
        document.getElementById('chatActiveMessages').classList.remove('hidden');
        document.getElementById('chatActiveInputWrap').classList.remove('hidden');

        document.getElementById('chatActiveGuestName').textContent = conv.guest_name || 'Guest';
        document.getElementById('chatActiveRoom').textContent = 'Room ' + conv.room;

        await loadMessages(convId);
        await markAsRead(convId);
        renderConversations();
        updateStatsBadge();
        updateNavBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // LOAD MESSAGES
    // ───────────────────────────────────────────────────────────────
    async function loadMessages(convId) {
        const { data, error } = await window.supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ChatAdmin] Load messages error:', error.message);
            return;
        }

        renderMessages(data || []);
    }

    // ───────────────────────────────────────────────────────────────
    // RENDER MESSAGES
    // ───────────────────────────────────────────────────────────────
    function renderMessages(messages) {
        const container = document.getElementById('chatActiveMessages');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">No messages yet</p>`;
            return;
        }

        container.innerHTML = messages.map(m => {
            const isAdminMsg = m.sender_type === 'admin';
            const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const align = isAdminMsg ? 'chat-msg--admin' : 'chat-msg--guest';
            const label = isAdminMsg ? (m.sender_name || 'You') : (m.sender_name || 'Guest');

            return `
                <div class="chat-msg ${align}">
                    <div class="chat-msg-label">${escapeHtml(label)} · ${time}</div>
                    <div class="chat-msg-bubble">${escapeHtml(m.content)}</div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    // ───────────────────────────────────────────────────────────────
    // SEND MESSAGE
    // ───────────────────────────────────────────────────────────────
    async function sendCurrent() {
        if (!activeConversationId) return;
        const input = document.getElementById('chatAdminInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        const adminName = (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
            ? currentStaffUser.name
            : 'Admin';

        const { error } = await window.supabaseClient
            .from('chat_messages')
            .insert([{
                conversation_id: activeConversationId,
                sender_type: 'admin',
                sender_name: adminName,
                content: text,
                is_read_by_admin: true,
                is_read_by_guest: false
            }]);

        if (error) {
            console.error('[ChatAdmin] Send error:', error.message);
            input.value = text;
            alert('⚠️ Could not send message. Retry.');
            return;
        }

        // Optimistic render (realtime will also add it, but dedup on next refresh)
        await loadMessages(activeConversationId);
    }

    // ───────────────────────────────────────────────────────────────
    // MARK AS READ (guest messages)
    // ───────────────────────────────────────────────────────────────
    async function markAsRead(convId) {
        await window.supabaseClient
            .from('chat_messages')
            .update({ is_read_by_admin: true })
            .eq('conversation_id', convId)
            .eq('sender_type', 'guest')
            .eq('is_read_by_admin', false);

        // Update local cache
        const conv = conversations.find(c => c.id === convId);
        if (conv) conv._unreadCount = 0;
    }

    // ───────────────────────────────────────────────────────────────
    // ARCHIVE
    // ───────────────────────────────────────────────────────────────
    async function archiveCurrent() {
        if (!activeConversationId) return;
        if (!confirm('Archive this conversation?')) return;

        await window.supabaseClient
            .from('chat_conversations')
            .update({ status: 'archived' })
            .eq('id', activeConversationId);

        await refreshAll();
    }

    // ───────────────────────────────────────────────────────────────
    // BADGES
    // ───────────────────────────────────────────────────────────────
    function updateStatsBadge() {
        const statEl = document.getElementById('chatStatsBadge');
        const unreadEl = document.getElementById('chatUnreadBadge');

        if (statEl) {
            const openCount = conversations.filter(c => c.status === 'open').length;
            statEl.textContent = `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} (${openCount} open)`;
        }
        if (unreadEl) {
            const totalUnread = conversations.reduce((sum, c) => sum + (c._unreadCount || 0), 0);
            if (totalUnread > 0) {
                unreadEl.textContent = `${totalUnread} unread`;
                unreadEl.classList.remove('hidden');
            } else {
                unreadEl.classList.add('hidden');
            }
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

        // Notify notification module
        if (window.ChatNotifications && typeof window.ChatNotifications.updateFromConversations === 'function') {
            window.ChatNotifications.updateFromConversations(conversations, totalUnread);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // REALTIME
    // ───────────────────────────────────────────────────────────────
    function subscribeRealtime() {
        if (realtimeChannel) return;

        realtimeChannel = window.supabaseClient
            .channel('admin-chat')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' },
                () => { refreshAll(); if (activeConversationId) loadMessages(activeConversationId); }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' },
                () => { refreshAll(); }
            )
            .subscribe((status) => console.log('💬 [ChatAdmin] Realtime:', status));
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
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
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
        renderConversations,
        openConversation,
        sendCurrent,
        archiveCurrent,
        _getConversations: () => conversations,
        _getActiveId: () => activeConversationId
    };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof isAdmin === 'function' && isAdmin()) {
            window.ChatAdmin.init();
        }
    }, 2000);
});

console.log('✅ [ChatAdmin] Loaded');
