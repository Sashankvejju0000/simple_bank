const API_URL = "http://localhost:3008/api";

// 1. JWT Parser Utility
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// 2. Global State Variables
let currentAuthTab = 'cust-login';
let currentAdminTab = 'customers';
let token = localStorage.getItem("infinity_token") || null;
let user = token ? parseJwt(token) : null;

// 3. UI Navigation Logic
function init() {
    // Wire up global logout button
    document.getElementById("btn-global-logout").addEventListener("click", handleLogout);
    
    if (token && user) {
        // Token exists, check role and route to dashboard
        document.getElementById("header-user-info").classList.remove("hidden");
        document.getElementById("header-user-display").innerText = `Logged in as: ${user.email} (${user.role})`;
        
        if (user.role === 'Admin') {
            showView('view-admin');
            switchAdminTab('customers');
        } else {
            showView('view-customer');
            fetchCustomerData();
        }
    } else {
        // No token, route to Auth Portal
        document.getElementById("header-user-info").classList.add("hidden");
        showView('view-auth');
        switchAuthTab('cust-login');
    }
}

function showView(viewId) {
    ['view-auth', 'view-customer', 'view-admin'].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });
    document.getElementById(viewId).classList.remove("hidden");
}

// 4. Auth Tabs and Forms Swapping
function switchAuthTab(tabName) {
    currentAuthTab = tabName;
    ['tab-cust-login', 'tab-admin-login', 'tab-register'].forEach(id => {
        document.getElementById(id).classList.remove("active");
    });
    ['form-cust-login', 'form-admin-login', 'form-register'].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });

    if (tabName === 'cust-login') {
        document.getElementById('tab-cust-login').classList.add('active');
        document.getElementById('form-cust-login').classList.remove('hidden');
    } else if (tabName === 'admin-login') {
        document.getElementById('tab-admin-login').classList.add('active');
        document.getElementById('form-admin-login').classList.remove('hidden');
    } else if (tabName === 'register') {
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('form-register').classList.remove('hidden');
    }
}

// 5. Admin Tabs Swapping
function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    ['tab-adm-customers', 'tab-adm-accounts', 'tab-adm-audit'].forEach(id => {
        document.getElementById(id).classList.remove("active");
    });
    ['admin-panel-customers', 'admin-panel-accounts', 'admin-panel-audit'].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });

    if (tabName === 'customers') {
        document.getElementById('tab-adm-customers').classList.add('active');
        document.getElementById('admin-panel-customers').classList.remove('hidden');
        fetchAdminCustomers();
    } else if (tabName === 'accounts') {
        document.getElementById('tab-adm-accounts').classList.add('active');
        document.getElementById('admin-panel-accounts').classList.remove('hidden');
        fetchAdminAccounts();
    } else if (tabName === 'audit') {
        document.getElementById('tab-adm-audit').classList.add('active');
        document.getElementById('admin-panel-audit').classList.remove('hidden');
        fetchAuditLogs();
    }
}

// 6. Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// 7. Modals Helper
function openModal(modalId) {
    document.getElementById("modal-overlay").classList.add("active");
    document.getElementById(modalId).classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal-overlay").classList.remove("active");
    const modals = document.querySelectorAll(".modal-card");
    modals.forEach(m => m.classList.add("hidden"));
}

// 8. Auth API Request Handlers
async function handleCustomerLogin(e) {
    e.preventDefault();
    const email = document.getElementById("cust-email").value;
    const password = document.getElementById("cust-password").value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            token = result.data.token;
            user = parseJwt(token);
            localStorage.setItem("infinity_token", token);
            showToast("Login Successful!");
            init();
        } else {
            showToast(result.message || "Invalid credentials", "error");
        }
    } catch (err) {
        showToast("Server Connection Failed", "error");
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            token = result.data.token;
            user = parseJwt(token);
            if (user.role !== 'Admin') {
                showToast("Access Denied: Not an Administrator", "error");
                handleLogout();
                return;
            }
            localStorage.setItem("infinity_token", token);
            showToast("Admin Authenticated!");
            init();
        } else {
            showToast(result.message || "Invalid admin credentials", "error");
        }
    } catch (err) {
        showToast("Server Connection Failed", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const Mobile_No = document.getElementById("reg-phone").value;
    const address = document.getElementById("reg-address").value;
    const password = document.getElementById("reg-password").value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, Mobile_No, address })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Registration Successful! Please Login.");
            switchAuthTab('cust-login');
            // Populate customer login email
            document.getElementById("cust-email").value = email;
            // Clear register form
            document.getElementById("form-register").reset();
        } else {
            showToast(result.message || "Registration failed", "error");
        }
    } catch (err) {
        showToast("Server Connection Failed", "error");
    }
}

function handleLogout() {
    token = null;
    user = null;
    localStorage.removeItem("infinity_token");
    showToast("Logged out successfully");
    init();
}

// 9. Customer Data Flow & UI Rendering
async function fetchCustomerData() {
    if (!token || !user || !user.cust_id) return;
    
    // Fetch Customer Profile
    try {
        const resProfile = await fetch(`${API_URL}/customers/${user.cust_id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const profileData = await resProfile.json();
        
        if (resProfile.ok && profileData.success) {
            const customer = profileData.data;
            document.getElementById("cust-profile-name").innerText = customer.Name;
            document.getElementById("cust-avatar-char").innerText = customer.Name.charAt(0).toUpperCase();
            document.getElementById("cust-profile-id").innerText = customer.Custid;
            document.getElementById("cust-profile-email").innerText = customer.Email || "No Email";
            document.getElementById("cust-profile-mobile").innerText = customer.Mobile_No;
            document.getElementById("cust-profile-address").innerText = customer.Address;
        }
    } catch (err) {
        showToast("Error loading profile data", "error");
    }

    // Fetch Accounts
    try {
        const resAccounts = await fetch(`${API_URL}/accounts/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const accountsData = await resAccounts.json();
        
        if (resAccounts.ok && accountsData.success) {
            renderCustomerAccounts(accountsData.data);
        }
    } catch (err) {
        showToast("Error loading account balances", "error");
    }
}

function renderCustomerAccounts(accounts) {
    const container = document.getElementById("cust-accounts-container");
    container.innerHTML = "";
    
    const depositSelect = document.getElementById("tx-deposit-account");
    const withdrawSelect = document.getElementById("tx-withdraw-account");
    const transferSelect = document.getElementById("tx-transfer-source");
    
    depositSelect.innerHTML = "";
    withdrawSelect.innerHTML = "";
    transferSelect.innerHTML = "";

    if (accounts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;" class="text-muted">
                No active bank accounts found. Click "+ New Account" to open one!
            </div>
        `;
        return;
    }

    accounts.forEach(acc => {
        // Render Card
        const badgeClass = acc.Acc_Type.toLowerCase() === 'savings' ? 'savings' : 'checking';
        const card = document.createElement("div");
        card.className = "account-card";
        card.innerHTML = `
            <span class="acc-badge ${badgeClass}">${acc.Acc_Type}</span>
            <div class="acc-no">${acc.Account_No}</div>
            <div class="acc-balance">$${parseFloat(acc.Balance).toFixed(2)}</div>
        `;
        container.appendChild(card);

        // Render selectors option
        const opt = document.createElement("option");
        opt.value = acc.Account_No;
        opt.innerText = `${acc.Account_No} (${acc.Acc_Type} - $${parseFloat(acc.Balance).toFixed(2)})`;
        
        depositSelect.appendChild(opt.cloneNode(true));
        withdrawSelect.appendChild(opt.cloneNode(true));
        transferSelect.appendChild(opt.cloneNode(true));
    });
}

// 10. Transaction Operations (Customer Dashboard)
async function handleDeposit(e) {
    e.preventDefault();
    const Account_No = document.getElementById("tx-deposit-account").value;
    const amount = parseFloat(document.getElementById("tx-deposit-amount").value);

    try {
        const response = await fetch(`${API_URL}/accounts/deposit`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ accountNo: Account_No, amount })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(`Deposit processed successfully! New Balance: $${parseFloat(result.data.newBalance).toFixed(2)}`);
            document.getElementById("tx-deposit-amount").value = "";
            fetchCustomerData();
        } else {
            showToast(result.message || "Deposit failed", "error");
        }
    } catch (err) {
        showToast("Deposit transaction failed", "error");
    }
}

async function handleWithdraw(e) {
    e.preventDefault();
    const Account_No = document.getElementById("tx-withdraw-account").value;
    const amount = parseFloat(document.getElementById("tx-withdraw-amount").value);

    try {
        const response = await fetch(`${API_URL}/accounts/withdraw`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ accountNo: Account_No, amount })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(`Withdrawal successful! New Balance: $${parseFloat(result.data.newBalance).toFixed(2)}`);
            document.getElementById("tx-withdraw-amount").value = "";
            fetchCustomerData();
        } else {
            showToast(result.message || "Withdrawal failed", "error");
        }
    } catch (err) {
        showToast("Withdrawal transaction failed", "error");
    }
}

async function handleTransfer(e) {
    e.preventDefault();
    const sourceAccountNo = document.getElementById("tx-transfer-source").value;
    const destinationAccountNo = document.getElementById("tx-transfer-dest").value;
    const amount = parseFloat(document.getElementById("tx-transfer-amount").value);

    try {
        const response = await fetch(`${API_URL}/accounts/transfer`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ fromAccount: sourceAccountNo, toAccount: destinationAccountNo, amount })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(`Transfer of $${amount.toFixed(2)} successfully sent to ${destinationAccountNo}!`);
            document.getElementById("tx-transfer-dest").value = "";
            document.getElementById("tx-transfer-amount").value = "";
            fetchCustomerData();
        } else {
            showToast(result.message || "Transfer failed", "error");
        }
    } catch (err) {
        showToast("Fund transfer failed", "error");
    }
}

function openCreateAccountModal() {
    openModal("modal-create-account");
    document.getElementById("modal-acc-no").value = "A" + Math.floor(1000 + Math.random() * 9000);
    document.getElementById("modal-acc-balance").value = "0.00";
}

async function handleCreateAccount(e) {
    e.preventDefault();
    const Account_No = document.getElementById("modal-acc-no").value;
    const Acc_Type = document.getElementById("modal-acc-type").value;
    const Balance = parseFloat(document.getElementById("modal-acc-balance").value);
    const Custid = user.cust_id;

    try {
        const response = await fetch(`${API_URL}/accounts/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ Account_No, Acc_Type, Balance, Custid })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Bank account successfully created!");
            closeModal();
            fetchCustomerData();
        } else {
            showToast(result.message || "Account creation failed", "error");
        }
    } catch (err) {
        showToast("Account creation failed", "error");
    }
}

// 11. Admin Panel Data Operations
async function fetchAdminCustomers() {
    try {
        const response = await fetch(`${API_URL}/customers/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            renderAdminCustomers(result.data);
        } else {
            showToast(result.message || "Failed to load customers", "error");
        }
    } catch (err) {
        showToast("Connection to admin server failed", "error");
    }
}

function renderAdminCustomers(customers) {
    const tbody = document.getElementById("table-admin-customers");
    tbody.innerHTML = "";
    
    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No customers registered in database</td></tr>`;
        return;
    }

    customers.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-success" style="font-weight: 500;">${c.Custid}</td>
            <td>${c.Name}</td>
            <td>${c.Mobile_No}</td>
            <td>${c.Address}</td>
            <td>${c.Email || '<span class="text-muted">None</span>'}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="openUpdateCustomerModal('${c.Custid}', '${c.Name.replace(/'/g, "\\'")}', '${c.Mobile_No}', '${c.Address.replace(/'/g, "\\'")}', '${c.Email || ''}')">✏️</button>
                <button class="btn-icon btn-delete" onclick="handleDeleteCustomer('${c.Custid}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateCustomerModal() {
    openModal("modal-create-customer");
    document.getElementById("modal-cust-name").value = "";
    document.getElementById("modal-cust-mobile").value = "";
    document.getElementById("modal-cust-address").value = "";
    document.getElementById("modal-cust-email").value = "";
}

async function handleCreateCustomer(e) {
    e.preventDefault();
    const Name = document.getElementById("modal-cust-name").value;
    const Mobile_No = document.getElementById("modal-cust-mobile").value;
    const Address = document.getElementById("modal-cust-address").value;
    const Email = document.getElementById("modal-cust-email").value;

    try {
        const response = await fetch(`${API_URL}/customers/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ Name, Mobile_No, Address, Email })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Customer profile successfully added!");
            closeModal();
            fetchAdminCustomers();
        } else {
            showToast(result.message || "Failed to add customer", "error");
        }
    } catch (err) {
        showToast("Error connecting to create endpoint", "error");
    }
}

function openUpdateCustomerModal(id, name, mobile, address, email) {
    openModal("modal-update-customer");
    document.getElementById("modal-edit-cust-id").value = id;
    document.getElementById("modal-edit-cust-name").value = name;
    document.getElementById("modal-edit-cust-mobile").value = mobile;
    document.getElementById("modal-edit-cust-address").value = address;
    document.getElementById("modal-edit-cust-email").value = email;
}

async function handleUpdateCustomer(e) {
    e.preventDefault();
    const id = document.getElementById("modal-edit-cust-id").value;
    const Name = document.getElementById("modal-edit-cust-name").value;
    const Mobile_No = document.getElementById("modal-edit-cust-mobile").value;
    const Address = document.getElementById("modal-edit-cust-address").value;
    const Email = document.getElementById("modal-edit-cust-email").value;

    try {
        const response = await fetch(`${API_URL}/customers/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ Name, Mobile_No, Address, Email })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Customer profile updated successfully!");
            closeModal();
            fetchAdminCustomers();
        } else {
            showToast(result.message || "Failed to update profile", "error");
        }
    } catch (err) {
        showToast("Update failed", "error");
    }
}

async function handleDeleteCustomer(id) {
    if (!confirm(`Are you sure you want to permanently delete customer profile ${id}? This deletes all their linked accounts.`)) return;

    try {
        const response = await fetch(`${API_URL}/customers/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(`Customer ${id} profile successfully deleted.`);
            fetchAdminCustomers();
        } else {
            showToast(result.message || "Delete failed", "error");
        }
    } catch (err) {
        showToast("Connection failure on delete", "error");
    }
}

// 12. Admin Manage Accounts Flow
async function fetchAdminAccounts() {
    try {
        const response = await fetch(`${API_URL}/accounts/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            renderAdminAccounts(result.data);
        } else {
            showToast(result.message || "Failed to load accounts", "error");
        }
    } catch (err) {
        showToast("Connection to admin server failed", "error");
    }
}

function renderAdminAccounts(accounts) {
    const tbody = document.getElementById("table-admin-accounts");
    tbody.innerHTML = "";
    
    if (accounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No accounts currently active</td></tr>`;
        return;
    }

    accounts.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 500; font-family: monospace;">${a.Account_No}</td>
            <td><span class="acc-badge ${a.Acc_Type.toLowerCase()}">${a.Acc_Type}</span></td>
            <td>$${parseFloat(a.Balance).toFixed(2)}</td>
            <td class="text-success">${a.Custid}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="openUpdateAccountModal('${a.Account_No}', '${a.Acc_Type}', '${a.Balance}')">✏️</button>
                <button class="btn-icon btn-delete" onclick="handleDeleteAccount('${a.Account_No}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateAccountModalAdmin() {
    openModal("modal-create-account-admin");
    document.getElementById("modal-acc-custid-admin").value = "";
    document.getElementById("modal-acc-no-admin").value = "A" + Math.floor(1000 + Math.random() * 9000);
    document.getElementById("modal-acc-balance-admin").value = "0.00";
}

async function handleCreateAccountAdmin(e) {
    e.preventDefault();
    const Custid = document.getElementById("modal-acc-custid-admin").value;
    const Account_No = document.getElementById("modal-acc-no-admin").value;
    const Acc_Type = document.getElementById("modal-acc-type-admin").value;
    const Balance = parseFloat(document.getElementById("modal-acc-balance-admin").value);

    try {
        const response = await fetch(`${API_URL}/accounts/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ Account_No, Acc_Type, Balance, Custid })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Customer bank account successfully opened!");
            closeModal();
            fetchAdminAccounts();
        } else {
            showToast(result.message || "Failed to open account", "error");
        }
    } catch (err) {
        showToast("Connection to server failed", "error");
    }
}

function openUpdateAccountModal(accNo, accType, balance) {
    openModal("modal-update-account");
    document.getElementById("modal-edit-acc-no").value = accNo;
    document.getElementById("modal-edit-acc-type").value = accType;
    document.getElementById("modal-edit-acc-balance").value = balance;
}

async function handleUpdateAccount(e) {
    e.preventDefault();
    const accNo = document.getElementById("modal-edit-acc-no").value;
    const Acc_Type = document.getElementById("modal-edit-acc-type").value;
    const Balance = parseFloat(document.getElementById("modal-edit-acc-balance").value);

    try {
        const response = await fetch(`${API_URL}/accounts/${accNo}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ Acc_Type, Balance })
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast("Bank account details updated successfully!");
            closeModal();
            fetchAdminAccounts();
        } else {
            showToast(result.message || "Failed to update account", "error");
        }
    } catch (err) {
        showToast("Update failed", "error");
    }
}

async function handleDeleteAccount(accNo) {
    if (!confirm(`Are you sure you want to permanently delete account ${accNo}?`)) return;

    try {
        const response = await fetch(`${API_URL}/accounts/${accNo}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(`Account ${accNo} successfully closed and deleted.`);
            fetchAdminAccounts();
        } else {
            showToast(result.message || "Closure failed", "error");
        }
    } catch (err) {
        showToast("Connection failure on delete", "error");
    }
}

// 13. Admin Audit Log Fetching & UI Rendering
async function fetchAuditLogs() {
    try {
        const response = await fetch(`${API_URL}/accounts/audit-logs/all`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success) {
            renderAuditLogs(result.data);
        } else {
            showToast(result.message || "Failed to load audit logs", "error");
        }
    } catch (err) {
        showToast("Connection failure fetching logs", "error");
    }
}

function renderAuditLogs(logs) {
    const tbody = document.getElementById("table-admin-audit");
    tbody.innerHTML = "";
    
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No audit balance update records found</td></tr>`;
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement("tr");
        
        // Formatting timestamp
        let formattedDate = log.Change_Date;
        try {
            formattedDate = new Date(log.Change_Date).toLocaleString();
        } catch (e) {}

        const diff = parseFloat(log.New_Balance) - parseFloat(log.Old_Balance);
        const diffClass = diff >= 0 ? 'text-success' : 'text-accent';
        const diffSign = diff >= 0 ? '+' : '';

        tr.innerHTML = `
            <td>${log.Audit_ID}</td>
            <td style="font-weight: 500; font-family: monospace;">${log.Account_No}</td>
            <td>$${parseFloat(log.Old_Balance).toFixed(2)}</td>
            <td>$${parseFloat(log.New_Balance).toFixed(2)}</td>
            <td>
                <span style="font-size: 0.85rem;" class="${diffClass}">
                    (${diffSign}$${diff.toFixed(2)})
                </span>
                <span style="margin-left: 10px; font-size: 0.85rem;" class="text-muted">${formattedDate}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 14. Initialize App On Load
window.addEventListener("DOMContentLoaded", init);
