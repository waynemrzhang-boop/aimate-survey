/**
 * AImate 問卷本地數據儲存與管理模組 (LocalStorage)
 */

const STORAGE_KEY = 'aimate_survey_responses';

// 初始模擬數據（如果本地沒有任何數據，自動寫入以利展示 Dashboard）
const MOCK_RESPONSES = [
    {
        role: 'parent',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        answers: {
            q1: '國二',
            q2: ['我或家人教', '孩子自己看解答訂正'],
            q3: ['我自己不會教／教不下去', '看解答也看不懂、孩子還是不會'],
            q4: '3,000–8,000 元',
            q5: '非常有興趣',
            q6: '每月 151–300 元',
            q7: '願意，我的 email 是：parent1@example.com',
            q8: '最困擾的是孩子常常因為看解答看不懂就放棄，希望能有工具引導他思考。'
        }
    },
    {
        role: 'parent',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        answers: {
            q1: '國一',
            q2: ['拿去問補習班／家教老師'],
            q3: ['我沒時間陪', '不知道孩子到底哪裡不懂'],
            q4: '8,000–15,000 元',
            q5: '有點興趣',
            q6: '每月 301–500 元',
            q7: '願意，我的 email 是：chang.parent@gmail.com',
            q8: '補習班老師沒辦法一對一照顧到所有錯題，回家問他又講到生氣。'
        }
    },
    {
        role: 'parent',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        answers: {
            q1: '國三',
            q2: ['孩子自己看解答訂正', '拍照上網查／問 AI'],
            q3: ['孩子不願意訂正', '看解答也看不懂、孩子還是不會'],
            q4: '1,000–3,000 元',
            q5: '非常有興趣',
            q6: '每月 151–300 元',
            q7: '願意，我的 email 是：test888@yahoo.com.tw',
            q8: '國三課業變難了，看解答也只是死背步驟，根本沒有懂觀念。'
        }
    },
    {
        role: 'parent',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        answers: {
            q1: '國二',
            q2: ['大多放著沒訂正'],
            q3: ['孩子不願意訂正', '我自己不會教／教不下去'],
            q4: '幾乎沒花費',
            q5: '非常感興趣',
            q6: '每月 51–150 元',
            q7: '不用了',
            q8: '希望能提升孩子的學習主動性。'
        }
    },
    {
        role: 'student',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
        answers: {
            q1: '國二',
            q2: ['自己看解答訂正', '問同學或家人'],
            q3: ['看解答還是看不懂', '懶得訂正'],
            q4: '很想用',
            q5: '會，蠻吸引我的',
            q6: '我會請爸媽幫我付',
            q7: '希望可以把題目講得更簡單一點，不要直接給算式。'
        }
    },
    {
        role: 'student',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        answers: {
            q1: '國三',
            q2: ['拍照查網路或問 AI', '問學校老師／補習班'],
            q3: ['問了還是不太懂', '沒有人可以問'],
            q4: '還行，可以試試',
            q5: '有一點',
            q6: '想用的話，我會用自己的零用錢付',
            q7: '想要有不同風格的 AI 老師，這樣寫題目比較不無聊。'
        }
    },
    {
        role: 'student',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        answers: {
            q1: '國一',
            q2: ['幾乎不會去訂正'],
            q3: ['懶得訂正', '看解答還是看不懂'],
            q4: '普通',
            q5: '沒差',
            q6: '要付費我大概就不用了',
            q7: '解答每次都跳步驟，我根本不知道怎麼從第二行變第三行。'
        }
    }
];

const db = {
    // 獲取所有填答
    getResponses() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            // 初始化模擬數據
            localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_RESPONSES));
            return MOCK_RESPONSES;
        }
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('解析本地數據失敗，已初始化為空陣列', e);
            return [];
        }
    },

    // 儲存新填答
    saveResponse(response) {
        const payload = {
            role: response.role,
            answers: response.answers,
            timestamp: new Date().toISOString()
        };

        // 1. 寫入本地 LocalStorage (保留作為備份，以及供本地 Dashboard 使用)
        const currentData = this.getResponses();
        currentData.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
        
        // 觸發 Dashboard 即時更新事件
        window.dispatchEvent(new Event('aimate-db-updated'));

        // 2. 實時寫入 Firebase Firestore (若已初始化)
        if (window.dbInstance) {
            window.dbInstance.collection('responses').add(payload)
                .then(() => {
                    console.log("🔥 數據已成功同步至 Firebase Firestore！");
                })
                .catch((error) => {
                    console.error("❌ 同步至 Firestore 時發生錯誤：", error);
                });
        }
    },

    // 清除所有數據
    clearResponses() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        window.dispatchEvent(new Event('aimate-db-updated'));
    },

    // 匯出為 JSON 檔案
    exportToJSON() {
        const data = this.getResponses();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AImate_survey_data_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 匯出為 CSV 檔案
    exportToCSV() {
        const data = this.getResponses();
        if (data.length === 0) {
            alert('目前尚無數據可匯出。');
            return;
        }

        // 定義 CSV 欄位
        const csvRows = [];
        const headers = ['時間戳記', '角色', 'Q1_年級分流', 'Q2_現況', 'Q3_痛點', 'Q4_月花費/產品意願', 'Q5_產品意願/星星機制', 'Q6_付費意願', 'Q7_信諾Email', 'Q8_最想解決問題'];
        csvRows.push(headers.join(','));

        for (const item of data) {
            const row = [
                item.timestamp,
                item.role === 'parent' ? '家長' : '學生',
                // 安全處理問卷答案
                this.escapeCSV(item.answers.q1 || ''),
                this.escapeCSV(Array.isArray(item.answers.q2) ? item.answers.q2.join('|') : item.answers.q2 || ''),
                this.escapeCSV(Array.isArray(item.answers.q3) ? item.answers.q3.join('|') : item.answers.q3 || ''),
                this.escapeCSV(item.answers.q4 || ''),
                this.escapeCSV(item.answers.q5 || ''),
                this.escapeCSV(item.answers.q6 || ''),
                this.escapeCSV(item.answers.q7 || ''),
                this.escapeCSV(item.answers.q8 || '')
            ];
            csvRows.push(row.map(val => `"${val}"`).join(','));
        }

        const csvContent = '\uFEFF' + csvRows.join('\n'); // 加上 BOM 防止 Excel 中文亂碼
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AImate_survey_data_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    escapeCSV(str) {
        if (!str) return '';
        return str.toString().replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
    }
};

window.aimateDB = db;
