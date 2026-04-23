const LIFF_ID = "2009827198-EiWGvF0N"; 
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec";

// 画面のテキストを更新する関数
function updateStatus(text) {
  document.getElementById("status-text").innerText = text;
}

// エラーを表示する関数（LINEアプリ内でのデバッグ用）
function showError(text) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("status-text").innerText = "エラーが発生しました";
  document.getElementById("error-message").innerText = text;
}

// ★ ページの読み込みが完了した時の処理（ここにすべてまとめました）
window.onload = async function() {
  try {
    // 1. 画面が開いた瞬間にLIFFの初期化だけ済ませておく
    await liff.init({ liffId: LIFF_ID });

    // 未ログインの場合はログインを促す
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 2. 「出勤する」ボタンが押された時の処理を設定
    document.getElementById("clock-in-btn").addEventListener("click", function() {
      if (navigator.geolocation) {
        // 初期画面（ボタン）を隠して、ローディング画面（ぐるぐる）を出す
        document.getElementById("initial-view").style.display = "none";
        document.getElementById("spinner").style.display = "block";
        
        // ここで初めて打刻処理（main関数）をスタート！
        main(); 
      } else {
        showError("この端末では位置情報がサポートされていません。");
      }
    });
  } catch (error) {
    showError("LIFFの読み込みに失敗しました。");
    console.error(error);
  }
};

// メインの打刻処理
async function main() {
  try {
    // ※初期化は上で終わっているので、すぐユーザー情報の取得へ
    updateStatus("ユーザー情報を取得中...");
    const profile = await liff.getProfile();
    const userId = profile.userId;

    // 位置情報の取得
    updateStatus("位置情報を取得中...");
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, // より正確な位置を要求
        timeout: 10000,           // 10秒でタイムアウト
        maximumAge: 0
      });
    });

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    // 現在日時の取得（日本時間の YYYY-MM-DD HH:mm 形式に変換）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

    // 送信するデータの組み立て
    const payload = {
      userId: userId,
      timestamp: timestamp,
      location: `${longitude},${latitude}`, // 「経度」を先にする
      action: "clock_in"
    };

    // GASへデータ送信
    updateStatus("データを送信中...");
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain" // GASのCORSエラー回避のため text/plain
      },
      body: JSON.stringify(payload),
      redirect: "follow" // GASのリダイレクト仕様に対応
    });

    if (!response.ok) {
      throw new Error(`送信失敗: ステータスコード ${response.status}`);
    }

    // 成功したらLIFFを閉じる
    document.getElementById("spinner").style.display = "none";
    updateStatus("打刻完了！");
    setTimeout(() => {
      liff.closeWindow();
    }, 500);

  } catch (error) {
    console.error("Error:", error);
    
    // 位置情報ブロック時のエラーハンドリング
    if (error.code === 1) {
      showError("位置情報の取得が許可されていません。スマホの設定からLINEへの位置情報アクセスを許可してください。");
    } else {
      // 通信エラーなどの詳細を画面に出す
      showError(error.message || "予期せぬ通信エラーが発生しました。");
    }
  }
}