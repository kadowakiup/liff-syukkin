// const LIFF_ID = "2009827198-EiWGvF0N"; 
// const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec"; 

// // 誘導先のLIFF URLを定義
// const REGISTER_LIFF_URL = "https://liff.line.me/2009827198-qvnHhjxl"; // 登録用
// const ADD_SHIFT_LIFF_URL = "https://liff.line.me/2009827198-LyTrVRFv"; // シフト追加用

// function updateStatus(text) {
//   document.getElementById("status-text").innerHTML = text; 
// }

// // ★ エラー内容に合わせてボタンの文字と遷移先を変える関数
// function showError(text, btnText = null, redirectUrl = null) {
//   document.getElementById("spinner").style.display = "none";
//   document.getElementById("status-text").innerText = "エラーが発生しました";
//   document.getElementById("error-message").innerText = text;
  
//   const actionContainer = document.getElementById("action-container");
//   const actionBtn = document.getElementById("action-btn");

//   // ボタンの文字とURLが指定されていたら表示する
//   if (btnText && redirectUrl) {
//     actionBtn.innerText = btnText;
//     actionBtn.onclick = function() {
//       window.location.href = redirectUrl;
//     };
//     actionContainer.style.display = "block";
//   } else {
//     actionContainer.style.display = "none";
//   }
// }

// window.onload = async function() {
//   try {
//     await liff.init({ liffId: LIFF_ID });

//     if (!liff.isLoggedIn()) {
//       liff.login();
//       return;
//     }

//     if (window.confirm("本当に出勤しますか？\n打刻できているかの確認は社員へ直接聞いてください。")) {
//       main();
//     } else {
//       // 「キャンセル」が押された場合はそのまま閉じる
//       updateStatus("キャンセルしました");
//       document.getElementById("spinner").style.display = "none";
//       setTimeout(() => { liff.closeWindow(); }, 2000);
//     }

//   } catch (error) {
//     // error.message を追加して、具体的なエラー内容を画面に出す
//     showError("LIFFの読み込みに失敗しました。\n詳細: " + (error.message || error));
//     console.error(error);
//   }
// };

// async function main() {
//   try {
//     updateStatus("ユーザー情報を取得中...");
//     const profile = await liff.getProfile();
//     const userId = profile.userId;

//     // ==========================================
//     // 1. 打刻状態の確認処理 (GETメソッド)
//     // ==========================================
//     updateStatus("打刻状態を確認中...<br>このままお待ちください");
//     const checkParams = new URLSearchParams({
//       userId: userId,
//       action: "check",
//       t: Date.now() // ★追加：iPhoneが古い通信結果を使い回さない（キャッシュクリア）ための呪文
//     });

//     const checkController = new AbortController();
//     // ★変更：20000（20秒）から 40000（40秒）に延長して気長に待つ
//     const checkTimeoutId = setTimeout(() => checkController.abort(), 40000);
//     let checkResponse;

//     try {
//       checkResponse = await fetch(`${WEBHOOK_URL}?${checkParams.toString()}`, {
//         method: "GET",
//         redirect: "follow",
//         signal: checkController.signal
//       });
//       clearTimeout(checkTimeoutId);
//     } catch (e) {
//       if (e.name === 'AbortError') {
//         throw new Error("確認処理の通信がタイムアウトしました。\n電波の良い環境で再度お試しください。");
//       } else {
//         throw e;
//       }
//     }

//     const checkResponseText = await checkResponse.text();
//     let checkResult;
//     try {
//       checkResult = JSON.parse(checkResponseText);
//     } catch (e) {
//       if (checkResponseText.includes("現在、ファイルを開くことができません") || checkResponseText.includes("<html")) {
//         throw new Error("Googleサーバーで一時的な通信エラーが発生しました。\nLINEアプリを一度完全に閉じて（タスクキル）、少し時間をおいてから再度お試しください。");
//       } else {
//         throw new Error("確認処理で通信エラーが発生しました。\n電波の良い場所で再度お試しいただくか、念のためLark上で直接打刻状況を確認してください。");
//       }
//     }

//     // ★修正2：AnycrossがBodyの中にステータス(400など)を隠している場合を取り出す
//     let currentStatus = checkResult.status;
//     if (currentStatus === 200 && checkResult.body) {
//       try {
//         const bodyJson = JSON.parse(checkResult.body);
//         if (bodyJson.status) {
//           currentStatus = bodyJson.status;
//         }
//       } catch (err) {}
//     }

//     // ▼▼▼ ステータスコードごとの条件分岐 (checkResult.statusではなくcurrentStatusを使う) ▼▼▼
//     if (currentStatus === 400) {
//       document.getElementById("spinner").style.display = "none";
//       updateStatus("すでに打刻しています。<br>退勤の場合は再度メニューから<br>退勤を押してください。");
//       document.getElementById("status-text").style.color = "#ff334b";
//       return; 
//     } 
//     else if (currentStatus === 403) {
//       showError("先に登録をしてください", "登録画面へ進む", REGISTER_LIFF_URL);
//       return;
//     } 
//     else if (currentStatus === 406) {
//       showError("先にシフトを追加してください", "シフト追加画面へ進む", ADD_SHIFT_LIFF_URL);
//       return;
//     } 
//     else if (currentStatus !== 200) {
//       throw new Error(`確認処理エラー（コード: ${currentStatus}）\n詳細: ${checkResult.body}`);
//     }

//     // ==========================================
//     // 2. 位置情報の取得
//     // ==========================================
//     updateStatus("位置情報を取得中...<br>お待ちください");
//     const position = await new Promise((resolve, reject) => {
//       navigator.geolocation.getCurrentPosition(resolve, reject, {
//         enableHighAccuracy: false, 
//         timeout: 30000,            
//         maximumAge: 60000          
//       });
//     });

//     const latitude = position.coords.latitude;
//     const longitude = position.coords.longitude;

//     const now = new Date();
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
    
//     const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

//     // ==========================================
//     // 3. 本打刻データの送信 (GETメソッド)
//     // ==========================================
//     updateStatus("データを送信中...<br>打刻が完了するまでお待ちください");
//     const submitParams = new URLSearchParams({
//       userId: userId,
//       timestamp: timestamp,
//       location: `${longitude},${latitude}`,
//       action: "clock_in",
//       t: Date.now() // ★追加：キャッシュクリア
//     });

//     const submitController = new AbortController();
//     // ★変更：20000（20秒）から 40000（40秒）に延長
//     const submitTimeoutId = setTimeout(() => submitController.abort(), 40000); 
//     let response;

//     try {
//       response = await fetch(`${WEBHOOK_URL}?${submitParams.toString()}`, {
//         method: "GET",
//         redirect: "follow",
//         signal: submitController.signal
//       });
//       clearTimeout(submitTimeoutId);
//     } catch (e) {
//       if (e.name === 'AbortError') {
//         throw new Error("打刻の通信がタイムアウトしました。\n電波の良い環境で再度お試しください。");
//       } else {
//         throw e;
//       }
//     }

//     const responseText = await response.text();

//     try {
//       const resultJson = JSON.parse(responseText);
//       // ★ "status: 200" 以外（かつデータが存在する）ならエラーとする
//       if (resultJson.status !== 200 && resultJson.status !== undefined) {
//         showError("処理エラーが発生しました。（ステータス: " + resultJson.status + "）");
//         return;
//       }
//     } catch (e) {
//       if (responseText.includes("現在、ファイルを開くことができません") || responseText.includes("<html")) {
//         throw new Error("Googleサーバーで一時的な通信エラーが発生しました。\nLINEアプリを一度完全に閉じて（タスクキル）、少し時間をおいてから再度お試しください。");
//       } else {
//         throw new Error("システムエラーが発生しました。\n電波の良い場所で再度お試しください。");
//       }
//     }

//     // 打刻完了時の処理
//     document.getElementById("spinner").style.display = "none";
//     updateStatus("打刻完了！<br>画面左上の「×」ボタンで閉じてください。");

//   } catch (error) {
//     console.error("Error:", error);
    
//     if (error.code === 1) {
//       showError("位置情報の取得が許可されていません。スマホの設定からLINEへの位置情報アクセスを許可してください。");
//     } else if (error.code === 3) {
//       showError("位置情報の取得に時間がかかりすぎました。\n建物の奥にいるとGPSが届きません。窓際に移動するか、Wi-Fiをオンにしてから再度お試しください。");
//     } else if (error.code === 2) {
//       showError("現在地を特定できませんでした。通信環境の良い場所で再度お試しください。");
//     } 
//     // ▼ 通信が遮断された場合（念のため残しておく）
//     else if (error.message === "Load failed" || (error.message && error.message.includes("Load failed"))) {
//       showError("スマホのセキュリティ設定により通信が切断されましたが、打刻自体は完了している可能性が高いです。\n念のため、Lark等で退勤できているか確認してください。");
//     } 
//     else {
//       showError(error.message || "予期せぬ通信エラーが発生しました。");
//     }
//   }
// }








const LIFF_ID = "2009827198-EiWGvF0N"; 
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec"; 

// 誘導先のLIFF URLを定義
const REGISTER_LIFF_URL = "https://liff.line.me/2009827198-qvnHhjxl"; // 登録用
const ADD_SHIFT_LIFF_URL = "https://liff.line.me/2009827198-LyTrVRFv"; // シフト追加用

function updateStatus(text) {
  document.getElementById("status-text").innerHTML = text; 
}

function showError(text, btnText = null, redirectUrl = null) {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("status-text").innerText = "エラーが発生しました";
  document.getElementById("error-message").innerText = text;
  
  const actionContainer = document.getElementById("action-container");
  const actionBtn = document.getElementById("action-btn");

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

// ==========================================
// ★新規追加：自動リトライ機能（不死鳥モード）
// ==========================================
async function fetchWithRetry(url, params, maxRetries, statusTextPrefix) {
  for (let i = 0; i < maxRetries; i++) {
    // 毎回キャッシュクリア用の時間を更新する
    params.set('t', Date.now()); 
    const fetchUrl = `${url}?${params.toString()}`;
    
    // UIの更新（2回目以降は再試行中であることを画面に表示）
    if (i > 0) {
      updateStatus(`${statusTextPrefix}<br><span style="font-size:0.85em; color:#ff9900;">(混雑を検知... 再接続中 ${i+1}/${maxRetries})</span>`);
    } else {
      updateStatus(`${statusTextPrefix}<br>このままお待ちください`);
    }

    const controller = new AbortController();
    // 1回の通信につき15秒待機する
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
      const response = await fetch(fetchUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseText = await response.text();
      
      // Googleのサーバー落ち（HTMLエラー）を検知した場合は意図的にエラーを投げてリトライさせる
      if (responseText.includes("現在、ファイルを開くことができません") || responseText.includes("<html")) {
        throw new Error("GoogleHTML_Error");
      }

      // JSONに変換できたら成功として返す
      const resultJson = JSON.parse(responseText);
      return resultJson; 

    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`通信アタック ${i + 1}回目 失敗:`, error);
      
      // 最大回数（4回）やってもダメだった場合のみ、最終的なエラーを画面に出す
      if (i === maxRetries - 1) {
        if (error.name === 'AbortError') {
          throw new Error("アクセスが集中し、通信がタイムアウトしました。");
        } else if (error.message === "GoogleHTML_Error" || error instanceof SyntaxError) {
          throw new Error("システムが大変混み合っています。");
        } else {
          throw new Error("予期せぬ通信エラーが発生しました。");
        }
      }
      
      // 失敗した場合、Googleサーバーの機嫌が直るまで1.5秒待ってから次へ
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
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
      updateStatus("キャンセルしました");
      document.getElementById("spinner").style.display = "none";
      setTimeout(() => { liff.closeWindow(); }, 2000);
    }

  } catch (error) {
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
    // 1. 打刻状態の確認処理 (リトライ機能付き)
    // ==========================================
    const checkParams = new URLSearchParams({
      userId: userId,
      action: "check"
    });

    let checkResult;
    try {
      // 最大4回アタックする
      checkResult = await fetchWithRetry(WEBHOOK_URL, checkParams, 4, "打刻状態を確認中...");
    } catch (e) {
      throw new Error(`${e.message}\n少し時間をおいてから再度お試しいただくか、Lark上で直接確認してください。`);
    }

    // AnycrossがBodyの中にステータスを隠している場合を取り出す
    let currentStatus = checkResult.status;
    if (currentStatus === 200 && checkResult.body) {
      try {
        const bodyJson = JSON.parse(checkResult.body);
        if (bodyJson.status) {
          currentStatus = bodyJson.status;
        }
      } catch (err) {}
    }

    // ▼▼▼ ステータスコードごとの条件分岐 ▼▼▼
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
    // 3. 本打刻データの送信 (リトライ機能付き)
    // ==========================================
    const submitParams = new URLSearchParams({
      userId: userId,
      timestamp: timestamp,
      location: `${longitude},${latitude}`,
      action: "clock_in" 
    });

    let resultJson;
    try {
      // 最大4回アタックする
      resultJson = await fetchWithRetry(WEBHOOK_URL, submitParams, 4, "データを送信中...");
    } catch (e) {
      throw new Error(`${e.message}\n電波の良い環境で再度お試しいただくか、打刻できているか社員に確認してください。`);
    }

    // "status: 200" 以外ならエラー
    if (resultJson.status !== 200 && resultJson.status !== undefined) {
      showError("処理エラーが発生しました。（ステータス: " + resultJson.status + "）");
      return;
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
    } else {
      showError(error.message || "予期せぬ通信エラーが発生しました。");
    }
  }
}