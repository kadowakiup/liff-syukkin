const LIFF_ID = "2009827198-EiWGvF0N"; 
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec"; 

// 誘導先のLIFF URLを定義
const REGISTER_LIFF_URL = "https://liff.line.me/2009827198-qvnHhjxl"; // 登録用
const ADD_SHIFT_LIFF_URL = "https://liff.line.me/2009827198-LyTrVRFv"; // シフト追加用

function updateStatus(text) {
  document.getElementById("status-text").innerHTML = text; 
}

// ★ エラー内容に合わせてボタンの文字と遷移先を変える関数
function showError(text, btnText = null, redirectUrl = null) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("status-text").innerText = "エラーが発生しました";
  document.getElementById("error-message").innerText = text;
  
  const actionContainer = document.getElementById("action-container");
  const actionBtn = document.getElementById("action-btn");

  // ボタンの文字とURLが指定されていたら表示する
  if (btnText && redirectUrl) {
    actionBtn.innerText = btnText;
    actionBtn.onclick = function() {
      window.location.href = redirectUrl;
    };
    actionContainer.style.display = "block";
  } else {
    actionContainer.style.display = "none";
  }
}

window.onload = async function() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    if (window.confirm("本当に出勤しますか？\n打刻できているかの確認は社員へ直接聞いてください。")) {
      main();
    } else {
      // 「キャンセル」が押された場合はそのまま閉じる
      updateStatus("キャンセルしました");
      document.getElementById("spinner").style.display = "none";
      setTimeout(() => { liff.closeWindow(); }, 2000);
    }

  } catch (error) {
    // error.message を追加して、具体的なエラー内容を画面に出す
    showError("LIFFの読み込みに失敗しました。\n詳細: " + (error.message || error));
    console.error(error);
  }
};

async function main() {
  try {
    updateStatus("ユーザー情報を取得中...");
    const profile = await liff.getProfile();
    const userId = profile.userId;

    // ==========================================
    // 1. 打刻状態の確認処理 (GETメソッド)
    // ==========================================
    updateStatus("打刻状態を確認中...<br>このままお待ちください");
    const checkParams = new URLSearchParams({
      userId: userId,
      action: "check"
    });

    const checkController = new AbortController();
    // ★修正1：GASの処理待ちを考慮して、タイマーを10秒(10000)から20秒(20000)に延長
    const checkTimeoutId = setTimeout(() => checkController.abort(), 20000);
    let checkResponse;

    try {
      checkResponse = await fetch(`${WEBHOOK_URL}?${checkParams.toString()}`, {
        method: "GET",
        redirect: "follow",
        signal: checkController.signal
      });
      clearTimeout(checkTimeoutId); // 成功したらタイマー解除
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error("確認処理の通信がタイムアウトしました。\n電波の良い環境で再度お試しください。");
      } else {
        throw e;
      }
    }

    const checkResponseText = await checkResponse.text();
    let checkResult;
    try {
      checkResult = JSON.parse(checkResponseText);
    } catch (e) {
      if (checkResponseText.includes("現在、ファイルを開くことができません") || checkResponseText.includes("<html")) {
        throw new Error("Googleサーバーで一時的な通信エラーが発生しました。\nLINEアプリを一度完全に閉じて（タスクキル）、少し時間をおいてから再度お試しください。");
      } else {
        throw new Error("確認処理で通信エラーが発生しました。\n電波の良い場所で再度お試しいただくか、念のためLark上で直接打刻状況を確認してください。");
      }
    }

    // ★修正2：AnycrossがBodyの中にステータス(400など)を隠している場合を取り出す
    let currentStatus = checkResult.status;
    if (currentStatus === 200 && checkResult.body) {
      try {
        const bodyJson = JSON.parse(checkResult.body);
        if (bodyJson.status) {
          currentStatus = bodyJson.status;
        }
      } catch (err) {}
    }

    // ▼▼▼ ステータスコードごとの条件分岐 (checkResult.statusではなくcurrentStatusを使う) ▼▼▼
    if (currentStatus === 400) {
      document.getElementById("spinner").style.display = "none";
      updateStatus("すでに打刻しています。<br>退勤の場合は再度メニューから<br>退勤を押してください。");
      document.getElementById("status-text").style.color = "#ff334b";
      return; 
    } 
    else if (currentStatus === 403) {
      showError("先に登録をしてください", "登録画面へ進む", REGISTER_LIFF_URL);
      return;
    } 
    else if (currentStatus === 406) {
      showError("先にシフトを追加してください", "シフト追加画面へ進む", ADD_SHIFT_LIFF_URL);
      return;
    } 
    else if (currentStatus !== 200) {
      throw new Error(`確認処理エラー（コード: ${currentStatus}）\n詳細: ${checkResult.body}`);
    }

    // ==========================================
    // 2. 位置情報の取得
    // ==========================================
    updateStatus("位置情報を取得中...<br>お待ちください");
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, 
        timeout: 30000,            
        maximumAge: 60000          
      });
    });

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

    // ==========================================
    // 3. 本打刻データの送信 (GETメソッド)
    // ==========================================
    updateStatus("データを送信中...<br>打刻が完了するまでお待ちください");
    const submitParams = new URLSearchParams({
      userId: userId,
      timestamp: timestamp,
      location: `${longitude},${latitude}`,
      action: "clock_in" 
    });

    const submitController = new AbortController();
    const submitTimeoutId = setTimeout(() => submitController.abort(), 20000);
    let response;

    try {
      response = await fetch(`${WEBHOOK_URL}?${submitParams.toString()}`, {
        method: "GET", // ★POSTからGETに変更
        redirect: "follow",
        signal: submitController.signal
      });
      clearTimeout(submitTimeoutId); // 成功したらタイマー解除
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error("打刻の通信がタイムアウトしました。\n電波の良い環境で再度お試しください。");
      } else {
        throw e;
      }
    }

    const responseText = await response.text();

    try {
      const resultJson = JSON.parse(responseText);
      if (resultJson.code !== 0 && resultJson.code !== undefined) {
        showError("処理エラーが発生しました。（コード: " + resultJson.code + "）");
        return;
      }
    } catch (e) {
      if (responseText.includes("現在、ファイルを開くことができません") || responseText.includes("<html")) {
        throw new Error("Googleサーバーで一時的な通信エラーが発生しました。\nLINEアプリを一度完全に閉じて（タスクキル）、少し時間をおいてから再度お試しください。");
      } else {
        throw new Error("システムエラーが発生しました。\n電波の良い場所で再度お試しください。");
      }
    }

    // 打刻完了時の処理
    document.getElementById("spinner").style.display = "none";
    updateStatus("打刻完了！<br>画面左上の「×」ボタンで閉じてください。");

  } catch (error) {
    console.error("Error:", error);
    
    if (error.code === 1) {
      showError("位置情報の取得が許可されていません。スマホの設定からLINEへの位置情報アクセスを許可してください。");
    } else if (error.code === 3) {
      showError("位置情報の取得に時間がかかりすぎました。\n建物の奥にいるとGPSが届きません。窓際に移動するか、Wi-Fiをオンにしてから再度お試しください。");
    } else if (error.code === 2) {
      showError("現在地を特定できませんでした。通信環境の良い場所で再度お試しください。");
    } 
    // ▼ 通信が遮断された場合（念のため残しておく）
    else if (error.message === "Load failed" || (error.message && error.message.includes("Load failed"))) {
      showError("スマホのセキュリティ設定により通信が切断されましたが、打刻自体は完了している可能性が高いです。\n念のため、Lark等で退勤できているか確認してください。");
    } 
    else {
      showError(error.message || "予期せぬ通信エラーが発生しました。");
    }
  }
}