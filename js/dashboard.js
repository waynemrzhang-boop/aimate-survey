/**
 * AImate 問卷後台數據分析與視覺化繪製模組
 */

const dashboard = {
    init() {
        this.render();
        // 監聽數據庫更新事件（例如在清空數據或提交問卷後）
        window.removeEventListener('aimate-db-updated', this.handleUpdate);
        window.addEventListener('aimate-db-updated', () => this.render());
    },

    render() {
        const responses = window.aimateDB ? window.aimateDB.getResponses() : [];
        
        // 1. 基本數字概覽
        const total = responses.length;
        const parents = responses.filter(r => r.role === 'parent').length;
        const students = responses.filter(r => r.role === 'student').length;
        
        // 計算願意留 Email 試用的家長
        const emailsCount = responses.filter(r => {
            if (r.role !== 'parent') return false;
            const emailAns = r.answers.q7 || '';
            return emailAns.includes('@');
        }).length;

        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-parents').innerText = total > 0 ? `${Math.round((parents / total) * 100)}%` : '0%';
        document.getElementById('stat-students').innerText = total > 0 ? `${Math.round((students / total) * 100)}%` : '0%';
        document.getElementById('stat-emails').innerText = emailsCount;

        // 2. 渲染痛點統計條形圖 (家長 Q3 + 學生 Q3)
        this.renderPainPoints(responses);

        // 3. 渲染付費意願環形圖 (家長 Q6)
        this.renderPaymentPie(responses);

        // 4. 渲染學習花費條形圖 (家長 Q4)
        this.renderExpenses(responses);

        // 5. 填入潛在用戶試用名單 Email 表格
        this.renderEmailTable(responses);
    },

    // 渲染痛點條形圖
    renderPainPoints(responses) {
        const container = document.getElementById('chart-pain');
        container.innerHTML = '';

        if (responses.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">尚無數據</div>';
            return;
        }

        // 痛點計數器
        const painCounts = {};
        let totalCount = 0;

        responses.forEach(r => {
            const list = r.answers.q3 || [];
            list.forEach(pain => {
                // 如果是「其他」自訂輸入，做個標準分類
                let standardPain = pain;
                if (![
                    '我自己不會教／教不下去', '孩子不願意訂正', '我沒時間陪', 
                    '看解答也看不懂、孩子還是不會', '不知道孩子到底哪裡不懂', '沒什麼困擾',
                    '看解答還是看不懂', '懶得訂正', '沒有人可以問', '問了還是不太懂', '其實都還好'
                ].includes(pain)) {
                    standardPain = `其他: ${pain.slice(0, 15)}...`;
                }
                
                painCounts[standardPain] = (painCounts[standardPain] || 0) + 1;
                totalCount++;
            });
        });

        // 排序痛點
        const sortedPains = Object.entries(painCounts).sort((a, b) => b[1] - a[1]);

        if (sortedPains.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">尚無有效痛點反饋</div>';
            return;
        }

        sortedPains.forEach(([label, count]) => {
            const pct = Math.round((count / responses.length) * 100);
            const row = document.createElement('div');
            row.className = 'bar-row';
            row.innerHTML = `
                <div class="bar-label-group">
                    <span>${label}</span>
                    <span>${count} 票 (${pct}%)</span>
                </div>
                <div class="bar-wrapper">
                    <div class="bar-fill" style="width: ${pct}%"></div>
                </div>
            `;
            container.appendChild(row);
        });
    },

    // 渲染付費意願環形圖 (使用 CSS conic-gradient)
    renderPaymentPie(responses) {
        const container = document.getElementById('chart-payment');
        container.innerHTML = '';

        const parentResponses = responses.filter(r => r.role === 'parent');
        if (parentResponses.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">無家長填答數據</div>';
            return;
        }

        // 各個面額計數
        const paymentOptions = [
            '我不會付費（只用免費功能）',
            '每月 50 元以內',
            '每月 51–150 元',
            '每月 151–300 元',
            '每月 301–500 元',
            '每月 500 元以上'
        ];
        
        const counts = {};
        paymentOptions.forEach(opt => counts[opt] = 0);
        
        parentResponses.forEach(r => {
            const ans = r.answers.q6;
            if (counts[ans] !== undefined) {
                counts[ans]++;
            }
        });

        // 定義環形圖顏色
        const colors = ['#94a3b8', '#38bdf8', '#0ea5e9', '#0284c7', '#4f46e5', '#a855f7'];

        // 計算累加百分比用於 conic-gradient
        let currentPct = 0;
        const gradientParts = [];
        const legendItems = [];

        paymentOptions.forEach((opt, idx) => {
            const count = counts[opt];
            const pct = (count / parentResponses.length) * 100;
            
            if (pct > 0) {
                const nextPct = currentPct + pct;
                gradientParts.push(`${colors[idx]} ${currentPct}% ${nextPct}%`);
                currentPct = nextPct;
            }
            
            // 製作圖例資訊
            legendItems.push(`
                <div class="legend-item" style="display:flex; align-items:center; margin-bottom: 6px; font-size: 0.85rem;">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:${colors[idx]}; margin-right:8px;"></span>
                    <span style="flex:1; font-weight:500;">${opt}</span>
                    <span style="color:var(--text-secondary); font-family:var(--font-display); font-weight:600; margin-left: 10px;">${count} 票 (${Math.round(pct)}%)</span>
                </div>
            `);
        });

        const conicGradientStyle = gradientParts.length > 0 
            ? `conic-gradient(${gradientParts.join(', ')})`
            : '#e2e8f0';

        // 渲染圖表與圖例的左右結構
        container.innerHTML = `
            <div style="display:flex; align-items:center; width:100%; gap: 30px;">
                <div style="position:relative; width: 140px; height: 140px; border-radius: 50%; background: ${conicGradientStyle}; display:flex; align-items:center; justify-content:center; flex-shrink: 0;">
                    <!-- 中心白色圓圈，形成環狀效果 -->
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--card-bg); backdrop-filter: blur(16px);"></div>
                </div>
                <div style="flex: 1; display:flex; flex-direction:column;">
                    ${legendItems.join('')}
                </div>
            </div>
        `;
    },

    // 渲染課業花費分佈
    renderExpenses(responses) {
        const container = document.getElementById('chart-expenses');
        container.innerHTML = '';

        const parentResponses = responses.filter(r => r.role === 'parent');
        if (parentResponses.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">無家長填答數據</div>';
            return;
        }

        const expenseOptions = [
            '幾乎沒花費',
            '1,000 元以下',
            '1,000–3,000 元',
            '3,000–8,000 元',
            '8,000–15,000 元',
            '15,000 元以上'
        ];

        const counts = {};
        expenseOptions.forEach(opt => counts[opt] = 0);
        
        parentResponses.forEach(r => {
            const ans = r.answers.q4;
            if (counts[ans] !== undefined) {
                counts[ans]++;
            }
        });

        expenseOptions.forEach(opt => {
            const count = counts[opt];
            const pct = Math.round((count / parentResponses.length) * 100);
            
            const row = document.createElement('div');
            row.className = 'bar-row';
            row.innerHTML = `
                <div class="bar-label-group">
                    <span>${opt}</span>
                    <span>${count} 票 (${pct}%)</span>
                </div>
                <div class="bar-wrapper">
                    <div class="bar-fill" style="width: ${pct}%"></div>
                </div>
            `;
            container.appendChild(row);
        });
    },

    // 渲染用戶信承諾名單表格
    renderEmailTable(responses) {
        const tbody = document.getElementById('email-table-body');
        tbody.innerHTML = '';

        const signups = [];

        responses.forEach(r => {
            // 家長版願意留 email 的
            if (r.role === 'parent') {
                const emailAns = r.answers.q7 || '';
                if (emailAns.includes('@')) {
                    const email = emailAns.replace('願意，我的 email 是：', '');
                    signups.push({
                        role: '家長',
                        email: email,
                        needs: r.answers.q8 || '無特別補充需求'
                    });
                }
            }
            // 學生版我們可以在表格裡顯示他們最想解決的事 (學生版沒有 email，但有 Q7 期望)
            else if (r.role === 'student') {
                const wish = r.answers.q7 || '';
                if (wish.trim() !== '') {
                    signups.push({
                        role: '學生',
                        email: '學生版未收集 Email',
                        needs: wish
                    });
                }
            }
        });

        if (signups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary);">目前尚無人留下聯絡信箱或期望</td></tr>';
            return;
        }

        // 按有 Email 優先排序
        signups.sort((a, b) => {
            if (a.email.includes('@') && !b.email.includes('@')) return -1;
            if (!a.email.includes('@') && b.email.includes('@')) return 1;
            return 0;
        });

        signups.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600; color: ${item.role === '家長' ? '#0ea5e9' : '#a855f7'}">${item.role}</td>
                <td style="font-family:var(--font-display);">${item.email}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.needs}">${item.needs}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};

window.aimateDashboard = dashboard;
