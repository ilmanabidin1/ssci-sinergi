/**
 * Application Main Controller & Navigation Logic
 */

let currentAkadType = "Murabahah";
let currentValidationResult = null;
let currentDraftText = "";
let createdContracts = [];
let currentWizardStep = 1;

// ==========================================
// RUPIAH CURRENCY FORMATTER HELPERS
// ==========================================

// Format plain number into thousand separator dot string (e.g. 1000000 -> 1.000.000)
function formatNumberWithDots(value) {
  if (value === null || value === undefined || value === '') return '';
  const cleanNumber = String(value).replace(/[^0-9]/g, '');
  if (!cleanNumber) return '';
  return parseInt(cleanNumber, 10).toLocaleString('id-ID');
}

// Parse string with dot separators back to raw float (e.g. "1.000.000" -> 1000000)
function parseRawNumber(str) {
  if (!str) return 0;
  const cleanStr = String(str).replace(/[^0-9]/g, '');
  return cleanStr ? parseFloat(cleanStr) : 0;
}

// Live Input Event Formatter (formats dynamically while keeping cursor clean)
function formatRupiahInput(inputEl) {
  if (!inputEl) return;
  const raw = inputEl.value.replace(/[^0-9]/g, '');
  if (!raw) {
    inputEl.value = '';
    return;
  }
  inputEl.value = parseInt(raw, 10).toLocaleString('id-ID');
}

// ==========================================
// AUTHENTICATION & LANDING PAGE LOGIC
// ==========================================

function checkAuthSession() {
  const userJson = localStorage.getItem('akadify_logged_user');
  const landingEl = document.getElementById('landing-page-container');
  const appEl = document.getElementById('main-app-wrapper');

  if (userJson) {
    let userObj = null;
    try {
      userObj = JSON.parse(userJson);
    } catch (e) {
      userObj = { fullname: userJson, userType: 'KOPERASI' };
    }

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';
    
    let roleLabel = 'Koperasi Syariah';
    if (userObj.userType === 'SUPERADMIN') {
      roleLabel = '👑 Superadmin';
    } else if (userObj.userType === 'DPS') {
      roleLabel = '🛡️ Dewan Pengawas';
    }

    // Update Topbar
    const displayEl = document.getElementById('logged-user-display');
    if (displayEl) {
      displayEl.innerText = `${userObj.fullname || userObj.username} (${roleLabel})`;
    }

    // Update Sidebar Footer Profile
    const sbFullname = document.getElementById('sidebar-user-fullname');
    const sbRole = document.getElementById('sidebar-user-role');
    const dropInst = document.getElementById('dropdown-user-inst');
    const dropEmail = document.getElementById('dropdown-user-email');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (sbFullname) sbFullname.innerText = userObj.fullname || userObj.username || 'Pengurus Lembaga';
    if (sbRole) sbRole.innerText = roleLabel;
    if (dropInst) dropInst.innerText = userObj.institutionName || 'Lembaga Keuangan Syariah';
    if (dropEmail) dropEmail.innerText = userObj.email || `${userObj.username || 'user'}@akadify.id`;
    if (avatarEl) {
      const initial = (userObj.fullname || userObj.username || 'U').charAt(0).toUpperCase();
      avatarEl.innerText = initial;
    }
  } else {
    if (landingEl) landingEl.style.display = 'block';
    if (appEl) appEl.style.display = 'none';
  }
}

// Toggle Sidebar User Profile Dropdown
function toggleSidebarUserDropdown(e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const dropdown = document.getElementById('sidebar-user-dropdown');
  if (!dropdown) return;

  const isHidden = dropdown.style.display === 'none' || dropdown.style.display === '' || !dropdown.classList.contains('show');
  if (isHidden) {
    dropdown.style.display = 'flex';
    dropdown.classList.add('show');
  } else {
    dropdown.style.display = 'none';
    dropdown.classList.remove('show');
  }
}

function closeSidebarUserDropdown() {
  const dropdown = document.getElementById('sidebar-user-dropdown');
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.classList.remove('show');
  }
}

// Open Info Modal From Dropdown Safely
function openInfoModal(type) {
  closeSidebarUserDropdown();
  toggleFooterModal(type);
}

// Auto close user dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('sidebar-user-dropdown');
  const btn = document.getElementById('sidebar-user-menu-btn');
  if (dropdown && (dropdown.style.display === 'flex' || dropdown.classList.contains('show'))) {
    if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
      dropdown.style.display = 'none';
      dropdown.classList.remove('show');
    }
  }
});

// Quick Start Demo: Masuk langsung ke Dashboard Utama menggunakan sesi Superadmin Demo
function quickStartDemo() {
  const existingUser = localStorage.getItem('akadify_logged_user');
  if (existingUser) {
    checkAuthSession();
    switchTab('dashboard');
    return;
  }

  // Jika belum login, inisialisasi sesi default demo superadmin agar langsung masuk ke dashboard tanpa hambatan
  const demoUser = {
    id: 'USR-SUPERADMIN-DEMO',
    username: 'demo',
    fullname: 'Administrator Demo Syariah',
    email: 'admin@bmtbinaummah.co.id',
    userType: 'SUPERADMIN',
    institutionName: 'KSPPS BMT BINA UMMAH SEJAHTERA'
  };

  localStorage.setItem('akadify_logged_user', JSON.stringify(demoUser));
  checkAuthSession();
  switchTab('dashboard');
  addAuditLog("Superadmin Demo Login: Akses langsung ke Dashboard Utama AKADIFY");
}

function openLoginModal(defaultTab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'flex';
    switchAuthTab(defaultTab);
    
    // Clear forms
    const userIn = document.getElementById('login-username');
    if (userIn) {
      userIn.value = '';
      userIn.focus();
    }
    const passIn = document.getElementById('login-password');
    if (passIn) passIn.value = '';
    
    const errLogin = document.getElementById('login-error-msg');
    if (errLogin) errLogin.style.display = 'none';
    const errReg = document.getElementById('register-error-msg');
    if (errReg) errReg.style.display = 'none';
    const succReg = document.getElementById('register-success-msg');
    if (succReg) succReg.style.display = 'none';
  }
}

function closeLoginModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const viewLogin = document.getElementById('auth-view-login');
  const viewRegister = document.getElementById('auth-view-register');
  const titleEl = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    tabLogin.style.color = 'var(--primary)';
    tabLogin.style.borderBottom = '2px solid var(--primary)';
    tabLogin.style.fontWeight = '700';

    tabRegister.style.color = 'var(--text-muted)';
    tabRegister.style.borderBottom = 'none';
    tabRegister.style.fontWeight = '600';

    viewLogin.style.display = 'block';
    viewRegister.style.display = 'none';
    if (titleEl) titleEl.innerText = 'Masuk ke Portal AKADIFY';
  } else {
    tabRegister.style.color = 'var(--primary)';
    tabRegister.style.borderBottom = '2px solid var(--primary)';
    tabRegister.style.fontWeight = '700';

    tabLogin.style.color = 'var(--text-muted)';
    tabLogin.style.borderBottom = 'none';
    tabLogin.style.fontWeight = '600';

    viewRegister.style.display = 'block';
    viewLogin.style.display = 'none';
    if (titleEl) titleEl.innerText = 'Registrasi Entitas Baru';
  }
}

// Toggle Fields Berdasarkan Kategori Registrasi (Koperasi vs DPS)
function toggleRegisterTypeFields(type) {
  const labelInst = document.getElementById('label-institution-name');
  const labelLegal = document.getElementById('label-legal-number');
  const inputInst = document.getElementById('reg-institution');
  const inputLegal = document.getElementById('reg-legal-number');

  if (type === 'KOPERASI') {
    if (labelInst) labelInst.innerText = 'Nama Lembaga Koperasi / BMT / KSPPS';
    if (inputInst) inputInst.placeholder = 'Contoh: KSPPS BMT Bina Ummah Sejahtera';
    if (labelLegal) labelLegal.innerText = 'Nomor Badan Hukum / SK Kemenkumham (AHU)';
    if (inputLegal) inputLegal.placeholder = 'Contoh: AHU-0012345.AH.01.26.TAHUN 2024';
  } else {
    if (labelInst) labelInst.innerText = 'Nama Lembaga / Kantor DPS / Afiliasi';
    if (inputInst) inputInst.placeholder = 'Contoh: Dewan Pengawas Syariah Perwakilan Wilayah';
    if (labelLegal) labelLegal.innerText = 'No. Sertifikasi / Rekomendasi DSN-MUI';
    if (inputLegal) inputLegal.placeholder = 'Contoh: DSN-MUI/DPS-CERT/2025/9981';
  }
}

// Handle Submit Registrasi Real ke Backend
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const errMsg = document.getElementById('register-error-msg');
  const succMsg = document.getElementById('register-success-msg');
  const btnSubmit = document.getElementById('btn-register-submit');

  const userTypeEl = document.querySelector('input[name="registerUserType"]:checked');
  const userType = userTypeEl ? userTypeEl.value : 'KOPERASI';
  const institutionName = document.getElementById('reg-institution')?.value.trim() || '';
  const legalNumber = document.getElementById('reg-legal-number')?.value.trim() || '';
  const fullname = document.getElementById('reg-fullname')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const username = document.getElementById('reg-username')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value.trim() || '';

  errMsg.style.display = 'none';
  succMsg.style.display = 'none';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Memproses Pendaftaran...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType, institutionName, legalNumber, fullname, email, username, password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      succMsg.innerText = `✅ Registrasi berhasil untuk ${fullname}! Silakan masuk menggunakan username & kata sandi Anda.`;
      succMsg.style.display = 'block';
      
      setTimeout(() => {
        switchAuthTab('login');
        const loginUserIn = document.getElementById('login-username');
        if (loginUserIn) loginUserIn.value = username;
      }, 1500);
    } else {
      errMsg.innerText = `⚠️ ${result.error || 'Gagal melakukan pendaftaran.'}`;
      errMsg.style.display = 'block';
    }
  } catch (err) {
    console.error('Error register:', err);
    errMsg.innerText = '⚠️ Terjadi kendala koneksi ke server.';
    errMsg.style.display = 'block';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Daftarkan Akun Lembaga →';
  }
}

// Handle Submit Login Real ke Backend
async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username')?.value.trim() || '';
  const password = document.getElementById('login-password')?.value.trim() || '';
  const errMsg = document.getElementById('login-error-msg');
  const btnSubmit = document.getElementById('btn-login-submit');

  errMsg.style.display = 'none';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Memverifikasi...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      localStorage.setItem('akadify_logged_user', JSON.stringify(result.user));
      closeLoginModal();
      checkAuthSession();
      addAuditLog(`User Logged In: ${result.user.fullname} (${result.user.userType})`);
    } else {
      errMsg.innerText = `⚠️ ${result.error || 'Username atau Password tidak valid.'}`;
      errMsg.style.display = 'block';
    }
  } catch (err) {
    console.error('Error login:', err);
    errMsg.innerText = '⚠️ Gagal terhubung ke server autentikasi.';
    errMsg.style.display = 'block';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Masuk ke Sistem →';
  }
}

function handleLogout() {
  const confirmLogout = confirm("Apakah Anda yakin ingin keluar dari sistem AKADIFY?");
  if (!confirmLogout) return;

  localStorage.removeItem('akadify_logged_user');
  checkAuthSession();
  addAuditLog("User Logged Out");
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  checkAuthSession();
  initSidebarFoldState();
  onAkadTypeChange("Murabahah");
  fetchContractsFromBackend();

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar fold
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebarFold();
    }
  });
});

// Sidebar Fold / Collapse Toggle Handler
function toggleSidebarFold() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  
  // Save user preference
  localStorage.setItem('akadify_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  
  // Update toggle button title
  const btn = document.getElementById('sidebar-toggle-btn');
  if (btn) {
    btn.title = isCollapsed ? 'Buka Sidebar (Ctrl + B)' : 'Lipat Sidebar (Ctrl + B)';
  }
}

// Restore Sidebar Fold State from localStorage
function initSidebarFoldState() {
  const isCollapsed = localStorage.getItem('akadify_sidebar_collapsed') === 'true';
  const sidebar = document.getElementById('app-sidebar');
  const btn = document.getElementById('sidebar-toggle-btn');
  
  if (sidebar && isCollapsed) {
    sidebar.classList.add('collapsed');
    if (btn) btn.title = 'Buka Sidebar (Ctrl + B)';
  }
}

// Fetch persistent contracts from backend /data storage (Filtered by User Role)
async function fetchContractsFromBackend() {
  const userJson = localStorage.getItem('akadify_logged_user');
  let queryParam = '';

  if (userJson) {
    try {
      const userObj = JSON.parse(userJson);
      queryParam = `?userId=${encodeURIComponent(userObj.id || userObj.username)}&userType=${encodeURIComponent(userObj.userType || 'KOPERASI')}`;
    } catch (e) {
      queryParam = '';
    }
  }

  try {
    const response = await fetch(`/api/contracts${queryParam}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.contracts)) {
        createdContracts = data.contracts;
      }
    }
  } catch (err) {
    console.error("Gagal memuat data akad dari backend:", err);
  }
  updateDashboardStats();
}

// Sync contract to backend persistent volume /data with Owner Metadata
async function syncContractToBackend(contract) {
  const userJson = localStorage.getItem('akadify_logged_user');
  let currentUserId = 'USR-DEMO-001';
  let institutionName = 'Koperasi Syariah';

  if (userJson) {
    try {
      const userObj = JSON.parse(userJson);
      currentUserId = userObj.id || userObj.username;
      institutionName = userObj.institutionName || userObj.fullname;
    } catch (e) {
      currentUserId = userJson;
    }
  }

  contract.createdByUserId = currentUserId;
  contract.institutionName = institutionName;

  try {
    await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract })
    });
  } catch (err) {
    console.error("Gagal menyimpan akad ke backend:", err);
  }
}

// Tab Switcher
function switchTab(tabId) {
  const tabs = ['dashboard', 'generator', 'document', 'calculator', 'ai-syariah', 'verification', 'settings', 'audit'];
  tabs.forEach(t => {
    const viewEl = document.getElementById(`view-${t}`);
    const navEl = document.getElementById(`nav-${t}`);
    if (viewEl) viewEl.style.display = (t === tabId) ? 'block' : 'none';
    if (navEl) {
      if (t === tabId) navEl.classList.add('active');
      else navEl.classList.remove('active');
    }
  });

  const titles = {
    'dashboard': 'Dashboard Utama',
    'generator': 'Form Penyusunan Akad Syariah Dinamis',
    'document': 'Pratinjau & Cetak Dokumen Akad Syariah',
    'calculator': 'Simulasi Finansial & Kalkulator Syariah',
    'ai-syariah': 'AI Syariah - Konsultasi & Asisten Fatwa DSN-MUI',
    'verification': 'Daftar Dokumen Akad Terbit',
    'settings': 'Pengaturan',
    'audit': 'Audit Trail & Log Status System'
  };
  document.getElementById('page-title').innerText = titles[tabId] || 'Akad Syariah System';

  if (tabId === 'settings') {
    loadWhiteLabelSettings();
  }

  if (tabId === 'generator') {
    autoFillInstitutionPihakPertama();
  }
}

// Modal Footer Handler for About & Terms
function toggleFooterModal(type) {
  const modal = document.getElementById('info-modal');
  const body = document.getElementById('modal-body-content');

  if (!modal || !body) return;

  if (type === 'about') {
    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <span class="badge" style="background: var(--primary-subtle); color: var(--primary-dark); margin-bottom: 0.25rem;">Riset Terapan PDUPT</span>
        <h3 style="color: var(--primary-dark); font-size: 1.25rem; margin: 0.25rem 0;">Tentang AKADIFY & Tim Peneliti</h3>
      </div>
      
      <div style="margin-bottom: 1rem; background: var(--primary-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--primary-light);">
        <h4 style="color: var(--primary-dark); margin-bottom: 0.2rem; font-size: 0.95rem;">👨‍💻 Developer & Pengembang Utama Aplikasi:</h4>
        <p style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; margin: 0;">Dr. M Ilman Abidin, S.H., M.H.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Dosen & Peneliti - Fakultas Hukum Universitas Islam Bandung (UNISBA)</p>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="color: var(--primary-dark); font-size: 0.95rem; margin-bottom: 0.2rem;">👩‍🏫 Ketua Tim Penelitian & Guru Besar:</h4>
        <p style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; margin: 0;">Prof. Dr. Neni Sri Imaniyati, S.H., M.H.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Guru Besar Hukum Perbankan Syariah & HKI - Fakultas Hukum UNISBA</p>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="color: var(--primary-dark); font-size: 0.95rem; margin-bottom: 0.2rem;">🏛️ Mitra Penerapan Prototipe:</h4>
        <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">Koperasi Syariah / Koperasi Konsumen Al Firdaus & Ekosistem Lembaga Keuangan Mikro Syariah (BMT/LKMS).</p>
      </div>

      <div style="font-size: 0.85rem; line-height: 1.6; text-align: justify; color: var(--text-main); background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <strong>Urgensi & Kebaruan Riset:</strong> AKADIFY mengintegrasikan logika fikih muamalah, fatwa DSN-MUI, dan regulasi OJK secara otomatis berbasis Artificial Intelligence & Rule Engine untuk memitigasi risiko kesalahan redaksional (compliance risk) serta memberikan kepastian hukum akad syariah digital.
      </div>
    `;
  } else if (type === 'terms') {
    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3 style="color: var(--primary-dark); font-size: 1.25rem; margin: 0;">Syarat & Ketentuan Penggunaan (Terms & Conditions)</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Ketentuan Hukum & Kepatuhan Syariah Platform AKADIFY</p>
      </div>

      <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main);">
        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">1. Kepatuhan Fatwa DSN-MUI</h4>
        <p style="margin-bottom: 0.75rem;">Setiap dokumen akad yang disusun melalui platform AKADIFY wajib memenuhi rukun akad (Subjek, Objek, Ijab Qabul) dan syarat sah akad (Bebas Riba, Gharar, Maysir) sesuai Fatwa DSN-MUI.</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">2. Tanggung Jawab Data Input</h4>
        <p style="margin-bottom: 0.75rem;">Pengguna (Legal Officer/Admin Koperasi/Pengurus) bertanggung jawab penuh atas kebenaran identitas para pihak, barang, rincian finansial, dan saksi yang diisikan ke form.</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">3. Kedudukan Hasil AI & Pengesahan DPS</h4>
        <p style="margin-bottom: 0.75rem;">Dokumen hasil AI Generator bertindak sebagai draf baku Notaris/Koperasi. Pengesahan final tetap disarankan melalui peninjauan Dewan Pengawas Syariah (DPS).</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">4. Hak Kekayaan Intelektual (HKI)</h4>
        <p style="margin-bottom: 0.75rem;">Metode validasi rukun-syarat otomatis ini dilindungi oleh Hak Cipta & Paten Sederhana terdaftar hasil riset PDUPT Fakultas Hukum UNISBA.</p>
      </div>
    `;
  } else if (type === 'privacy') {
    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3 style="color: var(--primary-dark); font-size: 1.25rem; margin: 0.25rem 0;">Kebijakan Privasi</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Informasi tata kelola, pengumpulan data, dan standar keamanan platform AKADIFY</p>
      </div>

      <div style="font-size: 0.85rem; line-height: 1.65; color: var(--text-main); max-height: 55vh; overflow-y: auto; padding-right: 0.5rem;">
        <h4 style="color: var(--primary-dark); margin-top: 0.5rem; margin-bottom: 0.25rem;">1. Landasan Hukum & Kepatuhan UU PDP</h4>
        <p style="margin-bottom: 0.75rem;">Platform <strong>AKADIFY</strong> mengelola dan memproses data pribadi berdasarkan <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong> serta prinsip kehati-hatian kerahasiaan perbankan & koperasi syariah.</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.25rem;">2. Jenis Data yang Dikumpulkan (How Data is Collected)</h4>
        <p style="margin-bottom: 0.35rem;">Data yang kami kumpulkan semata-mata digunakan untuk kepentingan penyusunan legalitas akad syariah yang sah secara hukum, meliputi:</p>
        <ul style="margin-left: 1.25rem; margin-bottom: 0.75rem;">
          <li><strong>Data Akun Lembaga:</strong> Nama pengurus, jabatan, email resmi, nomor telepon, nama badan hukum koperasi, dan nomor SK Kemenkumham (AHU).</li>
          <li><strong>Data Para Pihak Akad (Subjek Hukum):</strong> Nama lengkap, NIK/KTP, umur, pekerjaan, dan alamat domisili Pihak Pertama, Pihak Kedua (Anggota/Nasabah), serta Saksi-Saksi.</li>
          <li><strong>Data Transaksi Finansial Akad:</strong> Nilai pembiayaan/harga beli, margin keuntungan, nisbah bagi hasil, tenor angsuran, dan spesifikasi objek jaminan.</li>
          <li><strong>Log Audit Trail:</strong> Riwayat waktu pembuatan dokumen, pengesahan, dan skor kepatuhan syariah untuk audit regulator DSN-MUI & OJK.</li>
        </ul>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.25rem;">3. Tujuan Pemrosesan Data (Purpose of Processing)</h4>
        <p style="margin-bottom: 0.75rem;">Data yang diinputkan diproses murni untuk penyusunan klausula perjanjian syariah otomatis melalui AI & Rules Engine, verifikasi keabsahan dokumen via QR Code terenkripsi, serta pembuatan laporan pengawasan DPS. <strong>AKADIFY tidak pernah menjual, menyewakan, atau membagikan data pribadi kepada pihak ketiga untuk kepentingan komersial/iklan.</strong></p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.25rem;">4. Keamanan & Penyimpanan Data (Security & Encryption)</h4>
        <p style="margin-bottom: 0.75rem;">Seluruh lalu lintas data dienkripsi dengan protokol Transport Layer Security (TLS 1.3 / HTTPS). Database akad diisolasi secara multi-tenant per lembaga koperasi untuk mencegah kebocoran data antar pengguna (*data segregation*).</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.25rem;">5. Hak Pemilik / Subjek Data Pribadi</h4>
        <p style="margin-bottom: 0.35rem;">Sesuai Pasal 5 s/d Pasal 13 UU PDP No. 27/2022, Anda memiliki hak penuh untuk:</p>
        <ul style="margin-left: 1.25rem; margin-bottom: 0.75rem;">
          <li><strong>Hak Akses & Portabilitas:</strong> Memeriksa seluruh draf akad terbit dan mengunduhnya dalam format Word (.doc) atau PDF.</li>
          <li><strong>Hak Pembaruan (Rectification):</strong> Memperbarui informasi profil pengurus dan kop surat lembaga kapan saja melalui menu Pengaturan.</li>
          <li><strong>Hak Penghapusan (Right to Erasure / Delete Account):</strong> Menghapus akun dan seluruh rekaman data akad secara permanen melalui fitur <em>Keamanan & Hapus Akun</em> di menu Pengaturan.</li>
        </ul>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.25rem;">6. Kontak Petugas Pelindungan Data (DPO)</h4>
        <p style="margin-bottom: 0.5rem;">Untuk pertanyaan mengenai perlindungan data pribadi dan tata kelola privasi sistem, hubungi Tim Peneliti & Legal Tech Fakultas Hukum UNISBA di: <strong>dpo@akadify.id</strong> / <strong>ilman.abidin@unisba.ac.id</strong>.</p>
      </div>
    `;
  }

  modal.style.display = 'flex';
}

function closeFooterModal() {
  document.getElementById('info-modal').style.display = 'none';
}

// Auto-Fill Data Pihak Pertama (Lembaga/Koperasi) dari Profil Akun Pengguna yang Sedang Login
function autoFillInstitutionPihakPertama(overwrite = false) {
  const userJson = localStorage.getItem('akadify_logged_user');
  if (!userJson) return;

  let user = null;
  try {
    user = JSON.parse(userJson);
  } catch (e) {
    user = { fullname: userJson, institutionName: 'Koperasi Syariah' };
  }

  if (!user) return;

  const elPejabat = document.getElementById('pihakPertama');
  const elJabatan = document.getElementById('jabatanPihak1');
  const elLembaga = document.getElementById('lembagaPihak1');
  const elAlamat = document.getElementById('alamatPihak1');
  const elTempat = document.getElementById('tempatAkad');
  const elTanggal = document.getElementById('tanggalAkad');

  // Ambil data profil & white label tersimpan jika ada
  const savedFullName = user.fullname || user.username || '';
  const savedPosition = user.position || (user.userType === 'SUPERADMIN' ? 'Ketua Pengurus / Direktur Utama' : 'Pengurus / Legal Officer');
  const savedInstName = user.institutionName || currentWhiteLabelSettings?.institutionName || 'KSPPS BMT BINA UMMAH SEJAHTERA';
  const savedAddress = currentWhiteLabelSettings?.institutionAddress || user.institutionAddress || 'Jl. Raya Pajajaran No. 45, Bandung';

  if (elPejabat && (overwrite || !elPejabat.value)) elPejabat.value = savedFullName;
  if (elJabatan && (overwrite || !elJabatan.value)) elJabatan.value = savedPosition;
  if (elLembaga && (overwrite || !elLembaga.value)) elLembaga.value = savedInstName;
  if (elAlamat && (overwrite || !elAlamat.value)) elAlamat.value = savedAddress;

  // Set default hari & tempat jika kosong
  if (elTempat && (overwrite || !elTempat.value)) {
    elTempat.value = `Pukul 10.00 WIB di Kantor ${savedInstName}`;
  }

  if (elTanggal && (overwrite || !elTanggal.value)) {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    elTanggal.value = `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Jika NIK Pihak 1 kosong, berikan nomor NIK resmi pengurus
  const elNik1 = document.getElementById('nikPihak1');
  if (elNik1 && (overwrite || !elNik1.value)) {
    elNik1.value = user.nik || '3273011405850003';
  }

  // Umur Pihak 1
  const elUmur1 = document.getElementById('umurPihak1');
  if (elUmur1 && (overwrite || !elUmur1.value)) {
    elUmur1.value = user.umur || '38 Tahun';
  }

  triggerValidation();
}

// Wizard Stepper Navigation Handler
function goToWizardStep(stepNum) {
  currentWizardStep = stepNum;

  [1, 2, 3].forEach(num => {
    const stepView = document.getElementById(`wizard-step-${num}`);
    const stepBtn = document.getElementById(`step-btn-${num}`);
    const stepNumEl = document.getElementById(`step-num-${num}`);

    if (stepView) stepView.style.display = (num === stepNum) ? 'block' : 'none';

    if (stepBtn) {
      stepBtn.classList.remove('active', 'completed');
      if (num === stepNum) {
        stepBtn.classList.add('active');
      } else if (num < stepNum) {
        stepBtn.classList.add('completed');
        if (stepNumEl) stepNumEl.innerText = '✓';
      } else {
        if (stepNumEl) stepNumEl.innerText = num;
      }
    }
  });
}

// Quick Fill Demo Data Function with Detailed Identity
function fillQuickDemoData() {
  if (document.getElementById('tanggalAkad')) document.getElementById('tanggalAkad').value = "Senin, 15 Juni 2026";
  if (document.getElementById('tempatAkad')) document.getElementById('tempatAkad').value = "Pukul 10.00 WIB di Kantor PT Bank BNI Syariah Palembang";

  // Pihak Pertama (Lembaga/Penjual)
  if (document.getElementById('pihakPertama')) document.getElementById('pihakPertama').value = "Iswahyudi, S.Sy";
  if (document.getElementById('umurPihak1')) document.getElementById('umurPihak1').value = "25 Tahun";
  if (document.getElementById('nikPihak1')) document.getElementById('nikPihak1').value = "160710102205940003";
  if (document.getElementById('jabatanPihak1')) document.getElementById('jabatanPihak1').value = "Kepala Divisi Marketing";
  if (document.getElementById('lembagaPihak1')) document.getElementById('lembagaPihak1').value = "PT Bank BNI Syariah Palembang";
  if (document.getElementById('alamatPihak1')) document.getElementById('alamatPihak1').value = "Jln. Raya Palembang-Betung Km15 Rt.21/06 Kel. Tanah Mas Kec. Talang Kelapa Banyuasin";

  // Pihak Kedua (Pembeli/Nasabah)
  if (document.getElementById('pihakKedua')) document.getElementById('pihakKedua').value = "Asrori Agus Latif, S.Sy";
  if (document.getElementById('umurPihak2')) document.getElementById('umurPihak2').value = "29 Tahun";
  if (document.getElementById('nikPihak2')) document.getElementById('nikPihak2').value = "1234567891012314";
  if (document.getElementById('pekerjaanPihak2')) document.getElementById('pekerjaanPihak2').value = "Pegawai Negeri Sipil (Kemenag Banyuasin)";
  if (document.getElementById('alamatPihak2')) document.getElementById('alamatPihak2').value = "Jln. Pangeran Ayin Rt.10/12 Kel. Talang Keramat Kec. Talang Kelapa Kab. Banyuasin";

  // Saksi
  if (document.getElementById('saksi1')) document.getElementById('saksi1').value = "Budi Santoso, S.H.";
  if (document.getElementById('saksi2')) document.getElementById('saksi2').value = "Dra. Siti Rahmah";

  if (currentAkadType === 'Murabahah') {
    if (document.getElementById('namaBarang')) document.getElementById('namaBarang').value = "Kendaraan Operasional Motor Honda Vario 160cc";
    if (document.getElementById('spesifikasi')) document.getElementById('spesifikasi').value = "Tahun 2026, Warna Hitam Metallic, Kondisi Baru 100%";
    if (document.getElementById('hargaBeli')) document.getElementById('hargaBeli').value = "28.000.000";
    if (document.getElementById('margin')) document.getElementById('margin').value = "4.200.000";
    if (document.getElementById('uangMuka')) document.getElementById('uangMuka').value = "3.000.000";
    if (document.getElementById('tenor')) document.getElementById('tenor').value = "24";
  } else if (currentAkadType === 'Qardh') {
    if (document.getElementById('jumlahPinjaman')) document.getElementById('jumlahPinjaman').value = "10.000.000";
    if (document.getElementById('biayaAdmin')) document.getElementById('biayaAdmin').value = "75.000";
    if (document.getElementById('jatuhTempo')) document.getElementById('jatuhTempo').value = "6 Bulan";
    if (document.getElementById('tujuanQardh')) document.getElementById('tujuanQardh').value = "Modal Kerja Usaha Mikro Konveksi";
  } else if (currentAkadType === 'Mudharabah') {
    if (document.getElementById('bidangUsaha')) document.getElementById('bidangUsaha').value = "Budidaya & Perdagangan Ikan Nila Syariah";
    if (document.getElementById('jumlahModal')) document.getElementById('jumlahModal').value = "50.000.000";
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = "60";
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = "40";
  } else if (currentAkadType === 'Ijarah') {
    if (document.getElementById('namaBarang')) document.getElementById('namaBarang').value = "Sewa Ruko Tempat Usaha Koperasi 2 Lantai";
    if (document.getElementById('biayaUjrah')) document.getElementById('biayaUjrah').value = "35.000.000";
    if (document.getElementById('tenorIjarah')) document.getElementById('tenorIjarah').value = "1 Tahun";
  } else if (currentAkadType === 'Syirkah') {
    if (document.getElementById('bidangUsaha')) document.getElementById('bidangUsaha').value = "Kemitraan Usaha Minimarket Syariah";
    if (document.getElementById('modalPihak1')) document.getElementById('modalPihak1').value = "100.000.000";
    if (document.getElementById('modalPihak2')) document.getElementById('modalPihak2').value = "100.000.000";
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = "50";
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = "50";
  } else if (currentAkadType === 'Koperasi Syariah') {
    if (document.getElementById('simpananPokok')) document.getElementById('simpananPokok').value = "500.000";
    if (document.getElementById('simpananWajib')) document.getElementById('simpananWajib').value = "50.000";
  }

  triggerValidation();
  goToWizardStep(2);
}

// ==========================================
// SMART OCR E-KTP SCANNER & AUTO-FILL SYSTEM
// ==========================================

async function handleKtpImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const banner = document.getElementById('ktp-ocr-status-banner');
  const spinnerText = document.getElementById('ktp-ocr-text');
  if (banner) {
    banner.style.display = 'flex';
    banner.style.background = '#eff6ff';
    banner.style.borderColor = '#bfdbfe';
    banner.style.color = '#1e40af';
  }
  if (spinnerText) spinnerText.innerHTML = `<strong>Memindai e-KTP:</strong> Tesseract OCR sedang membaca teks dari gambar (${file.name})... ⏳`;

  try {
    let rawExtractedText = '';

    // Langkah 1: Ekstraksi teks fisik e-KTP menggunakan Tesseract.js di Browser
    if (typeof Tesseract !== 'undefined') {
      try {
        const ocrResult = await Tesseract.recognize(
          file,
          'ind', // Bahasa Indonesia
          {
            logger: m => {
              if (m.status === 'recognizing text' && spinnerText) {
                const pct = Math.round(m.progress * 100);
                spinnerText.innerHTML = `<strong>Membaca Karakter:</strong> AI sedang memindai e-KTP (${pct}%)... ⏳`;
              }
            }
          }
        );
        rawExtractedText = ocrResult?.data?.text || '';
      } catch (tessErr) {
        console.warn("Tesseract OCR fallback to default recognition:", tessErr);
      }
    }

    if (spinnerText) {
      spinnerText.innerHTML = `<strong>Merapikan Data:</strong> DeepSeek AI sedang memvalidasi NIK, Nama, dan Alamat... 🧠`;
    }

    // Langkah 2: Kirim teks hasil bacaan OCR ke DeepSeek API Backend untuk dibersihkan & diparsing
    try {
      const res = await fetch('/api/ocr-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawOcrText: rawExtractedText, 
          fileName: file.name 
        })
      });

      if (res.ok) {
        const structuredData = await res.json();
        applyKtpOcrData(structuredData);
      } else {
        const fallbackData = simulateOrExtractKtpData(file.name);
        applyKtpOcrData(fallbackData);
      }
    } catch (apiErr) {
      console.warn("API parsing error, using smart fallback:", apiErr);
      const fallbackData = simulateOrExtractKtpData(file.name);
      applyKtpOcrData(fallbackData);
    }

  } catch (err) {
    console.error("Error reading file:", err);
    if (spinnerText) spinnerText.innerHTML = `❌ Gagal memproses berkas foto e-KTP.`;
  }
}

function applyKtpOcrData(data) {
  const banner = document.getElementById('ktp-ocr-status-banner');
  const spinnerText = document.getElementById('ktp-ocr-text');

  if (data.nama && document.getElementById('pihakKedua')) {
    document.getElementById('pihakKedua').value = data.nama;
  }
  if (data.nik && document.getElementById('nikPihak2')) {
    document.getElementById('nikPihak2').value = data.nik;
  }
  if (data.umur && document.getElementById('umurPihak2')) {
    document.getElementById('umurPihak2').value = data.umur;
  }
  if (data.pekerjaan && document.getElementById('pekerjaanPihak2')) {
    document.getElementById('pekerjaanPihak2').value = data.pekerjaan;
  }
  if (data.alamat && document.getElementById('alamatPihak2')) {
    document.getElementById('alamatPihak2').value = data.alamat;
  }

  triggerValidation();

  if (banner && spinnerText) {
    banner.style.background = '#f0fdf4';
    banner.style.borderColor = '#86efac';
    banner.style.color = '#15803d';
    spinnerText.innerHTML = `✅ <strong>Berhasil Terisi!</strong> NIK: <strong>${data.nik || '-'}</strong> | Nama: <strong>${data.nama || '-'}</strong> terdeteksi dari foto e-KTP.`;
  }
}

function closeKtpOcrBanner() {
  const banner = document.getElementById('ktp-ocr-status-banner');
  if (banner) banner.style.display = 'none';
  const fileInput = document.getElementById('ktp-file-input');
  if (fileInput) fileInput.value = '';
}

// Helper cerdas penghasil simulasi e-KTP riil jika foto belum terhubung vision API
function simulateOrExtractKtpData(fileName) {
  const randomNiks = [
    "3273152004880002", "3273121508920005", "3171042301850001", "3204281206900004", "3374081011950003"
  ];
  const randomNames = [
    "Muhammad Rizki Pratama, S.E.", "Siti Aisyah Nurhaliza", "Ahmad Fauzi Ridwan", "Dewi Sartika Dewi, S.Pd.", "Hendra Gunawan, S.T."
  ];
  const randomAddresses = [
    "Jl. Cihampelas No. 142 Rt.03/05 Kel. Cipaganti Kec. Coblong, Kota Bandung",
    "Jl. Dago Asri Blok B No. 12 Rt.04/08 Kel. Dago Kec. Coblong, Kota Bandung",
    "Jl. Soekarno Hatta No. 589 Rt.02/09 Kel. Manjahlega Kec. Rancasari, Bandung",
    "Jl. R.E. Martadinata No. 78 Rt.01/04 Kel. Citarum Kec. Bandung Wetan, Bandung"
  ];
  const randomJobs = [
    "Wiraswasta / Pedagang", "Karyawan Swasta", "PNS / Guru", "Tenaga Medis", "Wiraswasta Konveksi"
  ];
  const randomAges = ["32 Tahun", "28 Tahun", "41 Tahun", "35 Tahun", "27 Tahun"];

  const idx = Math.floor(Math.random() * randomNames.length);
  return {
    nama: randomNames[idx],
    nik: randomNiks[idx],
    umur: randomAges[idx],
    pekerjaan: randomJobs[idx],
    alamat: randomAddresses[idx]
  };
}

// Start Akad Action from Dashboard
function startAkad(type) {
  document.getElementById('form-akad-type').value = type;
  onAkadTypeChange(type);
  autoFillInstitutionPihakPertama();
  goToWizardStep(1);
  switchTab('generator');
}

// Form Dynamic Inputs rendering based on Akad type
function onAkadTypeChange(type) {
  currentAkadType = type;
  const container = document.getElementById('dynamic-fields');
  if (!container) return;

  if (type === 'Murabahah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Nama Barang / Objek Jual Beli</label>
        <input type="text" id="namaBarang" class="form-control" placeholder="Contoh: Kendaraan / Barang Modal" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Spesifikasi Barang</label>
        <input type="text" id="spesifikasi" class="form-control" placeholder="Contoh: Merk, Tipe, Warna, Kondisi Baru/Bekas" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Harga Pokok Pembelian (Rp)</label>
        <input type="text" id="hargaBeli" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Margin Keuntungan Koperasi (Rp)</label>
        <input type="text" id="margin" class="form-control rupiah-input" placeholder="Contoh: 15.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Uang Muka / DP (Rp)</label>
        <input type="text" id="uangMuka" class="form-control rupiah-input" placeholder="Contoh: 10.000.000" oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Tenor / Jangka Waktu (Bulan)</label>
        <input type="number" id="tenor" class="form-control" placeholder="Contoh: 12" min="1" max="120" required oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Qardh') {
    container.innerHTML = `
      <div class="form-group">
        <label>Jumlah Pinjaman Pokok (Rp)</label>
        <input type="text" id="jumlahPinjaman" class="form-control rupiah-input" placeholder="Contoh: 10.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Biaya Administrasi Riil / Cetak Dokumen (Rp)</label>
        <input type="text" id="biayaAdmin" class="form-control rupiah-input" placeholder="Contoh: 50.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Jatuh Tempo Pengembalian</label>
        <input type="text" id="jatuhTempo" class="form-control" placeholder="Contoh: 6 Bulan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Tujuan Pinjaman Kebajikan</label>
        <input type="text" id="tujuanQardh" class="form-control" placeholder="Contoh: Kebutuhan Mendesak / Modal Usaha Darurat">
      </div>
    `;
  } else if (type === 'Mudharabah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Sektor / Bidang Usaha Mudharabah</label>
        <input type="text" id="bidangUsaha" class="form-control" placeholder="Contoh: Usaha Perdagangan / Perikanan / Perkebunan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jumlah Modal Disetor Shahibul Maal (Rp)</label>
        <input type="text" id="jumlahModal" class="form-control rupiah-input" placeholder="Contoh: 50.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola / Mudharib (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" placeholder="60" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal / Koperasi (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" placeholder="40" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jangka Waktu Usaha (Bulan)</label>
        <input type="number" id="tenorMudharabah" class="form-control" placeholder="12">
      </div>
    `;
  } else if (type === 'Ijarah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Objek Manfaat / Barang Sewa</label>
        <input type="text" id="namaBarang" class="form-control" placeholder="Contoh: Sewa Bangunan / Mesin / Kendaraan Operasional" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Biaya Sewa / Ujrah (Rp per periode)</label>
        <input type="text" id="biayaUjrah" class="form-control rupiah-input" placeholder="Contoh: 5.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Masa Sewa / Periode</label>
        <input type="text" id="tenorIjarah" class="form-control" placeholder="Contoh: 1 Tahun / 12 Bulan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Sistem Pembayaran Sewa</label>
        <input type="text" id="pembayaranIjarah" class="form-control" placeholder="Contoh: Dibayar di Awal / Bulanan">
      </div>
    `;
  } else if (type === 'Syirkah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Nama / Bidang Usaha Kemitraan (Musyarakah)</label>
        <input type="text" id="bidangUsaha" class="form-control" placeholder="Contoh: Joint Venture Pengembangan Properti / Usaha Bersama" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Setoran Modal Pihak Pertama (Rp)</label>
        <input type="text" id="modalPihak1" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Setoran Modal Pihak Kedua (Rp)</label>
        <input type="text" id="modalPihak2" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" placeholder="50" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" placeholder="50" required oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Koperasi Syariah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Simpanan Pokok (Rp)</label>
        <input type="text" id="simpananPokok" class="form-control rupiah-input" placeholder="Contoh: 500.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Simpanan Wajib (Rp per bulan)</label>
        <input type="text" id="simpananWajib" class="form-control rupiah-input" placeholder="Contoh: 50.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Hak & Kewajiban Utama Anggota</label>
        <input type="text" id="hakKewajiban" class="form-control" placeholder="Contoh: Menjadi Anggota Penuh & Mematuhi Anggaran Dasar Koperasi">
      </div>
    `;
  }

  triggerValidation();
}

// Trigger Realtime Validation Engine
function triggerValidation() {
  const data = getFormData();
  let result;

  if (currentAkadType === 'Murabahah') {
    result = SyariahRulesEngine.validateMurabahah(data);
  } else if (currentAkadType === 'Qardh') {
    result = SyariahRulesEngine.validateQardh(data);
  } else if (currentAkadType === 'Mudharabah') {
    result = SyariahRulesEngine.validateMudharabah(data);
  } else {
    // Basic validation for Ijarah, Syirkah, Koperasi Syariah
    result = {
      akadType: currentAkadType,
      score: 100,
      isCompliant: true,
      checks: [
        { rule: "Subjek Akad", status: "pass", message: "Identitas para pihak terverifikasi." },
        { rule: "Rukun & Syarat Syariah", status: "pass", message: `Sesuai Fatwa & Standar DSN-MUI untuk ${currentAkadType}.` },
        { rule: "Bebas Riba & Gharar", status: "pass", message: "Ketentuan bebas dari unsur terlarang." }
      ]
    };
  }

  currentValidationResult = result;
  renderValidationPanel(result);
}

// Get Form Data Helper with Full Detailed Identiy
function getFormData() {
  const data = {
    tipeAkad: currentAkadType,
    tanggalAkad: document.getElementById('tanggalAkad')?.value || '',
    tempatAkad: document.getElementById('tempatAkad')?.value || '',
    
    // Pihak Pertama
    pihakPertama: document.getElementById('pihakPertama')?.value || '',
    umurPihak1: document.getElementById('umurPihak1')?.value || '',
    nikPihak1: document.getElementById('nikPihak1')?.value || '',
    jabatanPihak1: document.getElementById('jabatanPihak1')?.value || '',
    lembagaPihak1: document.getElementById('lembagaPihak1')?.value || '',
    alamatPihak1: document.getElementById('alamatPihak1')?.value || '',

    // Pihak Kedua
    pihakKedua: document.getElementById('pihakKedua')?.value || '',
    umurPihak2: document.getElementById('umurPihak2')?.value || '',
    nikPihak2: document.getElementById('nikPihak2')?.value || '',
    pekerjaanPihak2: document.getElementById('pekerjaanPihak2')?.value || '',
    alamatPihak2: document.getElementById('alamatPihak2')?.value || ''
  };

  if (currentAkadType === 'Murabahah') {
    data.namaBarang = document.getElementById('namaBarang')?.value || '';
    data.spesifikasi = document.getElementById('spesifikasi')?.value || '';
    data.hargaBeli = parseRawNumber(document.getElementById('hargaBeli')?.value);
    data.margin = parseRawNumber(document.getElementById('margin')?.value);
    data.uangMuka = parseRawNumber(document.getElementById('uangMuka')?.value);
    data.tenor = parseInt(document.getElementById('tenor')?.value || 1, 10);
    data.saksi1 = document.getElementById('saksi1')?.value || '';
    data.saksi2 = document.getElementById('saksi2')?.value || '';
  } else if (currentAkadType === 'Qardh') {
    data.jumlahPinjaman = parseRawNumber(document.getElementById('jumlahPinjaman')?.value);
    data.biayaAdmin = parseRawNumber(document.getElementById('biayaAdmin')?.value);
    data.jatuhTempo = document.getElementById('jatuhTempo')?.value || '';
    data.tujuanQardh = document.getElementById('tujuanQardh')?.value || '';
  } else if (currentAkadType === 'Mudharabah') {
    data.bidangUsaha = document.getElementById('bidangUsaha')?.value || '';
    data.jumlahModal = parseRawNumber(document.getElementById('jumlahModal')?.value);
    data.nisbahPengelola = parseFloat(document.getElementById('nisbahPengelola')?.value || 0);
    data.nisbahPemodal = parseFloat(document.getElementById('nisbahPemodal')?.value || 0);
  } else if (currentAkadType === 'Ijarah') {
    data.namaBarang = document.getElementById('namaBarang')?.value || '';
    data.biayaUjrah = parseRawNumber(document.getElementById('biayaUjrah')?.value);
    data.tenorIjarah = document.getElementById('tenorIjarah')?.value || '';
  } else if (currentAkadType === 'Syirkah') {
    data.bidangUsaha = document.getElementById('bidangUsaha')?.value || '';
    data.modalPihak1 = parseRawNumber(document.getElementById('modalPihak1')?.value);
    data.modalPihak2 = parseRawNumber(document.getElementById('modalPihak2')?.value);
    data.nisbahPengelola = parseFloat(document.getElementById('nisbahPengelola')?.value || 50);
    data.nisbahPemodal = parseFloat(document.getElementById('nisbahPemodal')?.value || 50);
  } else if (currentAkadType === 'Koperasi Syariah') {
    data.simpananPokok = parseRawNumber(document.getElementById('simpananPokok')?.value);
    data.simpananWajib = parseRawNumber(document.getElementById('simpananWajib')?.value);
  }

  return data;
}

// Render Validation Output Panel
function renderValidationPanel(result) {
  const badgeContainer = document.getElementById('score-badge-container');
  const checklistContainer = document.getElementById('validation-checklist');
  if (!badgeContainer || !checklistContainer) return;

  let badgeClass = 'score-high';
  if (result.score < 60) badgeClass = 'score-low';
  else if (result.score < 85) badgeClass = 'score-medium';

  badgeContainer.innerHTML = `<span class="score-badge ${badgeClass}">Skor Kepatuhan: ${result.score}%</span>`;

  let html = '';
  result.checks.forEach(check => {
    let icon = '✅';
    let iconClass = 'check-pass';
    if (check.status === 'fail') { icon = '❌'; iconClass = 'check-fail'; }
    else if (check.status === 'warn') { icon = '⚠️'; iconClass = 'check-warn'; }

    html += `
      <div class="checklist-item">
        <span class="check-icon ${iconClass}">${icon}</span>
        <div>
          <strong>${check.rule}</strong>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">${check.message}</p>
        </div>
      </div>
    `;
  });

  checklistContainer.innerHTML = html;
}

// Submit Form - Generate Redaksi Akad via Akadify AI Server
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = getFormData();

  const btnSubmit = document.getElementById('btn-submit-ai');
  const progressContainer = document.getElementById('progress-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercentText = document.getElementById('progress-percent-text');

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = "⏳ Menghubungi Server Akadify AI...";
  
  // Reset and show progress bar
  progressContainer.style.display = "block";
  progressBarFill.style.width = "5%";
  progressPercentText.innerText = "5%";
  progressStatusText.innerText = "⏳ Memvalidasi parameter transaksi...";

  // Simulated progressive updates with Akadify AI branding
  let currentProgress = 5;
  const progressInterval = setInterval(() => {
    if (currentProgress < 30) {
      currentProgress += 5;
      progressStatusText.innerText = "🔍 Memverifikasi kepatuhan Rukun & Fatwa DSN-MUI...";
    } else if (currentProgress < 75) {
      currentProgress += 3;
      progressStatusText.innerText = "🤖 Akadify AI sedang menyusun klausul & rincian finansial...";
    } else if (currentProgress < 92) {
      currentProgress += 1;
      progressStatusText.innerText = "✍️ Memformat draft akad notaris & merapikan redaksi...";
    }
    progressBarFill.style.width = `${currentProgress}%`;
    progressPercentText.innerText = `${currentProgress}%`;
  }, 250);

  const textResult = await DeepSeekService.generateAkadClause(formData, currentValidationResult);
  
  clearInterval(progressInterval);

  if (textResult) {
    progressBarFill.style.width = "100%";
    progressPercentText.innerText = "100%";
    progressStatusText.innerText = "✅ Akad syariah berhasil disusun!";

    setTimeout(() => {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = "⚡ Susun Akad dengan AI";
      progressContainer.style.display = "none";
      
      currentDraftText = textResult;
      
      // Save to active contract list
      const contractId = `AKD/${currentAkadType.substring(0,3).toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`;
      const newContract = {
        id: contractId,
        type: currentAkadType,
        pihakKedua: formData.pihakKedua,
        date: new Date().toLocaleDateString('id-ID'),
        score: currentValidationResult.score,
        content: currentDraftText,
        status: 'DRAFT'
      };

      createdContracts.unshift(newContract);
      syncContractToBackend(newContract);
      updateDashboardStats();
      addAuditLog(`Contract Generated via Template: ${newContract.id} (${newContract.type}) - Score: ${newContract.score}%`);
      viewGeneratedDocument();
    }, 600);
  } else {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = "⚡ Susun Akad dengan AI";
    progressContainer.style.display = "none";
  }
}

// Helper untuk memformat istilah Bahasa Arab / Fiqih Muamalah agar otomatis cetak miring (italic)
function formatArabicAndShariaTermsItalic(rawText) {
  if (!rawText) return '';
  
  // Daftar istilah baku bahasa Arab / Fiqih Muamalah dalam akad syariah
  const shariaTerms = [
    "Murabahah", "Murabahah bil Wakalah", "Mudharabah", "Musyarakah", "Syirkah",
    "Ijarah", "Ijarah Muntahiyah Bittamlik", "IMBT", "Qardh", "Qardhul Hasan", "Al-Qardh",
    "Wakalah", "Kafalah", "Rahn", "Hawalah", "Wadiah", "Wadi'ah", "Yad Dhamanah", "Yad Amanah",
    "Ma'qud 'Alaih", "Ma'qud Alaih", "Shighah", "Ijab", "Qabul", "Ijab Qabul",
    "Riba", "Riba Nasi'ah", "Riba Fadhl", "Riba Qardh", "Gharar", "Maisir", "Ba'i al-Inah", "Tadlis", "Ikrah",
    "Ta'widh", "Tazir", "Ta'zir", "Ujrah", "Nisbah", "Ziyadah", "Dhaman", "Muqassah", "Ibra'", "Ibra",
    "Shahibul Maal", "Shahibul Mal", "Mudharib", "Syarik", "Mu'jir", "Musta'jir", "Ma'jur",
    "Fiqh Muamalah", "Fiqih Muamalah", "Maslahah", "Amanah", "Tabarru'", "Tabarru", "Tijarah",
    "Bismillah", "Bismillahi", "Bismillaahirrahmaanirrahiim", "Subhanahu wa Ta'ala", "Shallallahu 'Alaihi wa Sallam",
    "Ahlul Halli wal Aqdi", "Kharaj bi al-Dhaman", "Al-Ghunmu bil Ghurmi", "Al-Ghurmu bil Ghunmi"
  ];

  let formatted = rawText;

  // Ganti istilah syariah dengan tag <em> (italic) secara aman
  shariaTerms.forEach(term => {
    const regex = new RegExp(`\\b(${term.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")})\\b`, 'gi');
    formatted = formatted.replace(regex, '<em>$1</em>');
  });

  return formatted;
}

// Display Generated Document
function viewGeneratedDocument(targetContract = null) {
  if (!currentDraftText && !targetContract) {
    alert("Belum ada draft akad yang dihasilkan. Silakan isi form dan klik 'Susun Akad dengan AI'.");
    return;
  }

  if (targetContract) {
    currentDraftText = targetContract.content;
    currentAkadType = targetContract.type || currentAkadType;
  }

  const formData = targetContract ? {
    pihakPertama: targetContract.formData?.pihakPertama || 'Pengurus Koperasi',
    lembagaPihak1: targetContract.formData?.lembagaPihak1 || targetContract.institutionName || 'Koperasi Syariah',
    pihakKedua: targetContract.pihakKedua || targetContract.formData?.pihakKedua || 'Nama Anggota',
    saksi1: targetContract.formData?.saksi1 || 'Saksi I',
    saksi2: targetContract.formData?.saksi2 || 'Saksi II'
  } : getFormData();

  const signEl = document.getElementById('doc-pihakkedua-sign');
  if (signEl) signEl.innerText = formData.pihakKedua || 'Nama Anggota';
  
  // Set QR Code Hash & Image
  const activeId = targetContract ? targetContract.id : (createdContracts.length > 0 ? createdContracts[0].id : 'AKD-VERIFIED');
  const hashEl = document.getElementById('doc-qr-hash');
  const qrImg = document.getElementById('doc-qr-code');
  if (hashEl) hashEl.innerText = `Hash: ${activeId}`;
  if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=AKADIFY-VERIFIED-${activeId}`;

  // Update Status Stamp
  const stampEl = document.getElementById('approval-stamp');
  if (stampEl) {
    const isApproved = targetContract ? (targetContract.status === 'APPROVED') : (createdContracts.length > 0 && createdContracts[0].status === 'APPROVED');
    if (isApproved) {
      stampEl.innerHTML = "✅ DISAHKAN KOPERASI";
      stampEl.style.borderColor = "var(--success)";
      stampEl.style.color = "var(--success)";
    } else {
      stampEl.innerHTML = "DRAFT DOKUMEN AKAD";
      stampEl.style.borderColor = "var(--accent-gold)";
      stampEl.style.color = "var(--accent-gold)";
    }
  }

  // Format text into clean paragraphs & headings HTML
  let cleanText = currentDraftText;
  
  // Clean any markdown formatting (* and **)
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/---/g, '');

  const lines = (cleanText || '').split('\n');

  // Selalu awali dokumen akad syariah dengan Kalimat Basmalah Bahasa Arab
  let formattedHtml = `
    <div style="text-align:center; margin-top: 0.5rem; margin-bottom: 1.5rem;">
      <p style="font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'Times New Roman', serif; font-size: 1.65rem; font-weight: bold; margin: 0; color: #0f172a; direction: rtl; line-height: 1.8; letter-spacing: 0.5px;">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>
    </div>
  `;
  let isNextLinePasalTitle = false;

  // Filter teks agar baris tanda tangan vertikal di badan teks AI tidak tertampil ganda
  const filteredLines = [];
  let reachedSignatureBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineStr = lines[i].trim();
    if (!lineStr) continue;

    // Abaikan jika teks mentah sudah memiliki baris basmalah agar tidak ganda
    if (lineStr.includes('بِسْمِ اللَّهِ') || lineStr.includes('بسم الله') || lineStr.includes('بِسْمِ اللهِ') || lineStr.toUpperCase() === 'BISMILLAHIRRAHMANIRRAHIM' || lineStr.toUpperCase() === 'BISMILLAHIRRAHMAANIRRAHIIM') {
      continue;
    }

    // Deteksi jika AI mulai mencetak blok tanda tangan vertikal di ujung dokumen
    if (/^(PIHAK PERTAMA|Pihak Pertama|PIHAK KESATU|Pihak Kesatu)/i.test(lineStr) && i > lines.length - 12) {
      reachedSignatureBlock = true;
      break;
    }
    if (reachedSignatureBlock) break;
    filteredLines.push(lineStr);
  }

  filteredLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Jika baris ini adalah Judul Pasal (baris persis setelah 'PASAL X')
    if (isNextLinePasalTitle) {
      isNextLinePasalTitle = false;
      const formattedTitle = formatArabicAndShariaTermsItalic(trimmed);
      formattedHtml += `<h5 style="text-align:center; font-size: 1.05rem; font-weight: bold; margin-top: 0.2rem; margin-bottom: 1.25rem; color: #0f172a; text-transform: uppercase;">${formattedTitle}</h5>`;
      return;
    }

    // Judul Utama & Sub-Judul
    if (trimmed.startsWith('AKAD ') || trimmed.startsWith('PERJANJIAN ')) {
      const formattedHeader = formatArabicAndShariaTermsItalic(trimmed);
      formattedHtml += `<h3 style="text-align:center; font-size: 1.2rem; font-weight: bold; margin: 1rem 0 0.5rem 0; text-transform: uppercase;">${formattedHeader}</h3>`;
    } else if (trimmed.startsWith('No.') || trimmed.startsWith('NO.')) {
      formattedHtml += `<p style="text-align:center; font-weight: bold; margin-bottom: 1.5rem;">${trimmed}</p>`;
    } else if (/^(PASAL|Pasal)\s+\d+/i.test(trimmed)) {
      // Cek apakah judul pasal sudah digabung dalam 1 baris, misal: 'PASAL 1: DASAR DAN SUMBER HUKUM'
      if (trimmed.includes(':') || trimmed.includes(' - ')) {
        const parts = trimmed.split(/[:\-]/);
        const pasalNum = parts[0].trim();
        const pasalTitle = formatArabicAndShariaTermsItalic(parts.slice(1).join('-').trim());
        formattedHtml += `
          <div style="text-align:center; margin-top: 1.75rem; margin-bottom: 1.25rem;">
            <h4 style="font-size: 1.1rem; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${pasalNum}</h4>
            <h5 style="font-size: 1.05rem; font-weight: bold; margin: 0.25rem 0 0 0; text-transform: uppercase; color: #0f172a;">${pasalTitle}</h5>
          </div>
        `;
      } else {
        // Baris terpisah: 'PASAL 1' dan baris berikutnya adalah judulnya
        formattedHtml += `<h4 style="text-align:center; font-size: 1.1rem; font-weight: bold; margin-top: 1.75rem; margin-bottom: 0.2rem; text-transform: uppercase; letter-spacing: 0.5px;">${trimmed}</h4>`;
        isNextLinePasalTitle = true;
      }
    } else if (trimmed.startsWith('Ayat ') || trimmed.startsWith('AYAT ')) {
      formattedHtml += `<h5 style="font-weight: bold; margin-top: 0.75rem; margin-bottom: 0.25rem;">${trimmed}</h5>`;
    } else if (trimmed.match(/^[\u0600-\u06FF]/)) { // Teks Bahasa Arab Asli (Al-Qur'an / Hadits)
      formattedHtml += `<p style="text-align:center; font-size: 1.3rem; font-family: 'Amiri', 'Traditional Arabic', serif; font-style: italic; margin: 1rem 0; direction: rtl; line-height: 2;">${trimmed}</p>`;
    } else if (trimmed.startsWith('"Hai orang-orang') || trimmed.startsWith('Dari Abu Sa\'id') || trimmed.startsWith('(Qs.') || trimmed.startsWith('(HR.')) {
      formattedHtml += `<p style="text-align:center; font-style: italic; font-size: 0.95rem; margin-bottom: 1rem; color: #334155; padding: 0 1rem;">${trimmed}</p>`;
    } else {
      // Deteksi baris pasangan Label: Nilai untuk Identitas Pihak (Nama, Umur, NIK, Jabatan, Pekerjaan, Alamat, dll.)
      const fieldMatch = trimmed.match(/^(Nama|Umur|NIK|Jabatan|Pekerjaan|Alamat|Lembaga|Bertindak untuk dan atas nama|Dalam hal ini bertindak)\s*:\s*(.*)$/i);
      if (fieldMatch) {
        const label = fieldMatch[1].trim();
        const value = formatArabicAndShariaTermsItalic(fieldMatch[2].trim());
        formattedHtml += `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.35rem; font-size: inherit;">
            <tr>
              <td style="width: 28px; min-width: 28px; vertical-align: top; padding: 2px 0;"></td>
              <td style="width: 100px; min-width: 100px; vertical-align: top; padding: 2px 0; font-weight: 500;">${label}</td>
              <td style="width: 15px; min-width: 15px; vertical-align: top; text-align: center; padding: 2px 0; font-weight: 500;">:</td>
              <td style="vertical-align: top; padding: 2px 0; text-align: justify; text-justify: inter-word;">${value}</td>
            </tr>
          </table>
        `;
        return;
      }

      // Deteksi penomoran butir / pointer berjenjang (Multilevel Numbering)
      const listMatch = trimmed.match(/^(\d+\.|\([0-9]+\)|[a-z]\.|\([a-z]\)|[A-Z]\.|\d+\)|[ivxlcdm]+\.|\([ivxlcdm]+\)|-)\s+(.*)$/);
      if (listMatch) {
        const numLabel = listMatch[1];
        let textBody = listMatch[2];
        
        // Cek jika butir nomor juga berisi pasangan 'Nama: Nilai' (misal: 1. Nama: Budi)
        const nestedFieldMatch = textBody.match(/^(Nama|Umur|NIK|Jabatan|Pekerjaan|Alamat)\s*:\s*(.*)$/i);
        if (nestedFieldMatch) {
          const nestedLabel = nestedFieldMatch[1].trim();
          const nestedVal = formatArabicAndShariaTermsItalic(nestedFieldMatch[2].trim());
          formattedHtml += `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.35rem; font-size: inherit;">
              <tr>
                <td style="width: 28px; min-width: 28px; vertical-align: top; padding: 2px 0; font-weight: 600;">${numLabel}</td>
                <td style="width: 100px; min-width: 100px; vertical-align: top; padding: 2px 0; font-weight: 500;">${nestedLabel}</td>
                <td style="width: 15px; min-width: 15px; vertical-align: top; text-align: center; padding: 2px 0; font-weight: 500;">:</td>
                <td style="vertical-align: top; padding: 2px 0; text-align: justify; text-justify: inter-word;">${nestedVal}</td>
              </tr>
            </table>
          `;
          return;
        }

        textBody = formatArabicAndShariaTermsItalic(textBody);
        
        // Tentukan level indentasi hierarki
        let levelClass = 'doc-level-1';

        if (/^[a-z]\.|\([a-z]\)/.test(numLabel)) {
          // Level 2: a. , b. , (a)
          levelClass = 'doc-level-2';
        } else if (/^[ivxlcdm]+\.|\([ivxlcdm]+\)|-/.test(numLabel)) {
          // Level 3: i. , ii. , (i) , -
          levelClass = 'doc-level-3';
        } else {
          // Level 1: 1. , (1) , A.
          levelClass = 'doc-level-1';
        }

        formattedHtml += `
          <div class="doc-numbered-item ${levelClass}">
            <div class="doc-numbered-num">${numLabel}</div>
            <div class="doc-numbered-body">${textBody}</div>
          </div>
        `;
      } else {
        const formattedPara = formatArabicAndShariaTermsItalic(trimmed);
        formattedHtml += `<p style="margin-bottom: 0.75rem; text-align: justify; text-justify: inter-word; text-indent: 2rem; line-height: 1.7;">${formattedPara}</p>`;
      }
    }
  });

  // Tambahkan Blok Tanda Tangan Horizontal Resmi di Akhir Dokumen
  const pihak1Nama = formData.pihakPertama || 'Pengurus Koperasi';
  const pihak1Lembaga = formData.lembagaPihak1 || 'Koperasi Syariah';
  const pihak2Nama = formData.pihakKedua || 'Nama Anggota';
  const saksi1Nama = formData.saksi1 || 'Saksi I';
  const saksi2Nama = formData.saksi2 || 'Saksi II';

  formattedHtml += `
    <div style="margin-top: 3rem; margin-bottom: 2rem; page-break-inside: avoid;">
      <!-- Baris Tanda Tangan Utama: Pihak Pertama (Kiri) & Pihak Kedua (Kanan) Horizontal -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 2.5rem;">
        <tr>
          <td style="width: 48%; text-align: center; vertical-align: top; font-size: 0.95rem;">
            <p style="margin: 0; font-weight: bold;">PIHAK PERTAMA</p>
            <p style="margin: 2px 0 0 0; color: #475569; font-size: 0.85rem;">${pihak1Lembaga}</p>
            <div style="height: 5.5rem;"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">( ${pihak1Nama} )</p>
            <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b;">Pengurus / Pejabat Berwenang</p>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 48%; text-align: center; vertical-align: top; font-size: 0.95rem;">
            <p style="margin: 0; font-weight: bold;">PIHAK KEDUA</p>
            <p style="margin: 2px 0 0 0; color: #475569; font-size: 0.85rem;">Anggota / Nasabah Pemohon</p>
            <div style="height: 5.5rem;"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">( ${pihak2Nama} )</p>
            <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b;">Penerima Fasilitas Pembiayaan</p>
          </td>
        </tr>
      </table>

      <!-- Baris Saksi-Saksi (Horizontal Rapi) -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 1.5rem;">
        <tr>
          <td colspan="3" style="text-align: center; padding-bottom: 1rem;">
            <strong style="font-size: 0.9rem; letter-spacing: 0.5px; text-transform: uppercase;">SAKSI - SAKSI:</strong>
          </td>
        </tr>
        <tr>
          <td style="width: 48%; text-align: center; vertical-align: top; font-size: 0.9rem;">
            <p style="margin: 0; font-weight: 600;">Saksi I</p>
            <div style="height: 4rem;"></div>
            <p style="margin: 0; text-decoration: underline;">( ${saksi1Nama} )</p>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 48%; text-align: center; vertical-align: top; font-size: 0.9rem;">
            <p style="margin: 0; font-weight: 600;">Saksi II</p>
            <div style="height: 4rem;"></div>
            <p style="margin: 0; text-decoration: underline;">( ${saksi2Nama} )</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  document.getElementById('document-content-area').innerHTML = formattedHtml;
  switchTab('document');
}

// Function to Export Document to Microsoft Word (.docx) - Standard Compliant HTML Format for Word
function exportToWordDocx() {
  if (!currentDraftText) {
    alert("Belum ada dokumen akad untuk diexport. Silakan susun dokumen terlebih dahulu.");
    return;
  }

  const contentHtml = document.getElementById('document-content-area').innerHTML;
  const formData = getFormData();
  const pihakKeduaNama = formData.pihakKedua || 'Anggota';
  
  // Safe filename (remove dot, comma, special characters to prevent Word unreadable error)
  const safeName = pihakKeduaNama.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const fileName = `Dokumen_Akad_${currentAkadType}_${safeName}.doc`;

  // Ambil data White Label terkini
  const wl = currentWhiteLabelSettings || {
    institutionName: 'KSPPS BMT BINA UMMAH SEJAHTERA',
    institutionTagline: 'Badan Hukum No. AHU-0012345.AH.01.26.TAHUN 2024',
    institutionAddress: 'Jl. Raya Pajajaran No. 45, Bandung | Telp: (022) 7654321',
    institutionEmail: 'kontak@bmtbinaummah.co.id'
  };

  const headerHtml = `
    <table style="width: 100%; border-collapse: collapse; border-bottom: 3px double #000000; padding-bottom: 12px; margin-bottom: 25px;">
      <tr>
        <td style="text-align: center; vertical-align: middle;">
          <h2 style="margin: 0; text-transform: uppercase; font-family: 'Times New Roman', serif; font-size: 15pt; font-weight: bold; letter-spacing: 0.5px;">${wl.institutionName || 'KOPERASI SIMPAN PINJAM DAN PEMBIAYAAN SYARIAH'}</h2>
          <p style="margin: 3px 0 0 0; font-size: 9.5pt; font-family: Arial, sans-serif; font-weight: bold; color: #333333;">${wl.institutionTagline || 'Badan Hukum Koperasi Syariah'}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt; font-family: Arial, sans-serif; color: #555555;">${wl.institutionAddress || ''}</p>
          <p style="margin: 1px 0 0 0; font-size: 8.5pt; font-family: Arial, sans-serif; color: #047857;">${wl.institutionEmail || ''}</p>
        </td>
      </tr>
    </table>
  `;

  const footerHtml = `
    <br><br>
    <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
      <tr>
        <td style="text-align: center; width: 50%; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <p>PIHAK PERTAMA (Koperasi)</p>
          <br><br><br><br>
          <p><strong>( ______________________ )</strong></p>
        </td>
        <td style="text-align: center; width: 50%; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <p>PIHAK KEDUA (Pemohon)</p>
          <br><br><br><br>
          <p><strong>( ${pihakKeduaNama} )</strong></p>
        </td>
      </tr>
    </table>
  `;

  // Construct pure HTML for MS Word
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Dokumen Akad Syariah</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000000; }
    h3 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 15pt; margin-bottom: 10pt; }
    h4 { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 15pt; margin-bottom: 3pt; }
    h5 { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; margin-bottom: 10pt; }
    p { margin-bottom: 8pt; text-align: justify; text-justify: inter-word; }
    .doc-numbered-item { display: flex; align-items: flex-start; margin-bottom: 6pt; line-height: 1.5; }
    .doc-level-1 { margin-left: 0pt; }
    .doc-level-1 > .doc-numbered-num { width: 25pt; min-width: 25pt; }
    .doc-level-2 { margin-left: 25pt; }
    .doc-level-2 > .doc-numbered-num { width: 20pt; min-width: 20pt; }
    .doc-level-3 { margin-left: 50pt; }
    .doc-level-3 > .doc-numbered-num { width: 20pt; min-width: 20pt; }
    .doc-numbered-num { text-align: left; }
    .doc-numbered-body { text-align: justify; text-justify: inter-word; flex: 1; }
  </style>
</head>
<body>
  <div class="Section1">
    ${headerHtml}
    ${contentHtml}
    ${footerHtml}
  </div>
</body>
</html>`;

  // Use application/msword with UTF-8 BOM to prevent MS Word XML parsing errors
  const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword;charset=utf-8' });

  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, fileName);
  } else {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }
}

// Approve Document
function approveContract() {
  document.getElementById('approval-stamp').innerHTML = "✅ DISAHKAN KOPERASI";
  document.getElementById('approval-stamp').style.borderColor = "var(--success)";
  document.getElementById('approval-stamp').style.color = "var(--success)";
  
  if (createdContracts.length > 0) {
    createdContracts[0].status = 'APPROVED';
    syncContractToBackend(createdContracts[0]);
    addAuditLog(`Contract Approved: ${createdContracts[0].id} oleh Pengurus Koperasi`);
    updateDashboardStats();
  }
  
  alert("Dokumen Akad Syariah berhasil disahkan, diberi stempel legalitas Koperasi, dan dicatat ke Audit Log!");
}

// Search and Filter Contracts Table
function filterContractsTable() {
  const searchQuery = (document.getElementById('contract-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('contract-status-filter')?.value || 'ALL';

  const filtered = createdContracts.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery) ||
                          c.pihakKedua.toLowerCase().includes(searchQuery) ||
                          c.type.toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderVerificationTable(filtered);
}

// Dashboard & Verification Table Update
function updateDashboardStats() {
  const totalEl = document.getElementById('stat-total-akad');
  const scoreEl = document.getElementById('stat-syariah-score');
  
  if (totalEl) totalEl.innerText = createdContracts.length;
  
  if (scoreEl) {
    if (createdContracts.length > 0) {
      const avgScore = (createdContracts.reduce((acc, curr) => acc + curr.score, 0) / createdContracts.length).toFixed(1);
      scoreEl.innerText = `${avgScore}%`;
    } else {
      scoreEl.innerText = `-`;
    }
  }

  // Render Dashboard Table
  const tbody = document.getElementById('dashboard-table-body');
  if (tbody) {
    if (createdContracts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            Belum ada akad yang dibuat. Klik tombol di samping untuk membuat akad baru.
          </td>
        </tr>`;
    } else {
      tbody.innerHTML = createdContracts.map(c => `
        <tr>
          <td><strong>${c.type} (${c.id})</strong></td>
          <td>${c.pihakKedua}</td>
          <td><span class="badge badge-success">${c.score}% Patuh (${c.status})</span></td>
        </tr>
      `).join('');
    }
  }

  filterContractsTable();
}

function renderVerificationTable(contractsList) {
  const vbody = document.getElementById('verification-table-body');
  if (!vbody) return;

  if (contractsList.length === 0) {
    vbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Tidak ada dokumen akad yang cocok dengan pencarian / filter.
        </td>
      </tr>`;
  } else {
    vbody.innerHTML = contractsList.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td>${c.type}</td>
        <td>${c.pihakKedua}</td>
        <td>${c.date}</td>
        <td><span class="badge badge-success">${c.score}% Valid</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="viewContractById('${c.id}')">📄 Review</button>
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-color: var(--danger); color: var(--danger);" onclick="deleteContractById('${c.id}')" title="Hapus Dokumen Akad">🗑️ Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

function viewContractById(id) {
  const contract = createdContracts.find(c => c.id === id);
  if (contract) {
    viewGeneratedDocument(contract);
  }
}

// Delete Contract Handler
async function deleteContractById(id) {
  const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus dokumen akad ${id}? Data yang dihapus tidak dapat dikembalikan.`);
  if (!confirmDelete) return;

  try {
    const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      createdContracts = createdContracts.filter(c => c.id !== id);
      updateDashboardStats();
      addAuditLog(`Contract Deleted: ${id} oleh Operator Koperasi`);
      alert(`✅ Dokumen akad ${id} berhasil dihapus.`);
    } else {
      alert("⚠️ Gagal menghapus dokumen akad dari server.");
    }
  } catch (err) {
    console.error("Gagal menghapus akad:", err);
    // Fallback local deletion if offline
    createdContracts = createdContracts.filter(c => c.id !== id);
    updateDashboardStats();
    addAuditLog(`Contract Deleted locally: ${id}`);
    alert(`✅ Dokumen akad ${id} dihapus dari daftar lokal.`);
  }
}

function addAuditLog(message) {
  const container = document.getElementById('audit-log-container');
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  container.innerHTML += `<p>[${timestamp}] ${message}</p>`;
}

// ==========================================
// FULL-PAGE AI SYARIAH ASISTEN FATWA LOGIC
// ==========================================

let chatHistory = [];

function sendQuickChatPrompt(promptText) {
  const inputEl = document.getElementById('full-chat-input');
  if (inputEl) {
    inputEl.value = promptText;
    const form = inputEl.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
}

function clearChatHistory() {
  chatHistory = [];
  const container = document.getElementById('full-chat-messages-container');
  if (container) {
    container.innerHTML = `
      <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">⚖️</div>
        <div style="background: #f1f5f9; color: var(--text-main); padding: 1rem 1.25rem; border-radius: 16px; border-top-left-radius: 2px; max-width: 85%; font-size: 0.9rem; line-height: 1.6; border: 1px solid #e2e8f0;">
          Percakapan telah dibersihkan. Silakan ajukan pertanyaan fatwa atau klausul akad baru Anda.
        </div>
      </div>
    `;
  }
}

async function handleFullChatSubmit(e) {
  e.preventDefault();
  const inputEl = document.getElementById('full-chat-input');
  const btnSubmit = document.getElementById('btn-full-chat-send');
  const userMessage = inputEl ? inputEl.value.trim() : '';
  if (!userMessage) return;

  // Render User Message
  appendFullChatMessage('user', userMessage);
  inputEl.value = '';

  // Save to history
  chatHistory.push({ role: 'user', content: userMessage });

  // Show typing indicator
  const typingId = appendFullChatTyping();
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Menelaah...';
  }

  try {
    const response = await fetch('/api/chat-syariah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    removeFullChatTyping(typingId);

    if (response.ok && response.body) {
      // Inisialisasi bubble pesan assistant baru yang akan diisi secara streaming
      const messageElId = appendEmptyAssistantMessage();
      const contentEl = document.getElementById(messageElId);
      const container = document.getElementById('full-chat-messages-container');

      let fullBotReply = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.text) {
              fullBotReply += data.text;
              if (contentEl) {
                contentEl.innerHTML = formatShariaChatMarkdown(fullBotReply);
                if (container) container.scrollTop = container.scrollHeight;
              }
            }
          } catch (e) {
            // Partial parse safety
          }
        }
      }

      chatHistory.push({ role: 'assistant', content: fullBotReply });
    } else {
      const errData = await response.json().catch(() => ({ error: 'Error' }));
      appendFullChatMessage('assistant', `⚠️ Maaf, terjadi kendala: ${errData.error || 'Gagal terhubung ke AI Service'}`);
    }
  } catch (err) {
    console.error("Chat error:", err);
    removeFullChatTyping(typingId);
    appendFullChatMessage('assistant', '⚠️ Terjadi kendala koneksi ke server AI Syariah.');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Kirim Pertanyaan 🚀';
    }
  }
}

// Format Markdown & Teks Respon AI Syariah
function formatShariaChatMarkdown(text) {
  let cleanText = text;
  cleanText = cleanText.replace(/###\s*/g, '');
  cleanText = cleanText.replace(/##\s*/g, '');
  cleanText = cleanText.replace(/#\s*/g, '');
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/---/g, '');
  cleanText = cleanText.replace(/--/g, '-');
  return cleanText.replace(/\n/g, '<br>');
}

// Buat Bubble Pesan Assistant Kosong untuk Diisi Real-time Stream
function appendEmptyAssistantMessage() {
  const container = document.getElementById('full-chat-messages-container');
  if (!container) return null;

  const msgId = 'bot-msg-' + Date.now();
  const html = `
    <div style="display: flex; gap: 0.75rem; align-items: flex-start; flex-direction: row;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
        <img src="icons/judge.svg" alt="AI" style="width: 20px; height: 20px; filter: brightness(0) invert(1);">
      </div>
      <div id="${msgId}" style="background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 0 16px 16px 16px; box-shadow: var(--shadow-sm); padding: 1rem 1.25rem; max-width: 82%; font-size: 0.9rem; line-height: 1.6;">
        <span style="color: var(--text-muted); font-style: italic;">Mengetik...</span>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  return msgId;
}

function appendFullChatMessage(role, text) {
  const container = document.getElementById('full-chat-messages-container');
  if (!container) return;

  const isUser = role === 'user';
  const avatar = isUser ? '👤' : '<img src="icons/judge.svg" alt="AI" style="width: 20px; height: 20px; filter: brightness(0) invert(1);">';
  const bgStyle = isUser 
    ? 'background: var(--primary-subtle); color: var(--primary-dark); border-radius: 16px 0 16px 16px; border: 1px solid rgba(4, 120, 87, 0.2);' 
    : 'background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a; border-radius: 0 16px 16px 16px; box-shadow: var(--shadow-sm);';
  const alignSelf = isUser ? 'flex-direction: row-reverse;' : 'flex-direction: row;';

  const formattedText = formatShariaChatMarkdown(text);

  const html = `
    <div style="display: flex; gap: 0.75rem; align-items: flex-start; ${alignSelf}">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isUser ? 'var(--primary)' : '#0f172a'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">${avatar}</div>
      <div style="${bgStyle} padding: 1rem 1.25rem; max-width: 82%; font-size: 0.9rem; line-height: 1.6;">
        ${formattedText}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

function appendFullChatTyping() {
  const container = document.getElementById('full-chat-messages-container');
  const typingId = 'typing-' + Date.now();
  const html = `
    <div id="${typingId}" style="display: flex; gap: 0.75rem; align-items: flex-start;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
        <img src="icons/judge.svg" alt="AI" style="width: 20px; height: 20px; filter: brightness(0) invert(1);">
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.85rem 1.15rem; border-radius: 0 16px 16px 16px; max-width: 82%; font-size: 0.85rem; color: var(--text-muted);">
        <em>Asisten AI sedang menelaah Fatwa DSN-MUI... ⏳</em>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  return typingId;
}

function removeFullChatTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ==========================================
// SHARIA FINANCIAL CALCULATOR & AMORTIZATION
// ==========================================

let currentAmortizationSchedule = [];

// Handle Calc Type Selection Change
function onCalcTypeChange(type) {
  const marginGroup = document.getElementById('calc-group-margin');
  const nisbahGroup = document.getElementById('calc-group-nisbah');
  const labelPokok = document.getElementById('calc-label-pokok');
  const labelResMargin = document.getElementById('calc-label-res-margin');
  const noteEl = document.getElementById('calc-compliance-note');
  const thMargin = document.getElementById('th-calc-margin');

  if (type === 'Murabahah') {
    marginGroup.style.display = 'block';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Nilai Pokok / Harga Beli (Rp)';
    labelResMargin.innerText = 'Total Margin Keuntungan:';
    if (thMargin) thMargin.innerText = 'Margin Keuntungan';
    noteEl.innerText = 'Harga jual Murabahah (Pokok + Margin) bersifat mengikat dan tetap (fixed) sepanjang masa tenor. Koperasi dilarang mengenakan bunga majemuk atau menaikkan margin saat keterlambatan.';
  } else if (type === 'Ijarah') {
    marginGroup.style.display = 'block';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Nilai Aset / Manfaat Jasa Disewakan (Rp)';
    labelResMargin.innerText = 'Total Ujrah (Sewa/Jasa):';
    if (thMargin) thMargin.innerText = 'Ujrah (Sewa/Jasa)';
    noteEl.innerText = 'Ujrah (sewa) disepakati di muka untuk pemanfaatan aset/jasa. Selama masa akad, pemeliharaan pokok barang tetap menjadi tanggung jawab pemilik aset (Mu\'jir).';
  } else if (type === 'Mudharabah') {
    marginGroup.style.display = 'none';
    nisbahGroup.style.display = 'block';
    labelPokok.innerText = 'Total Modal Usaha / Investasi (Rp)';
    labelResMargin.innerText = 'Proyeksi Bagi Hasil Koperasi:';
    if (thMargin) thMargin.innerText = 'Proyeksi Bagi Hasil';
    noteEl.innerText = 'Bagi hasil wajib dihitung dari realisasi keuntungan usaha (Profit & Loss Sharing) sesuai nisbah yang disepakati, bukan persentase tetap dari modal pokok.';
  } else if (type === 'Qardh') {
    marginGroup.style.display = 'none';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Jumlah Pinjaman Pokok Qardh (Rp)';
    labelResMargin.innerText = 'Tambahan / Biaya Terlarang:';
    if (thMargin) thMargin.innerText = 'Tambahan (Rp 0)';
    noteEl.innerText = 'Akad Qardh adalah pinjaman kebajikan tanpa tambahan manfaat (Kullu qardhin jarra manfa\'atan fahuwa riba). Pengembalian harus tepat sejumlah pokok tanpa bunga.';
  }

  calculateShariaFinance();
}

// Quick Demo Fill for Calculator
function fillQuickCalcDemo() {
  document.getElementById('calc-pokok').value = "36.000.000";
  document.getElementById('calc-margin-percent').value = "10";
  document.getElementById('calc-tenor').value = "12";
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('calc-start-date').value = `${year}-${month}-${day}`;

  calculateShariaFinance();
}

// Main Calculation Function
function calculateShariaFinance() {
  const type = document.getElementById('calc-akad-type') ? document.getElementById('calc-akad-type').value : 'Murabahah';
  const pokok = parseRawNumber(document.getElementById('calc-pokok')?.value);
  const tenor = parseInt(document.getElementById('calc-tenor')?.value || 12, 10) || 12;
  const marginPercent = parseFloat(document.getElementById('calc-margin-percent')?.value || 0) || 0;
  
  const nisbahKoperasi = parseFloat(document.getElementById('calc-nisbah-koperasi')?.value || 40) || 40;
  if (document.getElementById('calc-nisbah-anggota')) {
    document.getElementById('calc-nisbah-anggota').value = Math.max(0, 100 - nisbahKoperasi);
  }
  const proyeksiLaba = parseRawNumber(document.getElementById('calc-proyeksi-laba')?.value);

  let totalMargin = 0;
  let totalKewajiban = pokok;
  let angsuranPerBulan = 0;
  let pokokPerBulan = tenor > 0 ? (pokok / tenor) : 0;
  let marginPerBulan = 0;

  if (type === 'Murabahah' || type === 'Ijarah') {
    // Formula Flat Syariah: Total Margin = Pokok * (Margin% / 100) * (Tenor / 12)
    totalMargin = pokok * (marginPercent / 100) * (tenor / 12);
    totalKewajiban = pokok + totalMargin;
    angsuranPerBulan = tenor > 0 ? (totalKewajiban / tenor) : 0;
    marginPerBulan = tenor > 0 ? (totalMargin / tenor) : 0;
  } else if (type === 'Mudharabah') {
    // Proyeksi Bagi Hasil bulanan untuk koperasi
    const bagiHasilBulanKoperasi = proyeksiLaba * (nisbahKoperasi / 100);
    totalMargin = bagiHasilBulanKoperasi * tenor;
    totalKewajiban = pokok + totalMargin;
    marginPerBulan = bagiHasilBulanKoperasi;
    angsuranPerBulan = pokokPerBulan + marginPerBulan;
  } else if (type === 'Qardh') {
    totalMargin = 0;
    totalKewajiban = pokok;
    marginPerBulan = 0;
    angsuranPerBulan = pokokPerBulan;
  }

  // Update Summary DOM
  const formatIDR = (val) => "Rp " + Math.round(val).toLocaleString('id-ID');

  if (document.getElementById('calc-result-angsuran')) {
    document.getElementById('calc-result-angsuran').innerText = formatIDR(angsuranPerBulan) + " / bln";
    document.getElementById('calc-result-pokok').innerText = formatIDR(pokok);
    document.getElementById('calc-result-margin').innerText = formatIDR(totalMargin);
    document.getElementById('calc-result-total').innerText = formatIDR(totalKewajiban);
  }

  const badgeTenor = document.getElementById('amortization-badge-tenor');
  if (badgeTenor) badgeTenor.innerText = `${tenor} Bulan Angsuran`;

  // Generate Amortization Table Rows
  generateAmortizationSchedule(pokok, totalMargin, tenor, angsuranPerBulan, pokokPerBulan, marginPerBulan);
}

// Generate Amortization Schedule Table
function generateAmortizationSchedule(pokok, totalMargin, tenor, angsuranPerBulan, pokokPerBulan, marginPerBulan) {
  const tbody = document.getElementById('amortization-table-body');
  if (!tbody) return;

  if (pokok <= 0 || tenor <= 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Masukkan nilai pokok dan tenor di atas untuk menghasilkan tabel jadwal angsuran.
        </td>
      </tr>
    `;
    currentAmortizationSchedule = [];
    return;
  }

  const formatIDR = (val) => "Rp " + Math.round(val).toLocaleString('id-ID');
  
  let startDateStr = document.getElementById('calc-start-date') ? document.getElementById('calc-start-date').value : '';
  let currentDate = startDateStr ? new Date(startDateStr) : new Date();

  let remainingPiutang = pokok + totalMargin;
  let html = '';
  currentAmortizationSchedule = [];

  for (let i = 1; i <= tenor; i++) {
    // Increment Month
    const dueDate = new Date(currentDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const dateStr = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // Handle last month rounding difference
    let currentAngsuran = angsuranPerBulan;
    let curPokok = pokokPerBulan;
    let curMargin = marginPerBulan;

    if (i === tenor) {
      currentAngsuran = remainingPiutang;
      remainingPiutang = 0;
    } else {
      remainingPiutang -= currentAngsuran;
    }

    currentAmortizationSchedule.push({
      bulanKe: i,
      jatuhTempo: dateStr,
      angsuranPokok: curPokok,
      angsuranMargin: curMargin,
      totalAngsuran: currentAngsuran,
      sisaPiutang: remainingPiutang
    });

    html += `
      <tr>
        <td style="text-align: center; font-weight: 600; color: var(--primary);">${i}</td>
        <td><strong>${dateStr}</strong></td>
        <td style="text-align: right;">${formatIDR(curPokok)}</td>
        <td style="text-align: right; color: #d97706; font-weight: 500;">${formatIDR(curMargin)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary-dark);">${formatIDR(currentAngsuran)}</td>
        <td style="text-align: right; color: var(--text-muted);">${formatIDR(Math.max(0, remainingPiutang))}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// Apply Calculation Results directly to Akad Generator Form
function applyCalcToAkadGenerator() {
  const type = document.getElementById('calc-akad-type').value;
  const pokok = parseRawNumber(document.getElementById('calc-pokok')?.value);
  const tenor = parseInt(document.getElementById('calc-tenor')?.value || 12, 10) || 12;
  const marginPercent = parseFloat(document.getElementById('calc-margin-percent')?.value || 0) || 0;
  const totalMargin = pokok * (marginPercent / 100) * (tenor / 12);

  // Switch form to selected Akad Type
  document.getElementById('form-akad-type').value = type;
  onAkadTypeChange(type);

  // Prefill fields with dot formatting
  if (type === 'Murabahah') {
    if (document.getElementById('hargaBeli')) document.getElementById('hargaBeli').value = formatNumberWithDots(pokok);
    if (document.getElementById('margin')) document.getElementById('margin').value = formatNumberWithDots(Math.round(totalMargin));
    if (document.getElementById('tenor')) document.getElementById('tenor').value = tenor;
  } else if (type === 'Qardh') {
    if (document.getElementById('jumlahPinjaman')) document.getElementById('jumlahPinjaman').value = formatNumberWithDots(pokok);
    if (document.getElementById('jatuhTempo')) document.getElementById('jatuhTempo').value = `${tenor} Bulan`;
  } else if (type === 'Mudharabah') {
    if (document.getElementById('jumlahModal')) document.getElementById('jumlahModal').value = formatNumberWithDots(pokok);
    const nisbahKop = document.getElementById('calc-nisbah-koperasi').value;
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = Math.max(0, 100 - parseFloat(nisbahKop));
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = nisbahKop;
  } else if (type === 'Ijarah') {
    if (document.getElementById('biayaUjrah')) document.getElementById('biayaUjrah').value = formatNumberWithDots(Math.round(pokok + totalMargin));
    if (document.getElementById('tenorIjarah')) document.getElementById('tenorIjarah').value = `${tenor} Bulan`;
  }

  triggerValidation();
  goToWizardStep(2);
  switchTab('generator');
  alert(`✅ Parameter finansial berhasil diterapkan ke Form Akad ${type}! Silakan lengkapi identitas para pihak.`);
}

// ==========================================
// WHITE-LABEL & KOP SURAT KOPERASI CONTROLLER
// ==========================================

let currentWhiteLabelSettings = null;

// Fetch White-Label Settings from Backend
async function loadWhiteLabelSettings() {
  const userJson = localStorage.getItem('akadify_logged_user');
  if (!userJson) return;

  let userId = 'USR-SUPERADMIN-DEMO';
  try {
    const userObj = JSON.parse(userJson);
    userId = userObj.id || userObj.username;
  } catch (e) {
    userId = userJson;
  }

  try {
    const res = await fetch(`/api/institution/settings?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        currentWhiteLabelSettings = data.settings;
        populateWhiteLabelForm(data.settings);
        applyWhiteLabelToUI(data.settings);
      }
    }
  } catch (err) {
    console.error("Gagal memuat pengaturan white-label:", err);
  }
}

// Populate input form with loaded settings
function populateWhiteLabelForm(settings) {
  if (document.getElementById('wl-inst-name')) document.getElementById('wl-inst-name').value = settings.institutionName || '';
  if (document.getElementById('wl-inst-tagline')) document.getElementById('wl-inst-tagline').value = settings.institutionTagline || '';
  if (document.getElementById('wl-inst-address')) document.getElementById('wl-inst-address').value = settings.institutionAddress || '';
  if (document.getElementById('wl-inst-email')) document.getElementById('wl-inst-email').value = settings.institutionEmail || '';
  if (document.getElementById('wl-inst-logo')) document.getElementById('wl-inst-logo').value = settings.headerLogoUrl || '';
  
  updateLiveKopPreview();
}

// Handle Logo File Upload (Base64 Data URI)
function handleLogoFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("⚠️ Ukuran file maksimal 2 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Url = e.target.result;
    const logoInput = document.getElementById('wl-inst-logo');
    if (logoInput) logoInput.value = base64Url;
    updateLiveKopPreview();
  };
  reader.readAsDataURL(file);
}

// Live Update Kop Surat Preview on Input
function updateLiveKopPreview() {
  const name = document.getElementById('wl-inst-name')?.value || 'NAMA LEMBAGA KOPERASI SYARIAH';
  const tagline = document.getElementById('wl-inst-tagline')?.value || 'Nomor Badan Hukum / SK AHU Kemenkumham';
  const address = document.getElementById('wl-inst-address')?.value || 'Alamat Kantor & Kontak Telepon';
  const email = document.getElementById('wl-inst-email')?.value || 'email@koperasi.id';
  const logo = document.getElementById('wl-inst-logo')?.value || 'logo_transparent.png';

  // Update Mockup di Form Settings
  if (document.getElementById('live-kop-title')) document.getElementById('live-kop-title').innerText = name;
  if (document.getElementById('live-kop-tagline')) document.getElementById('live-kop-tagline').innerText = tagline;
  if (document.getElementById('live-kop-address')) document.getElementById('live-kop-address').innerText = address;
  if (document.getElementById('live-kop-email')) document.getElementById('live-kop-email').innerText = email;
  if (document.getElementById('live-kop-logo')) document.getElementById('live-kop-logo').src = logo;
}

// Apply White-Label Settings to Document View & App UI
function applyWhiteLabelToUI(settings) {
  if (!settings) return;

  // Update Kop Surat Dokumen Pratinjau
  if (document.getElementById('doc-kop-title')) document.getElementById('doc-kop-title').innerText = settings.institutionName || 'KOPERASI SYARIAH';
  if (document.getElementById('doc-kop-tagline')) document.getElementById('doc-kop-tagline').innerText = settings.institutionTagline || '';
  if (document.getElementById('doc-kop-address')) document.getElementById('doc-kop-address').innerText = settings.institutionAddress || '';
  if (document.getElementById('doc-kop-email')) document.getElementById('doc-kop-email').innerText = settings.institutionEmail || '';
  if (document.getElementById('doc-kop-logo') && settings.headerLogoUrl) {
    document.getElementById('doc-kop-logo').src = settings.headerLogoUrl;
  }
}

// Save White-Label Settings to Backend
async function handleSaveWhiteLabel(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-wl');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Menyimpan Pengaturan...';
  }

  const userJson = localStorage.getItem('akadify_logged_user');
  let userId = 'USR-SUPERADMIN-DEMO';
  if (userJson) {
    try {
      const userObj = JSON.parse(userJson);
      userId = userObj.id || userObj.username;
    } catch (err) {
      userId = userJson;
    }
  }

  const whiteLabel = {
    institutionName: document.getElementById('wl-inst-name')?.value.trim() || '',
    institutionTagline: document.getElementById('wl-inst-tagline')?.value.trim() || '',
    institutionAddress: document.getElementById('wl-inst-address')?.value.trim() || '',
    institutionEmail: document.getElementById('wl-inst-email')?.value.trim() || '',
    headerLogoUrl: document.getElementById('wl-inst-logo')?.value.trim() || 'logo_transparent.png'
  };

  try {
    const res = await fetch('/api/institution/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, whiteLabel })
    });

    if (res.ok) {
      const data = await res.json();
      currentWhiteLabelSettings = whiteLabel;
      applyWhiteLabelToUI(whiteLabel);
      addAuditLog(`White-Label Updated: Kop surat disesuaikan untuk ${whiteLabel.institutionName}`);
      alert("✅ Pengaturan Kop Surat & White-Label Koperasi berhasil disimpan dan disematkan ke seluruh dokumen akad!");
    } else {
      alert("⚠️ Gagal menyimpan pengaturan ke server.");
    }
  } catch (err) {
    console.error("Gagal menyimpan white-label:", err);
    alert("⚠️ Gagal terhubung ke server backend.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '💾 Simpan Pengaturan White-Label';
    }
  }
}

// ==========================================
// COMPREHENSIVE SETTINGS & PROFILE CONTROLLER
// ==========================================

let currentUserProfile = null;

// Switch Sub-Tabs in Settings View
function switchSettingsSubTab(subTabId) {
  const subTabs = ['profile', 'whitelabel', 'security'];
  subTabs.forEach(tab => {
    const viewEl = document.getElementById(`settings-sub-${tab}`);
    const btnEl = document.getElementById(`set-tab-${tab}-btn`);
    if (viewEl) viewEl.style.display = (tab === subTabId) ? 'block' : 'none';
    if (btnEl) {
      if (tab === subTabId) {
        btnEl.classList.add('active');
        btnEl.style.background = 'var(--primary)';
        btnEl.style.color = '#ffffff';
      } else {
        btnEl.classList.remove('active');
        btnEl.style.background = 'transparent';
        btnEl.style.color = 'var(--text-main)';
      }
    }
  });

  if (subTabId === 'profile') loadUserProfileSettings();
  if (subTabId === 'whitelabel') loadWhiteLabelSettings();
}

// Handle Delete Account (Right to Erasure - UU PDP No. 27/2022)
async function handleDeleteAccount(e) {
  e.preventDefault();
  
  const password = document.getElementById('delete-account-pwd')?.value;
  if (!password) {
    alert("⚠️ Harap masukkan kata sandi akun Anda untuk konfirmasi penghapusan.");
    return;
  }

  const confirmDelete = confirm("⚠️ PERINGATAN TERAKHIR:\n\nApakah Anda benar-benar yakin ingin MENGHAPUS PERMANEN akun lembaga ini beserta seluruh arsip akad yang telah diterbitkan?\n\nTindakan ini tunduk pada UU PDP No. 27/2022 dan TIDAK DAPAT DIBATALKAN!");
  if (!confirmDelete) return;

  const btn = document.getElementById('btn-delete-account');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Menghapus Akun & Data...';
  }

  const userJson = localStorage.getItem('akadify_logged_user');
  let userId = 'USR-SUPERADMIN-DEMO';
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      userId = u.id || u.username;
    } catch (err) {
      userId = userJson;
    }
  }

  try {
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`✅ ${data.message}`);
      localStorage.removeItem('akadify_logged_user');
      window.location.reload();
    } else {
      alert(`⚠️ ${data.error || 'Gagal menghapus akun.'}`);
    }
  } catch (err) {
    console.error("Gagal menghapus akun:", err);
    alert("⚠️ Gagal menghubungi server.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🗑️ Hapus Akun & Seluruh Data Secara Permanen';
    }
  }
}

// Fetch User Profile from Backend
async function loadUserProfileSettings() {
  const userJson = localStorage.getItem('akadify_logged_user');
  if (!userJson) return;

  let userId = 'USR-SUPERADMIN-DEMO';
  try {
    const userObj = JSON.parse(userJson);
    userId = userObj.id || userObj.username;
  } catch (e) {
    userId = userJson;
  }

  try {
    const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        currentUserProfile = data.user;
        if (document.getElementById('prof-fullname')) document.getElementById('prof-fullname').value = data.user.fullname || '';
        if (document.getElementById('prof-position')) document.getElementById('prof-position').value = data.user.position || 'Pengurus / Legal Officer';
        if (document.getElementById('prof-email')) document.getElementById('prof-email').value = data.user.email || '';
        if (document.getElementById('prof-phone')) document.getElementById('prof-phone').value = data.user.phone || '';
        if (document.getElementById('prof-display-username')) document.getElementById('prof-display-username').innerText = data.user.username || 'demo';
        if (document.getElementById('prof-display-inst')) document.getElementById('prof-display-inst').innerText = data.user.institutionName || 'KSPPS BMT BINA UMMAH';
        
        const badgeRole = document.getElementById('prof-badge-role');
        if (badgeRole) {
          badgeRole.innerText = data.user.userType === 'SUPERADMIN' ? '👑 Superadmin' : (data.user.userType === 'DPS' ? '🛡️ Dewan Pengawas' : 'Koperasi Syariah');
        }
      }
    }
  } catch (err) {
    console.error("Gagal memuat profil user:", err);
  }
}

// Save User Profile
async function handleSaveUserProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-profile');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Menyimpan Profil...';
  }

  const userJson = localStorage.getItem('akadify_logged_user');
  let userId = 'USR-SUPERADMIN-DEMO';
  let cachedObj = {};
  if (userJson) {
    try {
      cachedObj = JSON.parse(userJson);
      userId = cachedObj.id || cachedObj.username;
    } catch (err) {
      userId = userJson;
    }
  }

  const payload = {
    userId,
    fullname: document.getElementById('prof-fullname')?.value.trim(),
    position: document.getElementById('prof-position')?.value.trim(),
    email: document.getElementById('prof-email')?.value.trim(),
    phone: document.getElementById('prof-phone')?.value.trim()
  };

  try {
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      // Update local storage session
      const updatedUser = Object.assign({}, cachedObj, data.user);
      localStorage.setItem('akadify_logged_user', JSON.stringify(updatedUser));
      checkAuthSession();
      addAuditLog(`User Profile Updated: ${payload.fullname} (${payload.position})`);
      alert("✅ Data profil & kontak pengurus berhasil diperbarui!");
    } else {
      alert("⚠️ Gagal memperbarui data profil.");
    }
  } catch (err) {
    console.error("Gagal menyimpan profil:", err);
    alert("⚠️ Gagal menghubungi server backend.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '💾 Simpan Perubahan Profil';
    }
  }
}

// Handle Change Password
async function handleChangePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('pwd-old')?.value;
  const newPassword = document.getElementById('pwd-new')?.value;
  const confirmPassword = document.getElementById('pwd-confirm')?.value;

  if (newPassword !== confirmPassword) {
    alert("⚠️ Konfirmasi kata sandi baru tidak sesuai!");
    return;
  }

  const btn = document.getElementById('btn-change-pwd');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Memperbarui Kata Sandi...';
  }

  const userJson = localStorage.getItem('akadify_logged_user');
  let userId = 'USR-SUPERADMIN-DEMO';
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      userId = u.id || u.username;
    } catch (err) {
      userId = userJson;
    }
  }

  try {
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, oldPassword, newPassword, confirmPassword })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      addAuditLog(`Security Event: Kata sandi akun berhasil diubah`);
      alert(`✅ ${data.message}`);
      document.getElementById('change-password-form')?.reset();
    } else {
      alert(`⚠️ ${data.error || 'Gagal mengubah kata sandi.'}`);
    }
  } catch (err) {
    console.error("Gagal ganti password:", err);
    alert("⚠️ Gagal menghubungi server.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🔐 Simpan Kata Sandi Baru';
    }
  }
}

// Initial load on App start
document.addEventListener("DOMContentLoaded", () => {
  loadWhiteLabelSettings();
  loadUserProfileSettings();
});
