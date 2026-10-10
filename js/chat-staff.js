// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — ADMIN CHAT INBOX
// Handles: conversation list, realtime, reply, unread badge
// Admin-only. Staff role never sees this.
// ═══════════════════════════════════════════════════════════════════

window.AdminChat = (function () {
    let conversations = [];
    let currentConv = null;
    let currentMessages = [];
    let realtimeChannel = null;
    let unreadTotal = 0;

    // ───────────────────────────────────────────────────────────────
    // INIT
    // ───────────────────────────────────────────────────────────────
    async function init() {
        console.log('💬 [AdminChat] Init');
        await loadConversations();
        subscribeRealtime();
        renderInbox();
        updateNavBadge();
    }

    // ───────────────────────────────────────────────────────────────
    // LOAD CONVERSATIONS
    // ───────────────────────────────────────────────────────────────
    async function loadConversations() {
        if (!window.supabaseClient) return [];

        // Get all open conversations + last message
        const { data, error } = await window.supabaseClient
            .from('chat_conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('[AdminChat] Load conv error:', error.message);
            return [];
        }

        conversations = data || [];

        // For each conversation, get unread count + last message
        for (const conv of conversations) {
            const { data: msgs } = await window.supabaseClient
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1);

            conv.lastMessage = msgs?.[0] || null;

            const { count } = await window.supabaseClient
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('sender_type', 'guest')
                .eq('is_read_by_admin', false);

            conv.unreadCount = count || 0;
        }

        unreadTotal = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
        console.log('💬 [AdminChat] Loaded', conversations.length, 'conversations,', unreadTotal, 'unread');
        return conversations;
    }

    // ───────────────────────────────────────────────────────────────
    // REALTIME
    // ───────────────────────────────────────────────────────────────
    function subscribeRealtime() {
        if (realtimeChannel) return;

        realtimeChannel = window.supabaseClient
            .channel('admin-chat-global')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                async (payload) => {
                    const msg = payload.new;
                    if (msg.sender_type === 'guest') {
                        // Reload conversations to update ordering + unread
                        await loadConversations();
                        renderInbox();
                        updateNavBadge();

                        // If this conversation is open, append
                        if (currentConv && currentConv.id === msg.conversation_id) {
                            appendMessageToView(msg);
                            markConvAsRead(currentConv.id);
                        }

                        // Sound alert
                        if (typeof playNewRequestSound === 'function') {
                            try { playNewRequestSound(); } catch(e) {}
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('💬 [AdminChat] Realtime:', status);
            });
    }

    // ───────────────────────────────────────────────────────────────
    // RENDER — Inbox list
    // ───────────────────────────────────────────────────────────────
    function renderInbox() {
        const container = document.getElementById('adminChatInboxList');
        const countEl = document.getElementById('adminChatConvCount');
        if (!container) return;

        if (countEl) countEl.textContent = conversations.length;

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="admin-chat-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No conversations yet</p>
                    <span>Messages from guests will appear here</span>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conv => {
            const last = conv.lastMessage;
            const preview = last ? escapeHtml(last.content.substring(0, 60)) + (last.content.length > 60 ? '…' : '') : 'No messages yet';
            const time = last ? formatTime(last.created_at) : formatTime(conv.created_at);
            const isActive = currentConv && currentConv.id === conv.id;
            const unread = conv.unreadCount || 0;

            return `
                <div class="admin-chat-item ${isActive ? 'active' : ''}" onclick="AdminChat.openConversation('${conv.id}')">
                    <div class="admin-chat-item-avatar">
                        <i class="fas fa-door-open"></i>
                    </div>
                    <div class="admin-chat-item-body">
                        <div class="admin-chat-item-top">
                            <span class="admin-chat-item-room">Room ${escapeHtml(conv.room)}</span>
                            <span class="admin-chat-item-time">${time}</span>
                        </div>
                        <div class="admin-chat-item-name">${escapeHtml(conv.guest_name)}</div>
                        <div class="admin-chat-item-preview">${preview}</div>
                    </div>
                    ${unread > 0 ? `<span class="admin-chat-item-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // ───────────────────────────────────────────────────────────────
    // OPEN CONVERSATION
    // ───────────────────────────────────────────────────────────────
    async function openConversation(convId) {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;

        currentConv = conv;

        // Load messages
        const { data, error } = await window.supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[AdminChat] Load messages error:', error.message);
            return;
        }

        currentMessages = data || [];
        renderConversation();
        renderInbox();

        // Mark as read
        await markConvAsRead(convId);
        await loadConversations();
        renderInbox();
        updateNavBadge();
    }

    function renderConversation() {
        const pane = document.getElementById('adminChatConversationPane');
        const empty = document.getElementById('adminChatEmptyPane');
        const title = document.getElementById('adminChatConvTitle');
        const sub = document.getElementById('adminChatConvSub');

        if (!pane || !currentConv) return;

        if (empty) empty.classList.add('hidden');
        pane.classList.remove('hidden');

        if (title) title.textContent = `Room ${currentConv.room}`;
        if (sub) sub.textContent = currentConv.guest_name;

        const msgsContainer = document.getElementById('adminChatMessages');
        if (!msgsContainer) return;

        if (currentMessages.length === 0) {
            msgsContainer.innerHTML = `
                <div class="admin-chat-no-msg">
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }

        msgsContainer.innerHTML = currentMessages.map(m => buildBubble(m)).join('');
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    function buildBubble(msg) {
        const isAdmin = msg.sender_type === 'admin';
        const time = formatTime(msg.created_at);
        const align = isAdmin ? 'admin-chat-msg--admin' : 'admin-chat-msg--guest';
        const label = isAdmin ? 'You' : (msg.sender_name || 'Guest');

        return `
            <div class="admin-chat-msg ${align}">
                <div class="admin-chat-msg-label">${escapeHtml(label)} · ${time}</div>
                <div class="admin-chat-msg-bubble">${escapeHtml(msg.content)}</div>
            </div>
        `;
    }

    function appendMessageToView(msg) {
        const msgsContainer = document.getElementById('adminChatMessages');
        if (!msgsContainer) return;
        currentMessages.push(msg);
        const wrap = document.createElement('div');
        wrap.innerHTML = buildBubble(msg);
        msgsContainer.appendChild(wrap.firstElementChild);
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    // ───────────────────────────────────────────────────────────────
    // SEND MESSAGE (from admin)
    // ───────────────────────────────────────────────────────────────
    async function sendMessage(content) {
        if (!currentConv) return false;
        const text = String(content || '').trim();
        if (!text) return false;

        const adminName = getAdminName();

        const { error } = await window.supabaseClient
            .from('chat_messages')
            .insert([{
                conversation_id: currentConv.id,
                sender_type: 'admin',
                sender_name: adminName,
                content: text,
                is_read_by_admin: true,
                is_read_by_guest: false
            }]);

        if (error) {
            console.error('[AdminChat] Send error:', error.message);
            return false;
        }

        // Optimistic append
        const optimisticMsg = {
            conversation_id: currentConv.id,
            sender_type: 'admin',
            sender_name: adminName,
            content: text,
            is_read_by_admin: true,
            is_read_by_guest: false,
            created_at: new Date().toISOString()
        };
        appendMessageToView(optimisticMsg);

        // Reload list to update preview
        await loadConversations();
        renderInbox();

        return true;
    }

    // ───────────────────────────────────────────────────────────────
    // MARK READ
    // ───────────────────────────────────────────────────────────────
    async function markConvAsRead(convId) {
        const { error } = await window.supabaseClient
            .from('chat_messages')
            .update({ is_read_by_admin: true })
            .eq('conversation_id', convId)
            .eq('sender_type', 'guest')
            .eq('is_read_by_admin', false);

        if (error) console.warn('[AdminChat] Mark read error:', error.message);
    }

    // ───────────────────────────────────────────────────────────────
    // NAV BADGE
    // ───────────────────────────────────────────────────────────────
    function updateNavBadge() {
        const badge = document.getElementById('navChatBadge');
        if (!badge) return;

        if (unreadTotal > 0) {
            badge.textContent = unreadTotal > 99 ? '99+' : String(unreadTotal);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ───────────────────────────────────────────────────────────────
    // UTIL
    // ───────────────────────────────────────────────────────────────
    function getAdminName() {
        try {
            if (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name) {
                return currentStaffUser.name;
            }
        } catch(e) {}
        return 'Reception';
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'now';
        if (diffMin < 60) return diffMin + 'm';
        if (diffMin < 1440) return Math.floor(diffMin / 60) + 'h';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    }

    // ───────────────────────────────────────────────────────────────
    // PUBLIC API
    // ───────────────────────────────────────────────────────────────
    return {
        init,
        openConversation,
        sendMessage,
        loadConversations,
        renderInbox,
        updateNavBadge
    };
})();

console.log('✅ [AdminChat] Admin chat inbox service loaded');
