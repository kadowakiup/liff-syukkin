// ▼ ここを書き換えてください ▼
    const LIFF_ID = "2009569390-mIdIYR0X"; 
    const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzEqLJDyl6t3N2pKcDnO0-w0uFTcO6x5tzQLN69-YsuSEWtEsMpXVwKx89592abTs7VdQ/exec"; // ←ここを変更！
    // ▲ ここまで ▲

    // ... (中略) ...

        // 5. GASへデータ送信
        updateStatus("データを送信中...");
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            // ★ポイント: GASに送る時は text/plain にするとCORSを回避できる
            "Content-Type": "text/plain" 
          },
          body: JSON.stringify(payload),
          redirect: "follow" // ★ポイント: GASの仕様対応
        });

        if (!response.ok) {
          throw new Error(`送信失敗: ステータスコード ${response.status}`);
        }