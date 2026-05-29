// const LIFF_ID = "2009827198-EiWGvF0N"; 
// const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec";
// const REGISTER_LIFF_URL = "https://liff.line.me/2009827198-qvnHhjxl"; 

// function updateStatus(text) {
//   document.getElementById("status-text").innerHTML = text; // brタグ（改行）を使えるようにinnerHTMLに変更
// }

// function showError(text, showRegisterBtn = false) {
//   document.getElementById("spinner").style.display = "none";
//   document.getElementById("status-text").innerText = "エラーが発生しました";
//   document.getElementById("error-message").innerText = text;
  
//   if (showRegisterBtn) {
//     document.getElementById("register-container").style.display = "block";
//   }
// }

// // ★ ページの読み込みが完了した時の処理（自動スタートに変更）
// window.onload = async function() {
//   try {
//     await liff.init({ liffId: LIFF_ID });

//     if (!liff.isLoggedIn()) {
//       liff.login();
//       return;
//     }

//     // 「登録画面へ進む」ボタンの処理
//     document.getElementById("register-btn").addEventListener("click", function() {
//       window.location.href = REGISTER_LIFF_URL;
//     });

//     // ★ ボタンクリックを待たずに、自動でメイン処理（確認→打刻）をスタート！
//     main();

//   } catch (error) {
//     showError("LIFFの読み込みに失敗しました。");
//     console.error(error);
//   }
// };

// // メインの処理
// async function main() {
//   try {
//     updateStatus("ユーザー情報を取得中...");
//     const profile = await liff.getProfile();
//     const userId = profile.userId;

//     // ▼ 打刻済みかどうかの確認フロー
//     updateStatus("打刻状態を確認中...");
//     const checkPayload = {
//       userId: userId,
//       action: "check"
//     };

//     const checkResponse = await fetch(WEBHOOK_URL, {
//       method: "POST",
//       headers: { "Content-Type": "text/plain" },
//       body: JSON.stringify(checkPayload),
//       redirect: "follow"
//     });

//     let checkResult;
//     try {
//       checkResult = await checkResponse.json();
//     } catch (e) {
//       throw new Error("確認処理で予期せぬエラーが発生しました。");
//     }

//     // 400（すでに打刻済み）だった場合
//     if (checkResult.status === 400) {
//       document.getElementById("spinner").style.display = "none";
//       updateStatus("すでに打刻しています。<br>退勤の場合は再度メニューから<br>退勤を押してください。");
//       document.getElementById("status-text").style.color = "#ff334b";
//       return; // ここでストップ
//     } else if (checkResult.status !== 200) {
//       throw new Error(`確認処理でエラーが発生しました。（コード: ${checkResult.status}）`);
//     }

//     // ▼ 200だった場合（本打刻に進む）
//     updateStatus("位置情報を取得中...");
//     const position = await new Promise((resolve, reject) => {
//       navigator.geolocation.getCurrentPosition(resolve, reject, {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 0
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

//     const payload = {
//       userId: userId,
//       timestamp: timestamp,
//       location: `${longitude},${latitude}`,
//       action: "clock_in" 
//     };

//     updateStatus("データを送信中...");
//     const response = await fetch(WEBHOOK_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "text/plain"
//       },
//       body: JSON.stringify(payload),
//       redirect: "follow"
//     });

//     const responseText = await response.text();

//     try {
//       const resultJson = JSON.parse(responseText);
//       if (resultJson.code !== 0 && resultJson.code !== undefined) {
//         showError("名前の登録が見つかりませんでした。「登録」から名前の登録を行ってください。", true);
//         return;
//       }
//     } catch (e) {
//       if (!response.ok || responseText.includes("Error")) {
//         throw new Error(`システムエラー: ${responseText}`);
//       }
//     }

//     // 成功したらLIFFを閉じる
//     document.getElementById("spinner").style.display = "none";
//     updateStatus("打刻完了！");
//     setTimeout(() => {
//       liff.closeWindow();
//     }, 500);

//   } catch (error) {
//     console.error("Error:", error);
//     if (error.code === 1) {
//       showError("位置情報の取得が許可されていません。スマホの設定からLINEへの位置情報アクセスを許可してください。");
//     } else {
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

    main();

  } catch (error) {
    showError("LIFFの読み込みに失敗しました。");
    console.error(error);
  }
};

async function main() {
  try {
    updateStatus("ユーザー情報を取得中...");
    const profile = await liff.getProfile();
    const userId = profile.userId;

    updateStatus("打刻状態を確認中...");
    const checkPayload = {
      userId: userId,
      action: "check"
    };

    const checkResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(checkPayload),
      redirect: "follow"
    });

    let checkResult;
    try {
      checkResult = await checkResponse.json();
    } catch (e) {
      throw new Error("確認処理で予期せぬエラーが発生しました。");
    }

    // ▼▼▼ ステータスコードごとの条件分岐 ▼▼▼

    if (checkResult.status === 400) {
      // 400: すでに打刻済み（ボタンなし）
      document.getElementById("spinner").style.display = "none";
      updateStatus("すでに打刻しています。<br>退勤の場合は再度メニューから<br>退勤を押してください。");
      document.getElementById("status-text").style.color = "#ff334b";
      return; 
    } 
    else if (checkResult.status === 403) {
      // 403: 未登録（登録画面へのボタンあり）
      showError("先に登録をしてください", "登録画面へ進む", REGISTER_LIFF_URL);
      return;
    } 
    else if (checkResult.status === 406) {
      // 406: シフト未追加（シフト追加画面へのボタンあり）
      showError("先にシフトを追加してください", "シフト追加画面へ進む", ADD_SHIFT_LIFF_URL);
      return;
    } 
    else if (checkResult.status !== 200) {
      throw new Error(`確認処理でエラーが発生しました。（コード: ${checkResult.status}）`);
    }

    // ▲▲▲ ここまで ▲▲▲

    updateStatus("位置情報を取得中...");
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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

    const payload = {
      userId: userId,
      timestamp: timestamp,
      location: `${longitude},${latitude}`,
      action: "clock_in" 
    };

    updateStatus("データを送信中...");
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const responseText = await response.text();

    try {
      const resultJson = JSON.parse(responseText);
      if (resultJson.code !== 0 && resultJson.code !== undefined) {
        // 本打刻時にエラーが起きた場合も汎用エラーとして処理
        showError("処理エラーが発生しました。（コード: " + resultJson.code + "）");
        return;
      }
    } catch (e) {
      if (!response.ok || responseText.includes("Error")) {
        throw new Error(`システムエラー: ${responseText}`);
      }
    }

    // 成功したらLIFFを閉じる
    document.getElementById("spinner").style.display = "none";
    updateStatus("打刻完了！");
    setTimeout(() => {
      liff.closeWindow();
    }, 500);

  } catch (error) {
    console.error("Error:", error);
    if (error.code === 1) {
      showError("位置情報の取得が許可されていません。スマホの設定からLINEへの位置情報アクセスを許可してください。");
    } else {
      showError(error.message || "予期せぬ通信エラーが発生しました。");
    }
  }
}