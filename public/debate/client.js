
const debateButton = document.getElementById("debateButton");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const characterID = document.getElementById("character")
const useLocalApi = document.getElementById("useLocalApi");
const loadingText = document.getElementById("loading");
const dotsText = document.getElementById("dots");
const debateFinish = document.getElementById("debateFinish");
const finishingText = document.getElementById("finishingText");
const finishing = document.getElementById("finishing")
let orderInt = 0;
let isFinish = false;

inputText.addEventListener("input", () => {
    if (inputText.value.trim() === "") debateButton.disabled = true;
    else debateButton.disabled = false;
});

debateButton.addEventListener("click", () => {
    askButtonClicked(inputText.value);
});

inputText.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
        askButtonClicked(inputText.value);
    }
});

debateFinish.addEventListener("click", () => {
    isFinish = true;
    finishingText.innerText = "今のターンで終了します";
    finishing.style.display = "inline-block";
});

async function askButtonClicked(input) {
    
    try{
        // ローディング表示
        loadingText.style.display = "inline-block";
        dotsText.style.display = "inline-block";
        loadingText.innerText = "考え中";
        
        // 終了ボタン有効化
        debateFinish.disabled = false;
        
        // response用変数
        let geminiText = null;
        let cohereText = null;
        
        // バックへPOSTメッセージを送る
        // POSTメッセージは質問文を送るのでstring型を指定する
        // 発言を分ける
        orderInt++;
        
        if (orderInt % 2 !== 0) {
            
            if (orderInt === 1) {
                input += "について議論して下さい。議論をしていく上で、同じ文章は会話内で繰り返さないでください。何か聞き返したり、反論したりと、常に進展を持たせる内容にしてください。"
            }
            
            const gemini = await fetch("../gemini", {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: input,
            });
            geminiText = await gemini.text();
            
            outputText.innerHTML += "<br><div class='geminiDebate'>" + geminiText + "</div>";

        } else {
            const cohere = await fetch("../cohere", {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                },
                body: input,
            });
            cohereText = await cohere.text();

            outputText.innerHTML += "<br><div class='cohereDebate'>" + cohereText + "</div>";

        }
        // 最下部に移動
        inputText.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // ローディング表示変更
        loadingText.innerText = "発声準備中";
        
        // アクセス先指定
        let endPointURL = null;
        if(useLocalApi.checked) {
            endPointURL = "../local/voicevox";
        } else {
            endPointURL = "../voicevox";
        }
        // 音声生成
        let bodyText = null;
        let speakerID = null;
        if (orderInt % 2 !== 0){
            bodyText = geminiText;
            speakerID = "3"
        } else {
            bodyText = cohereText;
            speakerID = characterID.value;
        }
        const voicevox = await fetch(endPointURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: bodyText,
                speaker: speakerID
            })
        });
        
        if (!voicevox.ok) {
            throw new Error("サーバーとの通信に失敗しました");
        }
        
        // 音声データをバイナリとして取得
        const audioBlob = await voicevox.blob();
        
        // 音声データを再生
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // 再呼び出し
        audio.addEventListener("ended", () => {  
            if (isFinish) {
                debateFinishProcess();
                return;
            } else if (orderInt % 2 !== 0) {
                askButtonClicked(geminiText);
            } else {
                askButtonClicked(cohereText);
            }
        });
        audio.play();

        // 使い終わったらURLを解放 メモリリーク防ぐ
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };

    } catch (error){
    console.error("エラー: ", error);
    
    } finally {
        // Loading表示を非表示にする
        loadingText.style.display = "none";
        dotsText.style.display = "none";
    }
}

function debateFinishProcess() {
    isFinish = false;
    orderInt = 0;
    finishingText.innerText = "";
    finishing.style.display = "none"
    debateFinish.disabled = true;
}