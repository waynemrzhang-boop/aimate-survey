/**
 * AImate 問卷控制核心邏輯
 */

// 狀態管理
let state = {
    role: null,          // 'parent' | 'student'
    currentStep: 0,      // 當前題號索引
    questions: [],       // 當前題目陣列
    answers: {}          // 保存的答案 { q1: '...', q2: [...] }
};

// 初始化首頁靜態文字內容
function initLandingPageText() {
    if (window.SURVEY_LANDING_DATA) {
        const data = window.SURVEY_LANDING_DATA;
        const welcomeCard = document.querySelector('#role-selection .welcome-card');
        if (welcomeCard) {
            const badge = welcomeCard.querySelector('.badge');
            const h1 = welcomeCard.querySelector('h1');
            const subtitle = welcomeCard.querySelector('.subtitle');
            
            if (badge) badge.innerText = data.badge;
            if (h1) h1.innerHTML = data.title;
            if (subtitle) subtitle.innerText = data.subtitle;
        }
        
        const btnParent = document.querySelector('.btn-parent');
        if (btnParent) {
            const title = btnParent.querySelector('.role-title');
            const desc = btnParent.querySelector('.role-desc');
            if (title) title.innerText = data.roles.parent.title;
            if (desc) desc.innerText = data.roles.parent.desc;
        }
        
        const btnStudent = document.querySelector('.btn-student');
        if (btnStudent) {
            const title = btnStudent.querySelector('.role-title');
            const desc = btnStudent.querySelector('.role-desc');
            if (title) title.innerText = data.roles.student.title;
            if (desc) desc.innerText = data.roles.student.desc;
        }
    }
}

// 進入頁面初始化
document.addEventListener('DOMContentLoaded', () => {
    // 從資料檔載入首頁文字
    initLandingPageText();
    
    // 檢測管理員模式
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        enterDashboard();
    }
    
    // 點擊 Logo / 隱藏按鍵進入 Dashboard
    let clickCount = 0;
    const trigger = document.getElementById('admin-trigger');
    trigger.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 3) {
            enterDashboard();
            clickCount = 0;
        } else {
            // 提示一下快解鎖了
            console.log(`點擊 ${3 - clickCount} 次進入後台`);
        }
    });
});

// 選擇角色並初始化問卷
function selectRole(role) {
    state.role = role;
    state.questions = window.SURVEY_QUESTIONS[role];
    state.currentStep = 0;
    state.answers = {};
    
    // 更換主題樣式
    document.body.className = `theme-${role}`;
    
    // 切換視圖
    switchView('role-selection', 'survey-section');
    
    // 渲染第一題
    renderQuestion();
}

// 切換主頁面視圖
function switchView(fromId, toId) {
    const fromView = document.getElementById(fromId);
    const toView = document.getElementById(toId);
    
    fromView.classList.remove('active');
    setTimeout(() => {
        fromView.style.display = 'none';
        toView.style.display = 'block';
        setTimeout(() => {
            toView.classList.add('active');
        }, 50);
    }, 400);
}

// 渲染當前題目
function renderQuestion() {
    const q = state.questions[state.currentStep];
    const viewport = document.getElementById('cards-viewport');
    
    // 更新進度條
    const progressPercent = ((state.currentStep) / state.questions.length) * 100;
    document.getElementById('survey-progress').style.width = `${progressPercent}%`;
    document.getElementById('current-question-num').innerText = state.currentStep + 1;
    document.getElementById('total-questions-num').innerText = state.questions.length;
    
    // 更新按鈕文字
    const isLast = state.currentStep === state.questions.length - 1;
    document.getElementById('btn-next').innerText = isLast ? '提交問卷' : '下一題';
    document.getElementById('btn-prev').disabled = state.currentStep === 0;

    // 建立新卡片 DOM
    const card = document.createElement('div');
    card.className = 'survey-card active slide-in-right';
    
    let html = '';
    
    // 如果是第一題，且設定了開頭語，將其以 intro 樣式顯示
    if (state.currentStep === 0 && window.SURVEY_WELCOME_TEXTS && window.SURVEY_WELCOME_TEXTS[state.role]) {
        html += `<div class="card-intro-text">${window.SURVEY_WELCOME_TEXTS[state.role]}</div>`;
    }
    
    // 如果有揭露說明（如 Q5）
    if (q.intro) {
        html += `<div class="card-intro-text">${q.intro}</div>`;
    }
    
    // 題目名稱
    html += `<h2 class="question-title">${q.title}<span class="question-type-badge">${q.badge}</span></h2>`;
    
    // 依題型渲染選項
    if (q.type === 'single') {
        html += `<div class="options-list">`;
        q.options.forEach((opt, idx) => {
            const isSelected = state.answers[q.id] === opt;
            html += `
                <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectSingleOption('${q.id}', '${opt}')">
                    <input type="radio" name="${q.id}" value="${opt}" ${isSelected ? 'checked' : ''}>
                    <span class="option-text">${opt}</span>
                </div>
            `;
        });
        html += `</div>`;
    } 
    else if (q.type === 'multiple') {
        html += `<div class="options-list">`;
        const currentAns = state.answers[q.id] || [];
        q.options.forEach((opt) => {
            const isSelected = currentAns.includes(opt);
            html += `
                <div class="option-item ${isSelected ? 'selected' : ''}" onclick="toggleMultipleOption(this, '${q.id}', '${opt}')">
                    <input type="checkbox" name="${q.id}" value="${opt}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
                    <span class="option-text">${opt}</span>
                </div>
            `;
        });
        
        // 處理「其他」自訂輸入
        if (q.hasOther) {
            const otherVal = currentAns.find(ans => !q.options.includes(ans)) || '';
            const hasOtherSelected = otherVal !== '';
            html += `
                <div class="option-item ${hasOtherSelected ? 'selected' : ''}" id="other-item-${q.id}" onclick="focusOtherInput('${q.id}')">
                    <input type="checkbox" id="other-chk-${q.id}" ${hasOtherSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleOtherCheckbox(this, '${q.id}')">
                    <span class="option-text">其他：
                        <input type="text" id="other-input-${q.id}" class="input-text" style="display:inline-block; width: 70%; padding: 6px 12px; margin: 0;" placeholder="請在此輸入" value="${otherVal}" oninput="updateOtherInputValue('${q.id}')" onclick="event.stopPropagation()">
                    </span>
                </div>
            `;
        }
        html += `</div>`;
    } 
    else if (q.type === 'email_signup') {
        html += `<div class="options-list">`;
        const currentAns = state.answers[q.id] || '';
        const isEmailSelected = currentAns.startsWith('願意');
        const emailValue = isEmailSelected ? currentAns.replace('願意，我的 email 是：', '') : '';
        
        // 選項 1: 願意留下 Email
        html += `
            <div class="option-item ${isEmailSelected ? 'selected' : ''}" id="email-opt-yes" onclick="selectEmailOpt(true, '${q.id}')">
                <input type="radio" name="${q.id}" value="yes" ${isEmailSelected ? 'checked' : ''}>
                <span class="option-text">${q.options[0]}<br>
                    <input type="email" id="email-field" class="input-text mt-4" style="display:${isEmailSelected ? 'block' : 'none'}" placeholder="name@example.com" value="${emailValue}" oninput="updateEmailValue('${q.id}')" onclick="event.stopPropagation()">
                </span>
            </div>
        `;
        
        // 選項 2: 不用了
        const isNoSelected = currentAns === '不用了';
        html += `
            <div class="option-item ${isNoSelected ? 'selected' : ''}" id="email-opt-no" onclick="selectEmailOpt(false, '${q.id}')">
                <input type="radio" name="${q.id}" value="不用了" ${isNoSelected ? 'checked' : ''}>
                <span class="option-text">${q.options[1]}</span>
            </div>
        `;
        html += `</div>`;
    }
    else if (q.type === 'textarea') {
        const currentText = state.answers[q.id] || '';
        html += `
            <div class="input-text-wrapper">
                <textarea id="textarea-${q.id}" class="input-text textarea-text" placeholder="歡迎與我們分享您的想法..." oninput="updateTextareaValue('${q.id}')">${currentText}</textarea>
            </div>
        `;
    }
    
    card.innerHTML = html;
    
    // 清理舊卡片並渲染新卡片（帶有動畫）
    viewport.innerHTML = '';
    viewport.appendChild(card);
}

// 選擇單選
function selectSingleOption(qid, value) {
    state.answers[qid] = value;
    
    // 渲染選中樣式
    renderQuestion();
    
    // 星星特效觸發器
    const q = state.questions[state.currentStep];
    if (q.triggerEffect && q.triggerEffect(value)) {
        triggerStarsCelebration();
    }
    
    // 自動前往下一題 (給單選做快捷體驗)
    setTimeout(() => {
        // 如果還不是最後一題，且非分流題
        const filterTriggered = q.filter && q.filter(value);
        if (state.currentStep < state.questions.length - 1 && !filterTriggered) {
            nextQuestion();
        }
    }, 300);
}

// 切換多選複選
function toggleMultipleOption(elem, qid, value) {
    if (!state.answers[qid]) {
        state.answers[qid] = [];
    }
    const idx = state.answers[qid].indexOf(value);
    if (idx === -1) {
        state.answers[qid].push(value);
        elem.classList.add('selected');
        elem.querySelector('input').checked = true;
    } else {
        state.answers[qid].splice(idx, 1);
        elem.classList.remove('selected');
        elem.querySelector('input').checked = false;
    }
}

// 聚焦到其他輸入框並選取該項目
function focusOtherInput(qid) {
    const chk = document.getElementById(`other-chk-${qid}`);
    const input = document.getElementById(`other-input-${qid}`);
    const item = document.getElementById(`other-item-${qid}`);
    
    if (!state.answers[qid]) {
        state.answers[qid] = [];
    }
    
    chk.checked = true;
    item.classList.add('selected');
    input.focus();
    updateOtherInputValue(qid);
}

function toggleOtherCheckbox(chk, qid) {
    const item = document.getElementById(`other-item-${qid}`);
    const input = document.getElementById(`other-input-${qid}`);
    if (chk.checked) {
        item.classList.add('selected');
        input.focus();
        updateOtherInputValue(qid);
    } else {
        item.classList.remove('selected');
        // 從答案中移除自訂值
        if (state.answers[qid]) {
            state.answers[qid] = state.answers[qid].filter(ans => 
                state.questions[state.currentStep].options.includes(ans)
            );
        }
    }
}

function updateOtherInputValue(qid) {
    const input = document.getElementById(`other-input-${qid}`);
    const val = input.value.trim();
    
    if (!state.answers[qid]) {
        state.answers[qid] = [];
    }
    
    // 先移除之前可能留下來的自訂值
    const opts = state.questions[state.currentStep].options;
    state.answers[qid] = state.answers[qid].filter(ans => opts.includes(ans));
    
    if (val !== '') {
        state.answers[qid].push(val);
    }
}

// 電郵欄位選擇
function selectEmailOpt(isYes, qid) {
    const yesOpt = document.getElementById('email-opt-yes');
    const noOpt = document.getElementById('email-opt-no');
    const emailField = document.getElementById('email-field');
    
    if (isYes) {
        yesOpt.classList.add('selected');
        noOpt.classList.remove('selected');
        yesOpt.querySelector('input').checked = true;
        emailField.style.display = 'block';
        emailField.focus();
        updateEmailValue(qid);
    } else {
        noOpt.classList.add('selected');
        yesOpt.classList.remove('selected');
        noOpt.querySelector('input').checked = true;
        emailField.style.display = 'none';
        state.answers[qid] = '不用了';
    }
}

function updateEmailValue(qid) {
    const email = document.getElementById('email-field').value.trim();
    state.answers[qid] = `願意，我的 email 是：${email}`;
}

// 文字輸入
function updateTextareaValue(qid) {
    const text = document.getElementById(`textarea-${qid}`).value;
    state.answers[qid] = text;
}

// 上一題
function prevQuestion() {
    if (state.currentStep > 0) {
        const activeCard = document.querySelector('.survey-card');
        activeCard.className = 'survey-card active slide-out-right';
        
        setTimeout(() => {
            state.currentStep--;
            renderQuestion();
            const newCard = document.querySelector('.survey-card');
            newCard.className = 'survey-card active slide-in-left';
        }, 300);
    }
}

// 下一題 / 提交
function nextQuestion() {
    const q = state.questions[state.currentStep];
    const userAns = state.answers[q.id];
    
    // 背景/分流檢查：若為分流不通過項目，直接跳轉至結束頁
    if (q.filter && q.filter(userAns)) {
        submitSurvey();
        return;
    }

    // 檢查是否有選填要求 (此問卷除選填 Q8/學生 Q7 外，其他最好都要填，我們做柔軟提示)
    const isOptional = q.id === 'q8' || (state.role === 'student' && q.id === 'q7');
    if (!isOptional && (!userAns || (Array.isArray(userAns) && userAns.length === 0) || userAns === '願意，我的 email 是：')) {
        alert('請先填寫或選擇您的答案再繼續哦！');
        return;
    }
    
    if (state.currentStep < state.questions.length - 1) {
        const activeCard = document.querySelector('.survey-card');
        activeCard.className = 'survey-card active slide-out-left';
        
        setTimeout(() => {
            state.currentStep++;
            renderQuestion();
            const newCard = document.querySelector('.survey-card');
            newCard.className = 'survey-card active slide-in-right';
        }, 300);
    } else {
        submitSurvey();
    }
}

// 提交問卷
function submitSurvey() {
    // 儲存到本地資料庫
    if (window.aimateDB) {
        window.aimateDB.saveResponse({
            role: state.role,
            answers: state.answers
        });
    }
    
    // 更新進度條至 100%
    document.getElementById('survey-progress').style.width = `100%`;
    
    // 渲染結束卡片
    const viewport = document.getElementById('cards-viewport');
    const isStudent = state.role === 'student';
    
    viewport.innerHTML = `
        <div class="completion-card glass-card">
            <div class="completion-icon">${isStudent ? '✨🎓🎒' : '💙📝👏'}</div>
            <h2>問卷已提交！感謝您的協助</h2>
            <p class="subtitle" style="margin-bottom:24px;">您的寶貴回饋將成為我們設計 AImate App 數學輔導功能的重要憑據。</p>
            <div class="btn-group" style="justify-content:center;">
                <button class="btn btn-primary" onclick="restartSurvey()">填寫另一份</button>
                <button class="btn btn-secondary" onclick="enterDashboard()">查看數據後台</button>
            </div>
        </div>
    `;
    
    // 隱藏下方導航鈕
    document.querySelector('.survey-navigation').style.display = 'none';
}

// 重新開始
function restartSurvey() {
    state.role = null;
    state.currentStep = 0;
    state.answers = {};
    
    document.body.className = 'theme-landing';
    document.querySelector('.survey-navigation').style.display = 'flex';
    
    switchView('survey-section', 'role-selection');
}

// 學生版星星雨特效
function triggerStarsCelebration() {
    const container = document.getElementById('stars-container');
    const starCount = 35;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'falling-star';
        star.innerText = '⭐';
        
        // 隨機初始水平位置與大小
        star.style.left = `${Math.random() * 100}vw`;
        star.style.animationDelay = `${Math.random() * 0.8}s`;
        star.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
        star.style.fontSize = `${1 + Math.random() * 1.5}rem`;
        
        container.appendChild(star);
        
        // 動畫結束後刪除
        star.addEventListener('animationend', () => {
            star.remove();
        });
    }
}

// 進入後台
function enterDashboard() {
    // 隱藏目前運行的區段
    const activeSection = document.querySelector('.screen-view.active');
    if (activeSection) {
        activeSection.classList.remove('active');
        activeSection.style.display = 'none';
    }
    
    // 顯示 Dashboard
    const dbSection = document.getElementById('dashboard-section');
    dbSection.style.display = 'block';
    setTimeout(() => {
        dbSection.classList.add('active');
        if (window.aimateDashboard) {
            window.aimateDashboard.init();
        }
    }, 50);
}

// 離開後台
function exitDashboard() {
    const dbSection = document.getElementById('dashboard-section');
    dbSection.classList.remove('active');
    
    setTimeout(() => {
        dbSection.style.display = 'none';
        
        // 如果正在填寫中就回問卷，否則回首頁
        if (state.role) {
            const surveySec = document.getElementById('survey-section');
            surveySec.style.display = 'block';
            setTimeout(() => surveySec.classList.add('active'), 50);
        } else {
            const roleSec = document.getElementById('role-selection');
            roleSec.style.display = 'block';
            setTimeout(() => roleSec.classList.add('active'), 50);
        }
    }, 400);
}

// 按鈕綁定
function exportData(type) {
    if (window.aimateDB) {
        if (type === 'json') window.aimateDB.exportToJSON();
        else window.aimateDB.exportToCSV();
    }
}

function clearAllData() {
    if (confirm('確定要清空所有的問卷數據嗎？這將刪除包含模擬數據在內的所有紀錄。')) {
        if (window.aimateDB) {
            window.aimateDB.clearResponses();
        }
    }
}
