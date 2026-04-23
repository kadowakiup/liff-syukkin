const LIFF_ID = "2009569390-mIdIYR0X"; 
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

// メインの処理（★ここに async がついている必要がある）
async function main() {
  try {
    // 1. LIFFの初期化
    await liff.init({ liffId: LIFF_ID });

    // LINE外ブラウザなどで未ログインの場合はログインを促す
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 2. ユーザーIDの取得
    updateStatus("ユーザー情報を取得中...");
    const profile = await liff.getProfile();
    const userId = profile.userId;

    // 3. 位置情報の取得
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

    // 4. 現在日時の取得（日本時間の YYYY-MM-DD HH:mm 形式に変換）
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
      location: `${longitude},${latitude}`, // ★「経度」を先にする！
      action: "clock_in"
    };

    // 5. GASへデータ送信（★CORS回避設定済）
    updateStatus("データを送信中...");
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain" // ★GASのCORSエラー回避のため text/plain
      },
      body: JSON.stringify(payload),
      redirect: "follow" // ★GASのリダイレクト仕様に対応
    });

    if (!response.ok) {
      throw new Error(`送信失敗: ステータスコード ${response.status}`);
    }

    // 6. 成功したらLIFFを閉じる
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

// ページの読み込みが完了したらメイン処理を実行
window.onload = function() {
  if (navigator.geolocation) {
    main();
  } else {
    showError("この端末では位置情報がサポートされていません。");
  }
};