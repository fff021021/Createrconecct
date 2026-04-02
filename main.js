import { supabase } from './supabase.js';

// Application State
let creators = [];
let currentUser = null;
let currentCategory = 'all';

// DOM Elements
const app = document.getElementById('app');
const authBtn = document.getElementById('auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const userNameDisplay = document.getElementById('user-name');
const singerView = document.getElementById('singer-view');
const creatorView = document.getElementById('creator-view');
const navSingerBtn = document.getElementById('nav-singer-btn');
const navCreatorBtn = document.getElementById('nav-creator-btn');
const creatorForm = document.getElementById('creator-form');
const creatorGrid = document.getElementById('creator-grid');
const filterChips = document.querySelectorAll('.filter-chip');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalCreatorName = document.getElementById('modal-creator-name');
const modalCreatorRole = document.getElementById('modal-creator-role');
const embedContainer = document.getElementById('embed-container');
const modalPriceText = document.getElementById('modal-price-text');
const modalContactLink = document.getElementById('modal-contact-link');
const modalDirectLink = document.getElementById('modal-direct-link');

// Preview Elements
const previewCard = document.getElementById('preview-card');
const previewName = document.getElementById('preview-name');
const previewRole = document.getElementById('preview-role');
const previewPrice = document.getElementById('preview-price');
const previewGenre = document.getElementById('preview-genre');

// Input Elements for Preview
const inputName = document.getElementById('reg-name');
const inputRole = document.getElementById('reg-role');
const inputPrice = document.getElementById('reg-price');
const inputGenre = document.getElementById('reg-genre');
const inputBgColor = document.getElementById('reg-bg-color');
const inputTextColor = document.getElementById('reg-text-color');
const inputFont = document.getElementById('reg-font');

// Initialize
async function init() {
    checkUser();
    await loadCreators();
    setupEventListeners();
    renderCreators();
}

async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    handleAuthState(user);
}

function handleAuthState(user) {
    currentUser = user;
    if (user) {
        authBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userNameDisplay.textContent = user.user_metadata.full_name || user.email;
        navCreatorBtn.classList.remove('hidden');
    } else {
        authBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        navCreatorBtn.classList.add('hidden');
    }
}

// Data Handling
async function loadCreators() {
    const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading creators:', error);
        return;
    }
    creators = data;
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    navSingerBtn.addEventListener('click', () => switchView('singer'));
    navCreatorBtn.addEventListener('click', () => switchView('creator'));

    // Filter
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.getAttribute('data-category');
            if (currentCategory === category) {
                currentCategory = 'all';
                chip.classList.remove('active');
            } else {
                filterChips.forEach(c => c.classList.remove('active'));
                currentCategory = category;
                chip.classList.add('active');
            }
            renderCreators();
        });
    });

    // Modal Close
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Form Live Preview
    [inputName, inputRole, inputPrice, inputGenre, inputBgColor, inputTextColor, inputFont].forEach(el => {
        el.addEventListener('input', updatePreview);
    });

    // Auth
    authBtn.addEventListener('click', async () => {
        // For simplicity in the demo, we'll suggest Google or Discord
        // But the user needs to enable them in Supabase console first.
        // We'll default to a sign-in modal/helper.
        await supabase.auth.signInWithOAuth({
            provider: 'discord', // Change to 'google' or 'twitter' as needed
            options: {
                redirectTo: window.location.origin
            }
        });
    });

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        handleAuthState(session?.user || null);
        renderCreators();
    });

    // Form Submission
    creatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('登録するにはログインが必要です。');
            return;
        }

        const creatorData = {
            name: inputName.value,
            role: inputRole.value,
            price: inputPrice.value,
            portfolio: document.getElementById('reg-portfolio').value,
            contact: document.getElementById('reg-contact').value,
            genre: inputGenre.value,
            style: {
                bg: inputBgColor.value,
                text: inputTextColor.value,
                font: inputFont.value
            },
            user_id: currentUser.id
        };

        const { error } = await supabase
            .from('creators')
            .upsert(creatorData, { onConflict: 'user_id' }); // Each user can have one creator profile

        if (error) {
            console.error('Error saving creator:', error);
            alert('保存に失敗しました。');
            return;
        }

        await loadCreators();
        renderCreators();
        
        alert('クリエイター情報の更新が完了しました！');
        creatorForm.reset();
        updatePreview();
        switchView('singer');
    });
}

// UI Controllers
function switchView(view) {
    if (view === 'singer') {
        singerView.classList.remove('hidden');
        creatorView.classList.add('hidden');
        navSingerBtn.classList.add('active');
        navCreatorBtn.classList.remove('active');
    } else {
        singerView.classList.add('hidden');
        creatorView.classList.remove('hidden');
        navSingerBtn.classList.remove('active');
        navCreatorBtn.classList.add('active');
    }
}

function updatePreview() {
    previewName.textContent = inputName.value || 'お名前';
    previewRole.textContent = getCategoryName(inputRole.value);
    previewPrice.textContent = inputPrice.value || '料金設定';
    previewGenre.textContent = inputGenre.value || '得意ジャンル';
    
    // Apply Styles
    previewCard.style.backgroundColor = inputBgColor.value;
    previewCard.style.color = inputTextColor.value;
    previewCard.style.fontFamily = inputFont.value;
    
    // Auto color for tag background? Let's just keep it consistent or use partial opacity.
    previewRole.style.backgroundColor = getContrastColor(inputBgColor.value);
}

function renderCreators() {
    creatorGrid.innerHTML = '';
    
    const filtered = currentCategory === 'all' 
        ? creators 
        : creators.filter(c => c.role === currentCategory);

    if (filtered.length === 0) {
        creatorGrid.innerHTML = '<div class="empty-state">該当するクリエイターが見つかりませんでした。</div>';
        return;
    }

    filtered.forEach(creator => {
        const card = document.createElement('div');
        card.className = 'creator-card';
        card.style.backgroundColor = creator.style.bg;
        card.style.color = creator.style.text;
        card.style.fontFamily = creator.style.font;

        // Ensure accessibility contrast for the role tag
        const tagBg = getContrastColor(creator.style.bg);

        card.innerHTML = `
            <span class="role-tag" style="background-color: ${tagBg}">${getCategoryName(creator.role)}</span>
            <h4>${creator.name}</h4>
            <div class="price-box" style="background-color: ${creator.style.bg}; border: 1px solid ${creator.style.text}44;">
                ${creator.price}
            </div>
            <div class="genre-tag" style="color: ${creator.style.text}ee">
                ${creator.genre ? '得意：' + creator.genre : ''}
            </div>
            <div class="card-footer" style="border-top: 1px solid ${creator.style.text}22">
                <div class="link-hint" style="color: ${creator.style.text}; font-weight: 700;">
                    依頼・詳細を確認
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
             openModal(creator);
        });

        creatorGrid.appendChild(card);
    });
}

// Modal Logic
function openModal(creator) {
    modalCreatorName.textContent = creator.name;
    modalCreatorRole.textContent = getCategoryName(creator.role);
    modalCreatorRole.style.backgroundColor = getContrastColor(creator.style.bg);
    modalPriceText.textContent = creator.price;
    modalContactLink.href = creator.contact.includes('@') ? `mailto:${creator.contact}` : (creator.contact.startsWith('http') ? creator.contact : `https://twitter.com/${creator.contact.replace('@', '')}`);
    modalDirectLink.href = creator.portfolio;

    // Management (Edit/Delete)
    const isOwner = currentUser && (creator.user_id === currentUser.id);
    const existingManageBox = modalBody.querySelector('.manage-box');
    if (existingManageBox) existingManageBox.remove();

    if (isOwner) {
        const manageBox = document.createElement('div');
        manageBox.className = 'manage-box';
        manageBox.innerHTML = `
            <button id="modal-delete-btn" class="modal-btn delete-btn">自分の情報を削除</button>
            <button id="modal-edit-btn" class="modal-btn edit-btn">情報を再編集</button>
        `;
        modalBody.insertBefore(manageBox, modalPriceText);
        
        document.getElementById('modal-delete-btn').onclick = async () => {
            if (confirm('本当に削除しますか？')) {
                const { error } = await supabase.from('creators').delete().eq('id', creator.id);
                if (!error) {
                    closeModal();
                    await loadCreators();
                    renderCreators();
                    alert('削除しました。');
                }
            }
        };

        document.getElementById('modal-edit-btn').onclick = () => {
            closeModal();
            prepareEdit(creator);
        };
    }

    // Clear and Embed
    embedContainer.innerHTML = '<div class="embed-skeleton">読み込み中...</div>';
    
    const embedHtml = getEmbedHtml(creator.portfolio);
    setTimeout(() => {
        embedContainer.innerHTML = embedHtml;
    }, 300);

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scroll
}

function prepareEdit(creator) {
    switchView('creator');
    inputName.value = creator.name;
    inputRole.value = creator.role;
    inputPrice.value = creator.price;
    document.getElementById('reg-portfolio').value = creator.portfolio;
    document.getElementById('reg-contact').value = creator.contact;
    inputGenre.value = creator.genre || '';
    inputBgColor.value = creator.style.bg;
    inputTextColor.value = creator.style.text;
    inputFont.value = creator.style.font;
    updatePreview();
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    embedContainer.innerHTML = '';
    document.body.style.overflow = '';
}

function getEmbedHtml(url) {
    if (!url) return '<div class="embed-skeleton">ポートフォリオURLが登録されていません。</div>';

    // YouTube
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    }

    // SoundCloud
    if (url.includes('soundcloud.com')) {
        return `<iframe scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff007b&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>`;
    }

    // NicoNico
    const nicoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?nicovideo\.jp\/watch\/(sm[0-9]+)/);
    if (nicoMatch) {
        return `<iframe src="https://embed.nicovideo.jp/watch/${nicoMatch[1]}" allowfullscreen></iframe>`;
    }

    // Default: Generic iframe
    return `<iframe src="${url}" title="Portfolio Preview" sandbox="allow-scripts allow-same-origin"></iframe>
            <div style="position: absolute; bottom: 10px; right: 10px; font-size: 10px; background: rgba(255,255,255,0.8); padding: 5px; border-radius: 4px;">
                表示されない場合は「サイトを直接開く」をお試しください
            </div>`;
}

// Helpers
function getCategoryName(code) {
    const names = {
        'MIX': 'MIX師',
        'Illustration': '絵師',
        'Video': '動画師',
        'Designer': 'デザイナー',
        'Other': 'その他'
    };
    return names[code] || code;
}

function getContrastColor(hex) {
    // Return a color that contrasts well with the hex background
    if (!hex.startsWith('#')) return '#ff007b';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#ff007b' : '#ff4d94'; // Magenta for contrast
}

// Start App
init();
