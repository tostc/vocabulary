var g_Vocabulary = null;
var g_Vocabularies = null;
var g_ComboElement = null;
var g_TimerElement = null;
var g_VocabularJSON = [];
var g_SelectedVocabulary = {};
var g_Combo = 0;
var g_Interval = null;
var g_Time = 0;
var g_SearchFor = "";
var g_Cursor = 0;

var g_TimerEnabled = false;
var g_TTSEnabled = false;
var g_ShowAlwaysRomaji = true;
var g_ChartJs = null;

const g_DB = new VocabularyDB();
const g_Date = formatDate(new Date());

const TIMER = 10;
var g_TTS = null;

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Initializes the game!
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initGame);
else
    initGame();

async function initGame() {
    g_Vocabulary = document.getElementById("vocabulary");
    g_Vocabularies = document.getElementById("vocabularies");
    g_ComboElement = document.getElementById("combo");
    g_TimerElement = document.querySelector('.timer-ring-circle')
    g_TTS = new TTS();
    g_TTS.loadVoices(() => {
        const ttsBox = document.getElementById("tts");
        const voices = document.getElementById("voices");
        ttsBox.addEventListener("change", ev => {
            g_TTSEnabled = !g_TTSEnabled;
            voices.disabled = !g_TTSEnabled;
    
            const display = g_ShowAlwaysRomaji ? "romaji" : "writing";
            g_SearchFor = "de";
            g_Vocabulary.innerHTML = "<div>" + _formatText(g_SelectedVocabulary, display, g_SearchFor) + "</div>";
    
            if(g_TTSEnabled)
                g_Vocabulary.style.cursor = "pointer";
            else
                g_Vocabulary.style.cursor = "default";

            ev.stopImmediatePropagation();
        });
        const ttsInfo = document.getElementById("tts-info");
    
        voices.addEventListener("change", async () => {
            g_TTS.selectedVoice = voices.value;
        });
    
        // Enables the option for text-to-speech
        if(g_TTS.hasJapanese()) {
            ttsInfo.style.display = "none";
            ttsBox.disabled = false;
    
            var i = 0;
            for (const voice of g_TTS.voices) {
                const option = document.createElement("option");
                option.textContent = voice.name;
                option.value = i;
                voices.appendChild(option);
                i++;
            }
        }
    });

    const settingsDialog = document.getElementById("settings-dialog");
    document.getElementById("settings").addEventListener("click", () => {
        if(settingsDialog.style.display.toLocaleLowerCase() == "none")
            settingsDialog.style.display = "block";
        else
            settingsDialog.style.display = "none";
    });

    const symbolTable = document.getElementById("symboltable");
    new Tab(symbolTable);

    document.getElementById("table").addEventListener("click", () => {
        if(symbolTable.style.display.toLocaleLowerCase() == "none")
            symbolTable.style.display = "block";
        else
            symbolTable.style.display = "none";
    });

    const statistics = document.getElementById("statisticsWindow");
    new Tab(statistics);

    await g_DB.open("vocabs");
    await g_DB.migrate();

    const categorySelect = document.getElementById("categories");
    const categories = await g_DB.getAllCategories();
    categories.sort((a, b) => a.de - b.de);
    for (const categorie of categories) {
        const option = document.createElement("option");
        option.value = categorie.id;
        option.innerHTML = categorie.de;
        categorySelect.appendChild(option);
    }

    categorySelect.addEventListener("change", async () => {
        if(categorySelect.value == "-1")
            g_VocabularJSON = await g_DB.getAllVocabs();
        else
            g_VocabularJSON = await g_DB.getVocabsByCategory(+categorySelect.value);

        _shuffleArray(g_VocabularJSON);
        g_Cursor = 0;
        _startRound();
    });

    document.getElementById("statistics").addEventListener("click", async () => {
        if(statistics.style.display.toLocaleLowerCase() == "none") {
            statistics.style.display = "block";

            await _buildCategoryStatisticsTable(categorySelect);
            await _buildVocabStatisticsTable();

            const diagramData = await g_DB.generateDiagramStatistics();
            const labels = [];
            const rightAnswers = [];
            const wrongAnswers = [];

            for (const date in diagramData) {
                labels.push(date);
                rightAnswers.push(diagramData[date].successCount);
                wrongAnswers.push(-diagramData[date].failedCount);
            }

            console.log(wrongAnswers);

            if(g_ChartJs) {
                g_ChartJs.destroy();
                g_ChartJs = null;
            }

            const ctx = document.getElementById('development').getContext('2d');
            g_ChartJs = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [
                    {
                      label: 'Right answers',
                      data: rightAnswers,
                      backgroundColor: 'green',
                    },
                    {
                      label: 'Wrong answers',
                      data: wrongAnswers,
                      backgroundColor: 'red',
                    }
                  ]
                },
                options: {
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }
            });
        }
        else
            statistics.style.display = "none";
    });

    document.getElementById("vocabulary").addEventListener("click", () => {
        if(g_TTSEnabled) 
            g_TTS.speak(g_SelectedVocabulary["writing"]);
    });

    document.getElementById("timer").addEventListener("change", ev => {
        g_TimerEnabled = !g_TimerEnabled;
        if(g_TimerEnabled)
            _startTimer();
        else {
            _stopTimer();
        }

        ev.stopImmediatePropagation();
    });

    document.getElementById("romaji").addEventListener("change", ev => {
        g_ShowAlwaysRomaji = !g_ShowAlwaysRomaji;

        const display = g_ShowAlwaysRomaji ? "romaji" : "writing";
        g_SearchFor = "de";
        g_Vocabulary.innerHTML = "<div>" + _formatText(g_SelectedVocabulary, display, g_SearchFor) + "</div>";

        ev.stopImmediatePropagation();
    });

    g_ComboElement.style.display = "none";

    g_VocabularJSON = await g_DB.getAllVocabs();
    _shuffleArray(g_VocabularJSON);
    g_Cursor = 0;

    _startRound();
}

function _formatText(vocabulary, display, searchfor) {
    if(g_ShowAlwaysRomaji && (((display == "romaji") || (display == "writing")) && (searchfor != "romaji" && searchfor != "writing"))) {
        var audioButton = "";
        if(g_TTSEnabled)
            audioButton = '<span class="play-tts"></span>';
        
        return `${audioButton}<div style="text-align:center">${vocabulary["romaji"]}</div><div style="text-align:center">${vocabulary["writing"]}</div>`;
    }

    return vocabulary[display];
}

function _startRound() {
    _stopTimer();
    
    var random = g_Cursor;
    g_SelectedVocabulary = g_VocabularJSON[g_Cursor];
    g_Cursor = (g_Cursor + 1) % g_VocabularJSON.length;

    const display = g_ShowAlwaysRomaji ? "romaji" : "writing";
    g_SearchFor = "de";

    g_Vocabulary.innerHTML = "<div>" + _formatText(g_SelectedVocabulary, display, g_SearchFor) + "</div>";
    g_Vocabularies.innerHTML = "";

    g_Vocabularies.appendChild(_createSpan(g_SelectedVocabulary, display));
    const randomBuffer = [random];

    while((g_Vocabularies.children.length < 6) && (randomBuffer.length !== g_VocabularJSON.length)) {
        var random2 = Math.floor(Math.random() * g_VocabularJSON.length);
        if(randomBuffer.find(x => x == random2) == undefined) {
            randomBuffer.push(random2);
            g_Vocabularies.appendChild(_createSpan(g_VocabularJSON[random2], display));
        }
    }

    _shuffleChildren(g_Vocabularies);

    if(g_TTSEnabled)
        g_TTS.speak(g_SelectedVocabulary["writing"]);

    if(g_TimerEnabled)
        _startTimer();
}

function _startTimer() {
    g_Time = TIMER;
    setProgress(Math.floor(g_Time / TIMER * 100));

    g_Interval = setInterval(() => {
        g_Time--;
        if(g_Time <= 0) {
            _stopTimer();

            var childrenArray = Array.from(g_Vocabularies.children);
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                element.onclick = null;
                if(element.dataset["text"] == g_SelectedVocabulary[g_SearchFor])
                    element.classList.add("green-gradiant");
                    // element.style.backgroundColor = "green";
            }

            g_ComboElement.style.display = "none";
            g_Combo = 0;

            setTimeout(() => _startRound(), 1500);
        }

        setProgress(Math.floor(g_Time / TIMER * 100));
    }, 1000);
}

function _stopTimer() {
    if(g_Interval) {
        clearInterval(g_Interval);
        g_Interval = null;
    }

    g_Time = TIMER;
    setProgress(Math.floor(g_Time / TIMER * 100));
}

function _createSpan(vocabulary, display) {
    const span = document.createElement("span");
    // span.classList.add("red-gradiant");
    var wrongAnswer = false;
    span.dataset["text"] = vocabulary[g_SearchFor];
    span.innerHTML = _formatText(vocabulary, g_SearchFor, display);
    span.onclick = () => {
        _stopTimer();

        var childrenArray = Array.from(g_Vocabularies.children);
        for (let i = 0; i < childrenArray.length; i++) {
            const element = childrenArray[i];
            element.onclick = null;
        }

        if(g_SelectedVocabulary[g_SearchFor] == span.dataset["text"]) {
            g_Combo++;
            span.classList.add("green-gradiant");

            g_DB.getStatistic(g_Date, g_SelectedVocabulary.id).then(
                statistic => {
                    if(!statistic) {
                        statistic = {
                            date: g_Date,
                            vocabId: g_SelectedVocabulary.id,
                            successCount: 0,
                            failedCount: 0,
                            categoryId: g_SelectedVocabulary.categoryId
                        }
                    }
                    statistic.successCount++;
                    g_DB.patchStatistic(statistic);
                }
            )
        }
        else {
            g_DB.getStatistic(g_Date, g_SelectedVocabulary.id).then(
                statistic => {
                    if(!statistic) {
                        statistic = {
                            date: g_Date,
                            vocabId: g_SelectedVocabulary.id,
                            successCount: 0,
                            failedCount: 0,
                            categoryId: g_SelectedVocabulary.categoryId
                        }
                    }
                    statistic.failedCount++;
                    g_DB.patchStatistic(statistic);
                }
            )

            span.classList.add("red-gradiant");
            for (let i = 0; i < childrenArray.length; i++) {
                const element = childrenArray[i];
                if(element.dataset["text"] === g_SelectedVocabulary[g_SearchFor]) {
                    element.classList.add("green-gradiant");
                    break;
                }
            }

            wrongAnswer = true;
            g_Combo = 0;
        }

        if(g_Combo > 0) {
            g_ComboElement.innerText = "x" + g_Combo;
            g_ComboElement.style.display = "flex";

            g_ComboElement.style.transform = "scale(1.1) rotate(12deg)";

            setTimeout(() => {
                g_ComboElement.style.transform = "rotate(12deg)";
            }, 200)
        } else {
            g_ComboElement.style.display = "none";
        }

        if(wrongAnswer)
            setTimeout(() => _startRound(), 1500);
        else
            setTimeout(() => _startRound(), 250);
    };

    return span;
}

function _shuffleChildren(parent) {
    var childrenArray = Array.from(parent.children);
    
    // Fisher-Yates (Knuth) shuffle algorithm
    for (var i = childrenArray.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [childrenArray[i], childrenArray[j]] = [childrenArray[j], childrenArray[i]];
    }

    childrenArray.forEach(child => parent.appendChild(child));
}

function _shuffleArray(array) {   
    // Fisher-Yates (Knuth) shuffle algorithm
    for (var i = array.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function setProgress(percent) {
    const radius = g_TimerElement.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
  
    g_TimerElement.style.strokeDasharray = `${circumference} ${circumference}`;
    g_TimerElement.style.strokeDashoffset = circumference;
  
    const offset = circumference - (percent / 100) * circumference;
    g_TimerElement.style.strokeDashoffset = offset;
}

async function _buildCategoryStatisticsTable(categorySelect) {
    const tableData = await g_DB.generateCategoryStatistics();
    const tableList = [];
    for (const categoryId in tableData) {
        tableList.push(
            {
                categoryId: categoryId,
                categoryName: (await g_DB.getCategory(+categoryId)).de,
                successCount: tableData[categoryId].successCount,
                failedCount: tableData[categoryId].failedCount,
                diff: tableData[categoryId].successCount - tableData[categoryId].failedCount
            }
        )
    }
    tableList.sort((a, b) => a.diff - b.diff);
    const tableBody = document.querySelector("#category-stat").querySelector("tbody");
    for (const element of tableList) {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${element.categoryName}</td><td>${element.successCount}</td><td>${element.failedCount}</td>`;
        row.onclick = () => {
            categorySelect.value = element.categoryId;
            categorySelect.dispatchEvent(new Event("change"));
        };

        tableBody.appendChild(row);
    }
}

async function _buildVocabStatisticsTable() {
    const tableData = await g_DB.generateVocabStatistics();
    const tableList = [];
    for (const vocabId in tableData) {
        const vocab = await g_DB.getVocab(+vocabId);
        tableList.push(
            {
                vocab: (vocab?.romaji || "") + `(${(vocab?.writing || "")})`,
                translation: vocab?.de || "",
                successCount: tableData[vocabId].successCount,
                failedCount: tableData[vocabId].failedCount,
                diff: tableData[vocabId].successCount - tableData[vocabId].failedCount
            }
        )
    }
    tableList.sort((a, b) => a.diff - b.diff);
    const tableBody = document.querySelector("#vocab-stat").querySelector("tbody");
    for (const element of tableList) {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${element.vocab}</td><td>${element.translation}</td><td>${element.successCount}</td><td>${element.failedCount}</td>`;
        tableBody.appendChild(row);
    }
}