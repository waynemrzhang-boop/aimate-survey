/**
 * Firebase SDK 初始化與設定
 */

const firebaseConfig = {
    projectId: "aimate-survey",
    appId: "1:833230706388:web:5eb728079a384554908d41",
    storageBucket: "aimate-survey.firebasestorage.app",
    apiKey: "AIzaSyAaOr9A64Wo3TvM3qTM3ptP2kM16DbdJ-4",
    authDomain: "aimate-survey.firebaseapp.com",
    messagingSenderId: "833230706388",
    measurementId: "G-04QC45ZRWK",
    projectNumber: "833230706388"
};

// 安全初始化檢查
if (firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        window.dbInstance = firebase.firestore();
        console.log("🔥 Firebase 雲端資料庫初始化成功！數據將實時上傳。");
    } catch (e) {
        console.error("❌ Firebase 初始化失敗，改為 LocalStorage 本地儲存模式：", e);
    }
} else {
    console.warn("💡 未偵測到 Firebase Web SDK 金鑰。問卷目前以 LocalStorage 本地儲存模式運行。");
}
